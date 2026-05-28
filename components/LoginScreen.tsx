"use client";
import { useState, useRef, useEffect } from "react";
import type { UserProfile } from "@/types";

const ROLES = ["Strategy Analyst","Business Developer","Investment Analyst","Product Manager","Entrepreneur / Founder","Consultant","Marketing Manager","Research Analyst","Other"];
const INDUSTRIES = ["Technology / SaaS","Financial Services","Healthcare","E-Commerce / Retail","Energy & Utilities","Real Estate","Manufacturing","Education","Media & Entertainment","Other"];

type AuthMode = "login" | "register" | "otp";

function OTPInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...value]; next[i] = v; onChange(next);
    if (v && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { onChange(pasted.split("")); refs[5].current?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-12 text-center text-lg font-bold font-mono bg-[#111118] border rounded-xl text-[#e8e8f0] outline-none transition-all ${value[i] ? "border-[#00ff88]/50 text-[#00ff88]" : "border-[#1e1e2e] focus:border-[#00ff88]/30"}`}
        />
      ))}
    </div>
  );
}

export default function LoginScreen({ onLogin }: { onLogin: (profile: UserProfile, isNewUser: boolean) => void }) {
  const [mode,        setMode]        = useState<AuthMode>("login");
  const [regStep,     setRegStep]     = useState<1|2>(1);
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [name,        setName]        = useState("");
  const [role,        setRole]        = useState("");
  const [industry,    setIndustry]    = useState("");
  const [otp,         setOtp]         = useState<string[]>(Array(6).fill(""));
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [otpTimer,    setOtpTimer]    = useState(0);
  const [canResend,   setCanResend]   = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (otpTimer > 0) {
      timerRef.current = setTimeout(() => setOtpTimer(t => t - 1), 1000);
    } else if (mode === "otp") {
      setCanResend(true);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [otpTimer, mode]);

  const startTimer = () => { setOtpTimer(60); setCanResend(false); };

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      const profile: UserProfile = {
        id: data.user.id, name: data.user.name, email: data.user.email,
        role: data.user.role, industry: data.user.industry, verified: data.user.verified,
        preferences: data.user.preferences, createdAt: new Date(data.user.createdAt),
      };
      localStorage.setItem("aria_token",   data.token);
      localStorage.setItem("aria_profile", JSON.stringify(profile));
      onLogin(profile, false);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleRegStep1 = () => {
    if (!name.trim())  { setError("Please enter your name."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) { setError("Please enter a valid email."); return; }
    if (!password)     { setError("Please enter a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPass) { setError("Passwords do not match."); return; }
    setError(""); setRegStep(2);
  };

  const handleRegister = async () => {
    if (!role)     { setError("Please select your role.");     return; }
    if (!industry) { setError("Please select your industry."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name, email, password, role, industry }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      setMode("otp"); startTimer();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/verify-otp", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, otp: code }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Verification failed"); return; }
      const profile: UserProfile = {
        id: data.user.id, name: data.user.name, email: data.user.email,
        role: data.user.role, industry: data.user.industry, verified: data.user.verified,
        preferences: data.user.preferences, createdAt: new Date(data.user.createdAt),
      };
      localStorage.setItem("aria_token",   data.token);
      localStorage.setItem("aria_profile", JSON.stringify(profile));
      onLogin(profile, true);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    if (!canResend || loading) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/auth/resend-otp", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to resend"); return; }
      setOtp(Array(6).fill("")); startTimer();
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const PassToggle = () => (
    <button type="button" onClick={() => setShowPass(!showPass)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#404060] hover:text-[#808090] transition-colors">
      {showPass
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  );

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] grid-bg flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-md my-auto">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 rounded-full bg-[#00ff88]/3 blur-3xl"/>
        </div>

        <div className="text-center mb-5 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mb-3 signal-glow">
            <span className="text-2xl font-bold text-[#00ff88] signal-glow-text leading-none" style={{fontFamily:"Syne,sans-serif"}}>A</span>
          </div>
          <h1 className="text-xl font-bold text-[#e8e8f0]" style={{fontFamily:"Syne,sans-serif"}}>ARIA</h1>
          <p className="text-[10px] text-[#505070] font-mono">Advanced Research & Intelligence Agent</p>
        </div>

        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 shadow-2xl shadow-black/50 relative">

          {mode === "otp" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-[#e8e8f0] mb-1" style={{fontFamily:"Syne,sans-serif"}}>Check your email</h2>
                <p className="text-[11px] text-[#505070] leading-relaxed">
                  We sent a 6-digit code to<br/>
                  <span className="text-[#00ff88] font-mono">{email}</span>
                </p>
              </div>
              <OTPInput value={otp} onChange={setOtp}/>
              {error && <p className="text-[11px] text-[#ff6b6b] mt-3 text-center">{error}</p>}
              <button onClick={handleVerifyOTP} disabled={otp.join("").length < 6 || loading}
                className="w-full mt-5 py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 text-sm font-semibold text-[#00ff88] hover:bg-[#00ff88]/18 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{fontFamily:"Syne,sans-serif"}}>
                {loading ? "Verifying..." : "Verify & Enter ARIA →"}
              </button>
              <div className="mt-4 text-center space-y-2">
                <p className="text-[11px] text-[#505070]">Didn&apos;t receive the code?</p>
                {canResend
                  ? <button onClick={handleResendOTP} disabled={loading} className="text-[11px] text-[#00ff88] hover:underline disabled:opacity-50 font-mono">Send a new code</button>
                  : <p className="text-[11px] text-[#404060] font-mono">Resend in {otpTimer}s</p>
                }
                <div className="pt-1">
                  <button onClick={() => { setMode("register"); setRegStep(2); setOtp(Array(6).fill("")); setError(""); }}
                    className="text-[11px] text-[#505070] hover:text-[#c8c8d8] transition-colors">← Back</button>
                </div>
              </div>
            </div>
          )}

          {mode === "login" && (
            <>
              <h2 className="text-sm font-bold text-[#e8e8f0] mb-1" style={{fontFamily:"Syne,sans-serif"}}>Sign in to ARIA</h2>
              <p className="text-[11px] text-[#505070] mb-5">Welcome back. Enter your credentials.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                    placeholder="you@company.com" autoFocus
                    onKeyDown={e=>e.key==="Enter"&&document.getElementById("login-pass")?.focus()}
                    className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none focus:border-[#00ff88]/30 transition-all"/>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Password</label>
                  <div className="relative">
                    <input id="login-pass" type={showPass?"text":"password"} value={password}
                      onChange={e=>{setPassword(e.target.value);setError("");}}
                      placeholder="Enter your password"
                      onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                      className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none focus:border-[#00ff88]/30 transition-all pr-10"/>
                    <PassToggle/>
                  </div>
                </div>
              </div>
              {error && <p className="text-[11px] text-[#ff6b6b] mt-2">{error}</p>}
              <button onClick={handleLogin} disabled={!email.trim()||!password||loading}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 text-sm font-semibold text-[#00ff88] hover:bg-[#00ff88]/18 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{fontFamily:"Syne,sans-serif"}}>
                {loading ? "Signing in..." : "Sign In →"}
              </button>
              <div className="mt-4 text-center">
                <p className="text-[11px] text-[#505070]">No account?{" "}
                  <button onClick={()=>{setMode("register");setRegStep(1);setError("");}} className="text-[#00ff88] hover:underline">Create one free</button>
                </p>
              </div>
            </>
          )}

          {mode === "register" && regStep === 1 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={()=>{setMode("login");setError("");}} className="text-[10px] font-mono text-[#505070] hover:text-[#e8e8f0] transition-colors">← back</button>
                <h2 className="text-sm font-bold text-[#e8e8f0]" style={{fontFamily:"Syne,sans-serif"}}>Create your account</h2>
              </div>
              <div className="flex gap-2 mb-5">
                <div className="flex-1 h-0.5 bg-[#00ff88] rounded-full"/>
                <div className="flex-1 h-0.5 bg-[#1e1e2e] rounded-full"/>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Full Name</label>
                  <input type="text" value={name} onChange={e=>{setName(e.target.value);setError("");}}
                    placeholder="e.g. Alex Johnson" autoFocus
                    className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none focus:border-[#00ff88]/30 transition-all"/>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                    placeholder="you@company.com"
                    className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none focus:border-[#00ff88]/30 transition-all"/>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass?"text":"password"} value={password}
                      onChange={e=>{setPassword(e.target.value);setError("");}}
                      placeholder="Min. 8 characters"
                      className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none focus:border-[#00ff88]/30 transition-all pr-10"/>
                    <PassToggle/>
                  </div>
                  {password && (
                    <div className="mt-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i=>(
                          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                            password.length >= i*3
                              ? password.length>=12&&/[A-Z]/.test(password)&&/[0-9]/.test(password)?"bg-[#00ff88]"
                              : password.length>=8?"bg-[#ffb700]":"bg-[#ff6b6b]"
                              :"bg-[#1e1e2e]"
                          }`}/>
                        ))}
                      </div>
                      <p className="text-[9px] text-[#404060] mt-1">
                        {password.length<8?"Too short":password.length<12?"Fair":/[A-Z]/.test(password)&&/[0-9]/.test(password)?"Strong":"Good"}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Confirm Password</label>
                  <input type={showPass?"text":"password"} value={confirmPass}
                    onChange={e=>{setConfirmPass(e.target.value);setError("");}}
                    placeholder="Repeat your password"
                    onKeyDown={e=>e.key==="Enter"&&handleRegStep1()}
                    className={`w-full bg-[#111118] border rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none transition-all ${confirmPass&&confirmPass!==password?"border-[#ff6b6b]/40":"border-[#1e1e2e] focus:border-[#00ff88]/30"}`}/>
                  {confirmPass&&confirmPass!==password&&<p className="text-[10px] text-[#ff6b6b] mt-1">Passwords do not match</p>}
                </div>
              </div>
              {error&&<p className="text-[11px] text-[#ff6b6b] mt-2">{error}</p>}
              <button onClick={handleRegStep1} disabled={!name.trim()||!email.trim()||!password||password!==confirmPass}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 text-sm font-semibold text-[#00ff88] hover:bg-[#00ff88]/18 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{fontFamily:"Syne,sans-serif"}}>Continue →</button>
            </>
          )}

          {mode === "register" && regStep === 2 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={()=>{setRegStep(1);setError("");}} className="text-[10px] font-mono text-[#505070] hover:text-[#e8e8f0] transition-colors">← back</button>
                <h2 className="text-sm font-bold text-[#e8e8f0]" style={{fontFamily:"Syne,sans-serif"}}>Hi {name.split(" ")[0]}, your focus?</h2>
              </div>
              <div className="flex gap-2 mb-5">
                <div className="flex-1 h-0.5 bg-[#00ff88] rounded-full"/>
                <div className="flex-1 h-0.5 bg-[#00ff88] rounded-full"/>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Your Role</label>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                    {ROLES.map(r=>(
                      <button key={r} onClick={()=>{setRole(r);setError("");}}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] text-left transition-all ${role===r?"border-[#00ff88]/35 bg-[#00ff88]/8 text-[#e8e8f0]":"border-[#1e1e2e] text-[#505070] hover:border-[#252533] hover:text-[#909090]"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">Industry</label>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                    {INDUSTRIES.map(ind=>(
                      <button key={ind} onClick={()=>{setIndustry(ind);setError("");}}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] text-left transition-all ${industry===ind?"border-[#00ff88]/35 bg-[#00ff88]/8 text-[#e8e8f0]":"border-[#1e1e2e] text-[#505070] hover:border-[#252533] hover:text-[#909090]"}`}>
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {(role||industry)&&(
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {role&&<span className="text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/8 border border-[#00ff88]/20 rounded-full px-2 py-0.5">{role}</span>}
                  {industry&&<span className="text-[10px] font-mono text-[#ffb700] bg-[#ffb700]/8 border border-[#ffb700]/20 rounded-full px-2 py-0.5">{industry}</span>}
                </div>
              )}
              {error&&<p className="text-[11px] text-[#ff6b6b] mb-2">{error}</p>}
              <button onClick={handleRegister} disabled={!role||!industry||loading}
                className="w-full py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 text-sm font-semibold text-[#00ff88] hover:bg-[#00ff88]/18 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{fontFamily:"Syne,sans-serif"}}>
                {loading?"Creating account...":"Create Account →"}
              </button>
            </>
          )}
        </div>
        <p className="text-center text-[10px] text-[#252535] font-mono mt-3">
          {mode==="login"?"Secure login · JWT sessions · Verified accounts":"Encrypted · OTP via email · No plain text storage"}
        </p>
      </div>
    </div>
  );
}
