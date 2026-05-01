import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key    = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const testTo = req.nextUrl.searchParams.get("to") || "delivered@resend.dev";

  if (!key || key === "re_your_key_here") {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from,
        to:      [testTo],
        subject: "ARIA Email Test",
        html:    `<div style="background:#0a0a0f;color:#00ff88;padding:32px;font-family:monospace;border-radius:12px;"><h2>ARIA Email Works!</h2><p>Sent: ${new Date().toISOString()}</p></div>`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ success: false, status: res.status, error: data }, { status: 400 });
    }

    return NextResponse.json({ success: true, emailId: data.id, sentTo: testTo, from });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
