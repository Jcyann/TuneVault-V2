const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO = "jchinchen@msn.com";
const FROM = "TuneVault <notifications@tunevault.org>";

export async function sendNotificationEmail(subject: string, htmlBody: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipping email: ${subject}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [TO], subject, html: htmlBody }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[email] Resend error ${res.status}: ${text}`);
    } else {
      console.log(`[email] Sent: ${subject}`);
    }
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

export function lessonInquiryEmail(data: {
  name: string; email: string; instrument: string; experienceLevel: string;
  yearsPlaying?: string | null; currentGoals?: string | null; specificTunes?: string | null;
  availability?: string | null; timezone?: string | null; additionalNotes?: string | null;
}): string {
  return `
    <h2 style="font-family:serif;color:#92400e;">New Lesson Inquiry — TuneVault</h2>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
      <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;width:160px;">Name</td><td style="padding:6px 12px;">${data.name}</td></tr>
      <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
      <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Instrument</td><td style="padding:6px 12px;">${data.instrument}</td></tr>
      <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Level</td><td style="padding:6px 12px;">${data.experienceLevel}</td></tr>
      ${data.yearsPlaying ? `<tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Years Playing</td><td style="padding:6px 12px;">${data.yearsPlaying}</td></tr>` : ""}
      ${data.currentGoals ? `<tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Goals</td><td style="padding:6px 12px;">${data.currentGoals}</td></tr>` : ""}
      ${data.specificTunes ? `<tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Tunes/Styles</td><td style="padding:6px 12px;">${data.specificTunes}</td></tr>` : ""}
      ${data.availability ? `<tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Availability</td><td style="padding:6px 12px;">${data.availability}</td></tr>` : ""}
      ${data.timezone ? `<tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Timezone</td><td style="padding:6px 12px;">${data.timezone}</td></tr>` : ""}
      ${data.additionalNotes ? `<tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Notes</td><td style="padding:6px 12px;">${data.additionalNotes}</td></tr>` : ""}
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin-top:24px;">Sent from TuneVault — <a href="https://tunevault.org/admin">View all inquiries</a></p>
  `;
}

export function suggestionEmail(data: { name?: string | null; message: string }): string {
  return `
    <h2 style="font-family:serif;color:#92400e;">New Suggestion — TuneVault</h2>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
      <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;width:160px;">From</td><td style="padding:6px 12px;">${data.name || "Anonymous"}</td></tr>
      <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:bold;">Message</td><td style="padding:6px 12px;">${data.message}</td></tr>
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin-top:24px;">Sent from TuneVault — <a href="https://tunevault.org/admin">View all suggestions</a></p>
  `;
}
