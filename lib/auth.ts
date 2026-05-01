import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const DATA_DIR   = join(process.cwd(), ".aria-data");
const USERS_FILE = join(DATA_DIR, "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "aria-secret-key-change-in-production";

export interface AuthUser {
  id:           string;
  name:         string;
  email:        string;
  passwordHash: string;
  role:         string;
  industry:     string;
  verified:     boolean;
  otpCode?:     string;
  otpExpiry?:   number;
  createdAt:    string;
  lastLogin?:   string;
  preferences: {
    defaultPersonality: string;
    defaultModel:       string;
    enabledTools:       string[];
  };
}

export interface JWTPayload {
  userId:   string;
  email:    string;
  name:     string;
  verified: boolean;
  iat?:     number;
  exp?:     number;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers(): Map<string, AuthUser> {
  try {
    ensureDataDir();
    if (!existsSync(USERS_FILE)) return new Map();
    const raw = readFileSync(USERS_FILE, "utf-8");
    const obj = JSON.parse(raw) as Record<string, AuthUser>;
    return new Map(Object.entries(obj));
  } catch { return new Map(); }
}

function saveUsers(users: Map<string, AuthUser>) {
  try {
    ensureDataDir();
    const obj: Record<string, AuthUser> = {};
    for (const [k, v] of users) obj[k] = v;
    writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) { console.error("[Auth] Failed to save users:", err); }
}

const users = loadUsers();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function signJWT(payload: Omit<JWTPayload, "iat"|"exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJWT(token: string): JWTPayload | null {
  try { return jwt.verify(token, JWT_SECRET) as JWTPayload; }
  catch { return null; }
}

export async function registerUser(data: {
  name: string; email: string; password: string; role: string; industry: string;
}): Promise<{ user: AuthUser | null; error?: string }> {
  const email = data.email.toLowerCase().trim();
  if (getUserByEmail(email)) return { user: null, error: "An account with this email already exists." };
  if (data.password.length < 8) return { user: null, error: "Password must be at least 8 characters." };
  const passwordHash = await bcrypt.hash(data.password, 12);
  const otp          = generateOTP();
  const otpExpiry    = Date.now() + 10 * 60 * 1000;
  const user: AuthUser = {
    id: generateId(), name: data.name.trim(), email, passwordHash,
    role: data.role, industry: data.industry,
    verified: false, otpCode: otp, otpExpiry,
    createdAt: new Date().toISOString(),
    preferences: {
      defaultPersonality: "balanced", defaultModel: "gpt-4o",
      enabledTools: ["web_search","competitor_analysis","market_sizing","trend_analysis","financial_data","swot_analysis"],
    },
  };
  users.set(user.id, user);
  saveUsers(users);
  return { user };
}

export async function loginUser(data: {
  email: string; password: string;
}): Promise<{ user: AuthUser | null; token?: string; error?: string }> {
  const email = data.email.toLowerCase().trim();
  const user  = getUserByEmail(email);
  if (!user)          return { user: null, error: "No account found with this email." };
  if (!user.verified) return { user: null, error: "Please verify your email before signing in." };
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) return { user: null, error: "Incorrect password." };
  user.lastLogin = new Date().toISOString();
  saveUsers(users);
  const token = signJWT({ userId: user.id, email: user.email, name: user.name, verified: user.verified });
  return { user, token };
}

export function verifyOTP(email: string, otp: string): { user: AuthUser | null; token?: string; error?: string } {
  const user = getUserByEmail(email.toLowerCase().trim());
  if (!user)                            return { user: null, error: "Account not found." };
  if (user.verified)                    return { user: null, error: "Account already verified." };
  if (!user.otpCode || !user.otpExpiry) return { user: null, error: "No OTP found. Please register again." };
  if (Date.now() > user.otpExpiry)      return { user: null, error: "OTP expired. Please request a new one." };
  if (user.otpCode !== otp.trim())      return { user: null, error: "Incorrect verification code." };
  user.verified  = true;
  user.otpCode   = undefined;
  user.otpExpiry = undefined;
  saveUsers(users);
  const token = signJWT({ userId: user.id, email: user.email, name: user.name, verified: true });
  return { user, token };
}

export function resendOTP(email: string): { user: AuthUser | null; error?: string } {
  const user = getUserByEmail(email.toLowerCase().trim());
  if (!user)         return { user: null, error: "Account not found." };
  if (user.verified) return { user: null, error: "Account already verified." };
  user.otpCode   = generateOTP();
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  saveUsers(users);
  return { user };
}

export function getUserByEmail(email: string): AuthUser | null {
  for (const user of users.values()) {
    if (user.email === email.toLowerCase().trim()) return user;
  }
  return null;
}

export function getUserById(id: string): AuthUser | null {
  return users.get(id) || null;
}

// ── Send OTP — tries Resend first, falls back to Gmail, logs to console ───────
export async function sendOTPEmail(user: AuthUser): Promise<{ sent: boolean; error?: string }> {
  // Always log to server console for debugging
  console.log(`[Auth] OTP for ${user.email}: ${user.otpCode}`);

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";

  // ── Try Resend first ──────────────────────────────────────────────────────
  if (resendKey && resendKey !== "re_your_key_here") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          from:    `ARIA Research <${emailFrom}>`,
          to:      [user.email],
          subject: "Your ARIA verification code",
          html:    buildEmailHTML(user.name, user.otpCode!),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log(`[Auth] OTP sent via Resend to ${user.email} — id: ${data.id}`);
        return { sent: true };
      }

      console.error("[Auth] Resend error:", data);
      // Fall through to Gmail if Resend fails
    } catch (err) {
      console.error("[Auth] Resend fetch error:", err);
      // Fall through to Gmail
    }
  }

  // ── Try Gmail SMTP fallback ───────────────────────────────────────────────
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass &&
      emailUser !== "your-email@gmail.com" &&
      emailPass !== "your-gmail-app-password-here") {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth:    { user: emailUser, pass: emailPass.replace(/\s/g, "") },
      });
      await transporter.verify();
      await transporter.sendMail({
        from:    `"ARIA Research" <${emailUser}>`,
        to:      user.email,
        subject: "Your ARIA verification code",
        html:    buildEmailHTML(user.name, user.otpCode!),
      });
      console.log(`[Auth] OTP sent via Gmail to ${user.email}`);
      return { sent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Auth] Gmail error:", message);
      return { sent: false, error: message };
    }
  }

  // ── Neither configured ────────────────────────────────────────────────────
  console.warn("[Auth] No email provider configured. OTP is in the server console above.");
  return { sent: false, error: "No email provider configured" };
}

