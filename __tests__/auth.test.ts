/**
 * Unit tests for lib/auth.ts
 * Run with: npx jest --testPathPattern=auth
 */

// Mock the file system so tests don't write to disk
jest.mock("fs", () => ({
  existsSync:    jest.fn().mockReturnValue(false),
  mkdirSync:     jest.fn(),
  readFileSync:  jest.fn().mockReturnValue("{}"),
  writeFileSync: jest.fn(),
}));

// Re-import after mocking
const authModule = () => require("../lib/auth");

describe("Auth — registerUser", () => {
  beforeEach(() => jest.resetModules());

  it("rejects password shorter than 8 characters", async () => {
    const { registerUser } = authModule();
    const result = await registerUser({
      name: "Test User", email: "test@example.com",
      password: "short", role: "Analyst", industry: "Tech",
    });
    expect(result.user).toBeNull();
    expect(result.error).toContain("8 characters");
  });

  it("creates a user with verified false", async () => {
    const { registerUser } = authModule();
    const result = await registerUser({
      name: "Test User", email: "newuser@example.com",
      password: "securepass123", role: "Analyst", industry: "Tech",
    });
    expect(result.user).not.toBeNull();
    expect(result.user?.verified).toBe(false);
    expect(result.user?.otpCode).toHaveLength(6);
  });

  it("rejects duplicate email", async () => {
    const { registerUser } = authModule();
    await registerUser({
      name: "User One", email: "same@example.com",
      password: "securepass123", role: "Analyst", industry: "Tech",
    });
    const second = await registerUser({
      name: "User Two", email: "same@example.com",
      password: "securepass456", role: "Manager", industry: "Finance",
    });
    expect(second.user).toBeNull();
    expect(second.error).toContain("already exists");
  });
});

describe("Auth — verifyOTP", () => {
  beforeEach(() => jest.resetModules());

  it("rejects incorrect OTP", async () => {
    const { registerUser, verifyOTP } = authModule();
    const { user } = await registerUser({
      name: "OTP User", email: "otp@example.com",
      password: "securepass123", role: "Analyst", industry: "Tech",
    });
    const result = verifyOTP("otp@example.com", "000000");
    expect(result.user).toBeNull();
    expect(result.error).toContain("Incorrect");
  });

  it("rejects expired OTP", async () => {
    const { registerUser, verifyOTP, getUserByEmail } = authModule();
    await registerUser({
      name: "Expire User", email: "expire@example.com",
      password: "securepass123", role: "Analyst", industry: "Tech",
    });
    // Manually expire the OTP
    const user = getUserByEmail("expire@example.com");
    if (user) user.otpExpiry = Date.now() - 1000;
    const result = verifyOTP("expire@example.com", user?.otpCode || "");
    expect(result.user).toBeNull();
    expect(result.error).toContain("expired");
  });

  it("verifies correct OTP and returns JWT", async () => {
    const { registerUser, verifyOTP, getUserByEmail } = authModule();
    await registerUser({
      name: "Good User", email: "good@example.com",
      password: "securepass123", role: "Analyst", industry: "Tech",
    });
    const user   = getUserByEmail("good@example.com");
    const result = verifyOTP("good@example.com", user?.otpCode || "");
    expect(result.user?.verified).toBe(true);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
  });
});

describe("Auth — loginUser", () => {
  beforeEach(() => jest.resetModules());

  it("rejects login for unverified account", async () => {
    const { registerUser, loginUser } = authModule();
    await registerUser({
      name: "Unverified", email: "unverified@example.com",
      password: "securepass123", role: "Analyst", industry: "Tech",
    });
    const result = await loginUser({ email: "unverified@example.com", password: "securepass123" });
    expect(result.user).toBeNull();
    expect(result.error).toContain("verify");
  });

  it("rejects wrong password", async () => {
    const { registerUser, verifyOTP, getUserByEmail, loginUser } = authModule();
    await registerUser({
      name: "Login User", email: "login@example.com",
      password: "correctpass123", role: "Analyst", industry: "Tech",
    });
    const user = getUserByEmail("login@example.com");
    verifyOTP("login@example.com", user?.otpCode || "");
    const result = await loginUser({ email: "login@example.com", password: "wrongpassword" });
    expect(result.user).toBeNull();
    expect(result.error).toContain("Incorrect");
  });

  it("returns token on successful login", async () => {
    const { registerUser, verifyOTP, getUserByEmail, loginUser } = authModule();
    await registerUser({
      name: "Success User", email: "success@example.com",
      password: "correctpass123", role: "Analyst", industry: "Tech",
    });
    const user = getUserByEmail("success@example.com");
    verifyOTP("success@example.com", user?.otpCode || "");
    const result = await loginUser({ email: "success@example.com", password: "correctpass123" });
    expect(result.user).not.toBeNull();
    expect(result.token).toBeDefined();
  });
});

describe("Auth — signJWT and verifyJWT", () => {
  beforeEach(() => jest.resetModules());

  it("signs and verifies a valid token", () => {
    const { signJWT, verifyJWT } = authModule();
    const token   = signJWT({ userId: "abc123", email: "test@test.com", name: "Test", verified: true });
    const payload = verifyJWT(token);
    expect(payload?.userId).toBe("abc123");
    expect(payload?.email).toBe("test@test.com");
    expect(payload?.verified).toBe(true);
  });

  it("returns null for tampered token", () => {
    const { signJWT, verifyJWT } = authModule();
    const token    = signJWT({ userId: "abc123", email: "test@test.com", name: "Test", verified: true });
    const tampered = token.slice(0, -5) + "xxxxx";
    const result   = verifyJWT(tampered);
    expect(result).toBeNull();
  });
});
