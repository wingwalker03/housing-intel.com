import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

let cachedInboxId: string | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getOrCreateInbox(): Promise<string> {
  if (cachedInboxId) return cachedInboxId;

  try {
    const listRes = await connectors.proxy("agentmail", "/v0/inboxes", {
      method: "GET",
    });
    const listData = await listRes.json();

    if (listData.inboxes && listData.inboxes.length > 0) {
      cachedInboxId = listData.inboxes[0].inbox_id;
      return cachedInboxId!;
    }

    const createRes = await connectors.proxy("agentmail", "/v0/inboxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "noreply",
        display_name: "Housing Intel",
      }),
    });
    const createData = await createRes.json();
    cachedInboxId = createData.inbox_id;
    return cachedInboxId!;
  } catch (err) {
    console.error("AgentMail inbox error:", err);
    throw err;
  }
}

export async function sendConfirmationEmail(toEmail: string, firstName: string, confirmUrl: string) {
  try {
    const inboxId = await getOrCreateInbox();
    await connectors.proxy("agentmail", `/v0/inboxes/${inboxId}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toEmail,
        subject: "Confirm your Housing Intel account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e293b;">Welcome to Housing Intel, ${escapeHtml(firstName)}!</h1>
            <p style="color: #475569; font-size: 16px;">Thank you for creating an account. Please confirm your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Confirm Email</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
          </div>
        `,
        text: `Welcome to Housing Intel, ${firstName}! Confirm your email: ${confirmUrl}`,
      }),
    });
    console.log(`Confirmation email sent to ${toEmail}`);
  } catch (err) {
    console.error("Failed to send confirmation email:", err);
  }
}

export async function sendContactFormEmail(name: string, email: string, message: string) {
  try {
    const inboxId = await getOrCreateInbox();
    await connectors.proxy("agentmail", `/v0/inboxes/${inboxId}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "Sonnett.sells.mufreesboro@gmail.com",
        subject: `Housing Intel Contact Form: ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; white-space: pre-wrap;">${escapeHtml(message)}</div>
          </div>
        `,
        text: `Contact Form - Name: ${name}, Email: ${email}, Message: ${message}`,
      }),
    });
    console.log(`Contact form email sent for ${name}`);
  } catch (err) {
    console.error("Failed to send contact form email:", err);
  }
}