function buildEmailHTML(name: string, otp: string): string {
  return `
    <!DOCTYPE html><html>
    <body style="background:#0a0a0f;font-family:sans-serif;padding:40px;margin:0;">
      <div style="max-width:440px;margin:0 auto;background:#0d0d14;border:1px solid #1e1e2e;border-radius:16px;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:44px;height:44px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
            <span style="color:#00ff88;font-size:18px;font-weight:bold;">A</span>
          </div>
          <h1 style="color:#00ff88;font-size:20px;margin:0 0 4px;">ARIA</h1>
          <p style="color:#505070;font-size:11px;margin:0;font-family:monospace;">Advanced Research & Intelligence Agent</p>
        </div>
        <h2 style="color:#e8e8f0;font-size:15px;margin:0 0 8px;">Hi ${name},</h2>
        <p style="color:#808090;line-height:1.6;margin:0 0 20px;font-size:13px;">
          Your verification code for ARIA is:
        </p>
        <div style="text-align:center;margin:24px 0;">
          <div style="background:#111118;border:2px solid rgba(0,255,136,0.3);border-radius:12px;padding:20px 32px;display:inline-block;">
            <span style="color:#00ff88;font-size:36px;font-weight:bold;letter-spacing:12px;font-family:monospace;">${otp}</span>
          </div>
        </div>
        <p style="color:#505070;font-size:12px;text-align:center;margin:0 0 8px;">
          Expires in <strong style="color:#ffb700;">10 minutes</strong>.
        </p>
        <p style="color:#505070;font-size:12px;text-align:center;margin:0 0 24px;">
          Enter this code on the ARIA verification screen.
        </p>
        <div style="border-top:1px solid #1a1a24;padding-top:16px;">
          <p style="color:#303050;font-size:11px;text-align:center;margin:0;">
            If you did not create an ARIA account, ignore this email.
          </p>
        </div>
      </div>
    </body></html>
  `;
}
