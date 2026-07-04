import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const BRAND_NAME = "Avorex Technologies";
const BRAND_FULL = "Avorex Technologies WhatsApp Automation";
const FROM_EMAIL = process.env.GMAIL_USER || "noreply@avorex.com";
const SUPPORT_WHATSAPP = "01575813644";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PREMIUM LIGHT MODE TEMPLATE SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function wrap(title: string, body: string, opts?: { preheader?: string; brandName?: string; logoUrl?: string; hideTopLogo?: boolean }): string {
  const brand = opts?.brandName || BRAND_NAME;
  const logoUrl = opts?.logoUrl || `${SITE_URL}/logo.jpg`;
  const logoHtml = opts?.hideTopLogo 
    ? "" 
    : `<tr id="email-top-logo"><td style="padding-bottom:28px;text-align:center;">
        <img src="${logoUrl}" alt="${brand}" style="max-height:48px;max-width:200px;display:block;margin:0 auto;border-radius:8px;"/>
       </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;opacity:0;">${opts?.preheader || ""}</div>

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:48px 20px;">
<tr><td align="center">

<!-- Main container -->
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

${logoHtml}

<!-- Card -->
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
<tr><td style="padding:44px 40px;border-radius:16px;">

${body}

</td></tr>
</table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:40px 10px 20px;text-align:center;">
<p style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;margin:0 0 8px 0;">${BRAND_FULL}</p>
<p style="color:#94a3b8;font-size:10px;font-weight:400;letter-spacing:0.3px;margin:0 0 4px 0;">WhatsApp Business Automation Platform</p>
<table cellpadding="0" cellspacing="0" style="margin:16px auto 0;"><tr>
  <td style="padding:0 8px;"><a href="https://wa.me/${SUPPORT_WHATSAPP}" style="color:#4f46e5;font-size:10px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">Support</a></td>
  <td style="color:#cbd5e1;font-size:10px;">·</td>
  <td style="padding:0 8px;"><a href="${SITE_URL}" style="color:#4f46e5;font-size:10px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">Dashboard</a></td>
</tr></table>
</td></tr>

</table>

</td></tr></table>
</body></html>`;
}

// ── Shared Light Mode Components ──

function badge(text: string, color: string): string {
  return `<div style="text-align:center;margin-bottom:28px;">
<span style="display:inline-block;background:${color}0d;border:1px solid ${color}25;color:${color};font-size:10px;font-weight:700;padding:6px 18px;border-radius:100px;letter-spacing:1.5px;text-transform:uppercase;font-family:'SF Pro Display',sans-serif;">${text}</span>
</div>`;
}

function heading(text: string): string {
  return `<h2 style="color:#0f172a;font-size:24px;font-weight:800;margin:0 0 10px 0;text-align:center;letter-spacing:-0.5px;line-height:1.3;font-family:'SF Pro Display',sans-serif;">${text}</h2>`;
}

function subtext(text: string): string {
  return `<p style="color:#475569;font-size:14px;line-height:1.75;margin:0 0 28px 0;text-align:center;font-weight:400;">${text}</p>`;
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-top:1px solid #e2e8f0;"></td></tr></table>`;
}

function btn(text: string, url: string, color = "#4f46e5"): string {
  return `<div style="text-align:center;margin:12px 0 4px;">
<a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 12px ${color}20;font-family:'SF Pro Display',sans-serif;">${text}</a>
</div>`;
}

function infoRow(label: string, value: string, opts?: { mono?: boolean; color?: string }): string {
  return `<tr>
<td style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;padding:0 0 12px 0;font-family:'SF Pro Display',sans-serif;">${label}</td>
<td style="color:${opts?.color || "#0f172a"};font-size:13px;font-weight:700;text-align:right;padding:0 0 12px 0;${opts?.mono ? "font-family:'SF Mono',monospace;letter-spacing:0.5px;" : "font-family:'SF Pro Display',sans-serif;"}">${value}</td>
</tr>`;
}

function infoCard(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td style="padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr></table>`;
}

function securityFooter(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
<tr><td style="padding:16px 20px;background:#fff5f5;border:1px solid #fed7d7;border-radius:12px;">
<p style="color:#b91c1c;font-size:12px;line-height:1.6;margin:0;text-align:center;">If you don't recognize this activity, <a href="#" style="color:#ef4444;text-decoration:none;font-weight:600;">change your password immediately</a> and contact support.</p>
</td></tr></table>`;
}

function sectionIcon(emoji: string, color: string): string {
  return `<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-flex;width:64px;height:64px;border-radius:20px;background:${color}0d;border:1px solid ${color}1a;align-items:center;justify-content:center;">
<span style="font-size:28px;line-height:64px;">${emoji}</span>
</div></div>`;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. WELCOME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendWelcomeEmail(to: string, data: { userName: string }): Promise<boolean> {
  const html = wrap("Welcome to Avorex",
    sectionIcon("🎉", "#4f46e5") +
    badge("WELCOME ABOARD", "#4f46e5") +
    heading("Welcome to " + BRAND_FULL) +
    subtext(`Hi ${data.userName}, your account has been created successfully. You're all set to automate your WhatsApp business with the power of AI.`) +
    divider() +
    `<p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 16px 0;text-align:center;">What's next?</p>` +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
${[
  { n: "1", t: "Choose a plan that fits your business", c: "#4f46e5" },
  { n: "2", t: "Connect your WhatsApp Business number", c: "#7c3aed" },
  { n: "3", t: "Start automating conversations & growing", c: "#a855f7" },
].map(i => `<tr><td style="padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:${i.c}0d;color:${i.c};font-size:12px;font-weight:800;font-family:'SF Pro Display',sans-serif;">${i.n}</span></td>
<td style="padding-left:12px;vertical-align:middle;"><span style="color:#334155;font-size:13px;font-weight:500;font-family:'SF Pro Display',sans-serif;">${i.t}</span></td>
</tr></table>
</td></tr><tr><td style="height:8px;"></td></tr>`).join("")}
</table>` +
    btn("Go to Dashboard", `${SITE_URL}/dashboard`, "#4f46e5"),
    { preheader: `Welcome to ${BRAND_NAME}! Your account is ready to go.` }
  );
  return sendMail(to, `Welcome to ${BRAND_NAME}`, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. LOGIN ALERT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendLoginAlertEmail(to: string, data: { userName: string; loginTime: string; ip?: string; device?: string }): Promise<boolean> {
  const html = wrap("New Login Detected",
    sectionIcon("🔐", "#22c55e") +
    badge("SECURITY ALERT", "#22c55e") +
    heading("New login detected") +
    subtext(`Hi ${data.userName}, a new sign-in to your ${BRAND_NAME} account was detected from a new device or location.`) +
    divider() +
    infoCard(
      infoRow("Status", "Verified ✓", { color: "#22c55e" }) +
      infoRow("Time", new Date(data.loginTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })) +
      (data.device ? infoRow("Device", data.device) : "") +
      (data.ip ? infoRow("IP Address", data.ip, { mono: true }) : "")
    ) +
    securityFooter(),
    { preheader: "New login to your " + BRAND_NAME + " account detected." }
  );
  return sendMail(to, "Security Alert — New Login", html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. LOGOUT ALERT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendLogoutAlertEmail(to: string, data: { userName: string; logoutTime: string; ip?: string; device?: string }): Promise<boolean> {
  const html = wrap("Session Ended",
    sectionIcon("👋", "#f59e0b") +
    badge("SESSION ENDED", "#f59e0b") +
    heading("Session ended") +
    subtext(`Hi ${data.userName}, your ${BRAND_NAME} session has been successfully ended from the following device.`) +
    divider() +
    infoCard(
      infoRow("Status", "Signed Out", { color: "#f59e0b" }) +
      infoRow("Time", new Date(data.logoutTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })) +
      (data.device ? infoRow("Device", data.device) : "") +
      (data.ip ? infoRow("IP Address", data.ip, { mono: true }) : "")
    ) +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
<tr><td style="padding:16px 20px;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;">
<p style="color:#92400e;font-size:12px;line-height:1.6;margin:0;text-align:center;">If you didn't log out, someone may have access to your account. <a href="#" style="color:#ef4444;text-decoration:none;font-weight:600;">Secure your account now.</a></p>
</td></tr></table>`,
    { preheader: "Your " + BRAND_NAME + " session has ended." }
  );
  return sendMail(to, "Session Ended — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. FAILED LOGIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendFailedLoginEmail(to: string, data: { userName: string; attemptTime: string; ip?: string; device?: string; reason?: string }): Promise<boolean> {
  const html = wrap("Failed Login Attempt",
    sectionIcon("⚠️", "#ef4444") +
    badge("SECURITY WARNING", "#ef4444") +
    heading("Failed login attempt") +
    subtext(`Hi ${data.userName}, someone attempted to sign in to your account with an incorrect password.`) +
    divider() +
    infoCard(
      infoRow("Status", "Failed Attempt", { color: "#ef4444" }) +
      infoRow("Time", new Date(data.attemptTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })) +
      (data.ip ? infoRow("IP Address", data.ip, { mono: true }) : "") +
      (data.device ? infoRow("Device", data.device) : "") +
      (data.reason ? infoRow("Reason", data.reason, { color: "#ef4444" }) : "")
    ) +
    securityFooter(),
    { preheader: "Failed login attempt detected on your account." }
  );
  return sendMail(to, "Security Warning — Failed Login", html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. PASSWORD CHANGED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendPasswordChangedEmail(to: string, data: { userName: string; changeTime: string; ip?: string; device?: string }): Promise<boolean> {
  const html = wrap("Password Changed",
    sectionIcon("🔒", "#8b5cf6") +
    badge("SECURITY UPDATE", "#8b5cf6") +
    heading("Your password was changed") +
    subtext(`Hi ${data.userName}, your ${BRAND_NAME} account password was successfully updated.`) +
    divider() +
    infoCard(
      infoRow("Status", "Updated ✓", { color: "#22c55e" }) +
      infoRow("Time", new Date(data.changeTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })) +
      (data.ip ? infoRow("IP Address", data.ip, { mono: true }) : "") +
      (data.device ? infoRow("Device", data.device) : "")
    ) +
    securityFooter(),
    { preheader: "Your " + BRAND_NAME + " password was changed." }
  );
  return sendMail(to, "Password Changed — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. PASSWORD RESET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendPasswordResetEmail(to: string, data: { userName: string; resetUrl: string; ip?: string }): Promise<boolean> {
  const html = wrap("Password Reset",
    sectionIcon("🔑", "#f59e0b") +
    badge("PASSWORD RESET", "#f59e0b") +
    heading("Reset your password") +
    subtext(`Hi ${data.userName}, we received a request to reset your ${BRAND_NAME} account password. Click below to set a new one.`) +
    btn("Reset Password", data.resetUrl, "#f59e0b") +
    divider() +
    `<p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;text-align:center;">This link expires in 1 hour. If you didn't request this, simply ignore this email — your password will stay the same.</p>` +
    (data.ip ? `<p style="color:#94a3b8;font-size:11px;margin:12px 0 0;text-align:center;">Requested from IP: <span style="font-family:'SF Mono',monospace;">${data.ip}</span></p>` : ""),
    { preheader: "Reset your " + BRAND_NAME + " password." }
  );
  return sendMail(to, "Password Reset — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. LICENSE ACTIVATED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendLicenseActivatedEmail(to: string, data: { userName: string; plan: string; licenseKey: string; expiresAt: string | null; activatedAt: string }): Promise<boolean> {
  const html = wrap("License Activated",
    sectionIcon("✅", "#22c55e") +
    badge("LICENSE ACTIVE", "#22c55e") +
    heading("License activated successfully!") +
    subtext(`Hi ${data.userName}, your <strong style="color:#0f172a;font-weight:700;">${data.plan}</strong> plan license is now active and ready to use.`) +
    divider() +
    infoCard(
      infoRow("Plan", data.plan, { color: "#7c3aed" }) +
      infoRow("Activated", new Date(data.activatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) +
      (data.expiresAt ? infoRow("Valid Until", new Date(data.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : "")
    ) +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td style="padding:18px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;text-align:center;">
<p style="color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px 0;font-family:'SF Pro Display',sans-serif;">Your License Key</p>
<p style="color:#16a34a;font-size:15px;font-family:'SF Mono',monospace;font-weight:700;letter-spacing:2.5px;margin:0;">${data.licenseKey}</p>
</td></tr></table>` +
    btn("Open Dashboard", `${SITE_URL}/dashboard`, "#22c55e"),
    { preheader: `Your ${data.plan} license is now active.` }
  );
  return sendMail(to, "License Activated — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. LICENSE EXPIRY WARNING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendLicenseExpiryEmail(to: string, data: { userName: string; plan: string; expiresAt: string; daysLeft: number }): Promise<boolean> {
  const color = data.daysLeft <= 1 ? "#ef4444" : data.daysLeft <= 7 ? "#f59e0b" : "#4f46e5";
  const label = data.daysLeft <= 1 ? "EXPIRES TOMORROW" : data.daysLeft <= 7 ? "EXPIRING SOON" : "LICENSE REMINDER";
  const days = data.daysLeft <= 1 ? "1 day" : `${data.daysLeft} days`;
  const icon = data.daysLeft <= 1 ? "🔴" : data.daysLeft <= 7 ? "🟡" : "🔵";

  const html = wrap("License Expiring Soon",
    sectionIcon(icon, color) +
    badge(label, color) +
    heading("Your license is expiring") +
    subtext(`Hi ${data.userName}, your <strong style="color:#0f172a;font-weight:700;">${data.plan}</strong> plan license expires in <strong style="color:${color};font-weight:700;">${days}</strong>. Renew now to avoid service interruption.`) +
    divider() +
    infoCard(
      infoRow("Plan", data.plan, { color: "#7c3aed" }) +
      infoRow("Expires", new Date(data.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), { color }) +
      infoRow("Time Left", days, { color })
    ) +
    btn("Renew Now", `${SITE_URL}/activate`, color) +
    `<p style="color:#64748b;font-size:12px;line-height:1.6;margin:24px 0 0;text-align:center;">Your data is fully preserved. Renew anytime to restore access.</p>`,
    { preheader: `Your ${data.plan} license expires in ${days}. Renew now to avoid interruption.` }
  );
  return sendMail(to, `${label} — ${data.plan} License`, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. LICENSE EXPIRED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendLicenseExpiredEmail(to: string, data: { userName: string; plan: string; expiredAt: string }): Promise<boolean> {
  const html = wrap("License Expired",
    sectionIcon("⛔", "#ef4444") +
    badge("LICENSE EXPIRED", "#ef4444") +
    heading("Your license has expired") +
    subtext(`Hi ${data.userName}, your <strong style="color:#0f172a;font-weight:700;">${data.plan}</strong> plan license expired on <strong style="color:#ef4444;">${new Date(data.expiredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>. Some features may be limited.`) +
    divider() +
    infoCard(
      infoRow("Plan", data.plan) +
      infoRow("Expired", new Date(data.expiredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), { color: "#ef4444" }) +
      infoRow("Status", "Inactive", { color: "#ef4444" })
    ) +
    `<p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 24px;text-align:center;">Don't worry — your data is safe and preserved. Renew your license to regain full access.</p>` +
    btn("Renew License", `${SITE_URL}/activate`, "#ef4444"),
    { preheader: "Your license has expired. Renew to restore full access." }
  );
  return sendMail(to, "License Expired — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. PAYMENT CONFIRMED (Redesigned Professional Invoice)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendPaymentConfirmedEmail(
  to: string,
  data: {
    userName: string;
    plan: string;
    amount: string;
    method: string;
    transactionId: string;
    licenseKey: string;
    expiresAt: string | null;
  },
  branding?: {
    brandName?: string;
    brandLogoUrl?: string;
    softwareName?: string;
    currencySymbol?: string;
  }
): Promise<boolean> {
  const brand = branding?.brandName || BRAND_NAME;
  const logoUrl = branding?.brandLogoUrl || `${SITE_URL}/logo.jpg`;

  const invoiceDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const dueDate = data.expiresAt 
    ? new Date(data.expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Lifetime";

  const html = wrap("Payment Invoice",
    // 1. Logo Table
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand}" style="max-height: 52px; display: block; border-radius: 4px;" />
        </td>
      </tr>
    </table>` +

    // 2. Bill to & Invoice details split-box
    `<table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #a1a1aa; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size: 13px; margin-bottom: 24px; color: #18181b; border-collapse: collapse;">
      <tr>
        <!-- Left: Client Info -->
        <td style="width: 60%; padding: 14px; border-right: 1px solid #a1a1aa; vertical-align: top; line-height: 1.5;">
          <span style="color: #52525b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Bill to Client Name</span>
          <strong style="font-size: 14px; color: #09090b;">${data.userName}</strong><br/>
          <span style="color: #52525b;">${to}</span>
        </td>
        <!-- Right: Invoice Metadata -->
        <td style="width: 40%; padding: 14px; vertical-align: top; line-height: 1.5;">
          <strong style="font-size: 14px; color: #09090b; display: block; margin-bottom: 6px;">Invoice #${data.transactionId.substring(0, 8).toUpperCase()}</strong>
          <span style="color: #52525b; font-weight: 600;">Issued:</span> ${invoiceDate}<br/>
          <span style="color: #52525b; font-weight: 600;">Due:</span> ${dueDate}<br/>
          <span style="color: #52525b; font-weight: 600;">Status:</span> <strong style="color: #16a34a;">PAID</strong>
        </td>
      </tr>
    </table>` +

    // 3. Itemized Table
    `<table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #a1a1aa; border-collapse: collapse; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size: 13px; margin-bottom: 24px; color: #18181b;">
      <thead>
        <tr style="background: #f4f4f5; border-bottom: 1px solid #a1a1aa;">
          <th align="left" style="padding: 10px 14px; font-weight: 700; text-transform: uppercase; border-right: 1px solid #a1a1aa;">Description</th>
          <th align="center" style="padding: 10px 14px; font-weight: 700; text-transform: uppercase; border-right: 1px solid #a1a1aa; width: 80px;">Hrs/Qty</th>
          <th align="right" style="padding: 10px 14px; font-weight: 700; text-transform: uppercase; border-right: 1px solid #a1a1aa; width: 100px;">Price</th>
          <th align="right" style="padding: 10px 14px; font-weight: 700; text-transform: uppercase; width: 110px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #a1a1aa;">
          <td style="padding: 18px 14px; border-right: 1px solid #a1a1aa; vertical-align: top; line-height: 1.5;">
            <strong style="font-size: 14px; color: #09090b; display: block; margin-bottom: 4px;">${data.plan} Access License</strong>
            <span style="color: #71717a; font-size: 12px;">Complete access to WhatsApp Business API Automations, CRM Inbox, Broadcasts & AI Agents.</span>
          </td>
          <td align="center" style="padding: 18px 14px; border-right: 1px solid #a1a1aa; vertical-align: middle; color: #3f3f46;">1</td>
          <td align="right" style="padding: 18px 14px; border-right: 1px solid #a1a1aa; vertical-align: middle; font-family: monospace; font-weight: 600;">${data.amount}</td>
          <td align="right" style="padding: 18px 14px; vertical-align: middle; font-family: monospace; font-weight: 600;">${data.amount}</td>
        </tr>
        <!-- Spacer row to match wireframe style -->
        <tr style="height: 36px; border-bottom: 1px solid #a1a1aa;">
          <td style="border-right: 1px solid #a1a1aa;"></td>
          <td style="border-right: 1px solid #a1a1aa;"></td>
          <td style="border-right: 1px solid #a1a1aa;"></td>
          <td></td>
        </tr>
        <!-- Total Paid row -->
        <tr style="background: #f4f4f5; font-weight: 700;">
          <td colspan="2" style="border-right: 1px solid #a1a1aa;"></td>
          <td align="right" style="padding: 12px 14px; border-right: 1px solid #a1a1aa; color: #52525b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Amount Paid</td>
          <td align="right" style="padding: 12px 14px; font-family: monospace; font-size: 15px; color: #09090b;">${data.amount}</td>
        </tr>
      </tbody>
    </table>` +

    // 4. Terms of Payment / License Key Box
    `<table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #a1a1aa; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size: 12px; margin-bottom: 24px; color: #3f3f46; border-collapse: collapse;">
      <tr>
        <td style="padding: 14px; line-height: 1.6;">
          <strong style="color: #09090b; text-transform: uppercase; display: block; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.5px;">Terms of Payment & Activation Key</strong>
          Your unique license activation key is: <strong style="color: #4f46e5; font-family: monospace; font-size: 14px; letter-spacing: 1px;">${data.licenseKey}</strong>.<br/>
          Please apply this token in your settings panel to unlock all features immediately.<br/>
          All transactions are subject to our standard service terms. For billing support, reach out to our team via WhatsApp.
        </td>
      </tr>
    </table>` +

    // 5. Classic Footer details row
    `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size: 11px; color: #71717a; margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      <tr>
        <td style="width: 33.33%; text-align: left;">Phone: ${SUPPORT_WHATSAPP}</td>
        <td style="width: 33.33%; text-align: center;">Email: support@avorex.com</td>
        <td style="width: 33.33%; text-align: right;">Web: ${SITE_URL}</td>
      </tr>
    </table>`,
    { preheader: `Invoice confirmed: ${data.plan} License activated.`, brandName: brand, logoUrl: logoUrl, hideTopLogo: true }
  );

  return sendMail(to, `Payment Invoice — ${brand} License`, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. ROLE CHANGED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendRoleChangedEmail(to: string, data: { userName: string; oldRole: string; newRole: string; changedBy: string }): Promise<boolean> {
  const html = wrap("Role Updated",
    sectionIcon("👤", "#8b5cf6") +
    badge("ROLE UPDATED", "#8b5cf6") +
    heading("Your role has been updated") +
    subtext(`Hi ${data.userName}, <strong style="color:#0f172a;font-weight:700;">${data.changedBy}</strong> has updated your role within the team.`) +
    divider() +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
<td style="text-align:center;padding:20px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;width:42%;">
<p style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 8px 0;font-family:'SF Pro Display',sans-serif;">Previous</p>
<p style="color:#475569;font-size:16px;font-weight:700;margin:0;text-transform:capitalize;font-family:'SF Pro Display',sans-serif;">${data.oldRole}</p>
</td>
<td style="text-align:center;color:#cbd5e1;font-size:20px;padding:0 8px;">→</td>
<td style="text-align:center;padding:20px 16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;width:42%;">
<p style="color:#6d28d9;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 8px 0;font-family:'SF Pro Display',sans-serif;">New</p>
<p style="color:#7c3aed;font-size:16px;font-weight:700;margin:0;text-transform:capitalize;font-family:'SF Pro Display',sans-serif;">${data.newRole}</p>
</td></tr></table>` +
    btn("Open Dashboard", `${SITE_URL}/dashboard`, "#8b5cf6"),
    { preheader: `Your role was changed from ${data.oldRole} to ${data.newRole}.` }
  );
  return sendMail(to, "Role Updated — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. MEMBER JOINED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendMemberJoinedEmail(to: string, data: { adminName: string; memberName: string; memberEmail: string; role: string }): Promise<boolean> {
  const html = wrap("New Team Member",
    sectionIcon("🤝", "#6366f1") +
    badge("TEAM UPDATE", "#6366f1") +
    heading("New team member") +
    subtext(`<strong style="color:#0f172a;font-weight:700;">${data.memberName}</strong> (${data.memberEmail}) has joined your team as <strong style="color:#7c3aed;font-weight:700;text-transform:capitalize;">${data.role}</strong>.`) +
    btn("View Team", `${SITE_URL}/settings`, "#6366f1"),
    { preheader: `${data.memberName} joined your team as ${data.role}.` }
  );
  return sendMail(to, "New Team Member — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. MEMBER REMOVED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendMemberRemovedEmail(to: string, data: { userName: string; removedBy: string; teamName: string }): Promise<boolean> {
  const html = wrap("Removed from Team",
    sectionIcon("👤", "#ef4444") +
    badge("TEAM UPDATE", "#ef4444") +
    heading("Removed from team") +
    subtext(`Hi ${data.userName}, you have been removed from <strong style="color:#0f172a;font-weight:700;">${data.teamName}</strong> by <strong style="color:#0f172a;font-weight:700;">${data.removedBy}</strong>.`) +
    divider() +
    `<p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 28px;text-align:center;">You can still sign in to your account. A personal workspace has been created for you.</p>` +
    btn("Go to Dashboard", `${SITE_URL}/dashboard`, "#ef4444"),
    { preheader: `You have been removed from ${data.teamName}.` }
  );
  return sendMail(to, "Removed from Team — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 14. PLAN CHANGED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendPlanChangedEmail(to: string, data: { userName: string; oldPlan: string; newPlan: string; changeType: "upgrade" | "downgrade" }): Promise<boolean> {
  const isUp = data.changeType === "upgrade";
  const color = isUp ? "#22c55e" : "#f59e0b";
  const icon = isUp ? "🚀" : "📋";
  const label = isUp ? "PLAN UPGRADED" : "PLAN CHANGED";

  const html = wrap("Plan Changed",
    sectionIcon(icon, color) +
    badge(label, color) +
    heading(isUp ? "Your plan has been upgraded!" : "Your plan has been changed") +
    subtext(`Hi ${data.userName}, your plan has been changed from <strong style="color:#0f172a;font-weight:700;">${data.oldPlan}</strong> to <strong style="color:${color};font-weight:700;">${data.newPlan}</strong>.`) +
    divider() +
    infoCard(
      infoRow("Previous Plan", data.oldPlan) +
      infoRow("New Plan", data.newPlan, { color })
    ) +
    btn("Open Dashboard", `${SITE_URL}/dashboard`, color),
    { preheader: `Your plan changed from ${data.oldPlan} to ${data.newPlan}.` }
  );
  return sendMail(to, `${isUp ? "Plan Upgraded" : "Plan Changed"} — ${BRAND_NAME}`, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 15. DEVICE CHANGED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendDeviceChangedEmail(to: string, data: { userName: string; device: string; changeTime: string; ip?: string }): Promise<boolean> {
  const html = wrap("Device Changed",
    sectionIcon("📱", "#f59e0b") +
    badge("SECURITY UPDATE", "#f59e0b") +
    heading("Device binding updated") +
    subtext(`Hi ${data.userName}, the device associated with your ${BRAND_NAME} license has been changed.`) +
    divider() +
    infoCard(
      infoRow("New Device", data.device) +
      infoRow("Time", new Date(data.changeTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })) +
      (data.ip ? infoRow("IP Address", data.ip, { mono: true }) : "")
    ) +
    securityFooter(),
    { preheader: "Your device binding was changed." }
  );
  return sendMail(to, "Device Changed — " + BRAND_NAME, html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 16. WEEKLY DIGEST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendWeeklyDigestEmail(to: string, data: { userName: string; weekStart: string; weekEnd: string; stats: { messagesHandled: number; contactsAdded: number; broadcastsSent: number; automationsRan: number }; licenseExpiresIn: number | null }): Promise<boolean> {
  const statCard = (label: string, value: number | string, color: string) =>
    `<td style="width:25%;text-align:center;padding:6px 4px;">
<div style="padding:18px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
<p style="color:${color};font-size:28px;font-weight:800;margin:0;font-family:'SF Pro Display',sans-serif;">${value}</p>
<p style="color:#64748b;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:8px 0 0;font-family:'SF Pro Display',sans-serif;">${label}</p>
</div></td>`;

  const html = wrap("Weekly Digest",
    sectionIcon("📊", "#4f46e5") +
    badge("WEEKLY DIGEST", "#4f46e5") +
    heading("Your week in review") +
    subtext(`Hi ${data.userName}, here's a summary of your ${BRAND_NAME} activity over the past 7 days.`) +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
${statCard("Messages", data.stats.messagesHandled, "#4f46e5")}
${statCard("Contacts", data.stats.contactsAdded, "#22c55e")}
${statCard("Broadcasts", data.stats.broadcastsSent, "#f59e0b")}
${statCard("Automations", data.stats.automationsRan, "#7c3aed")}
</tr></table>` +
    (data.licenseExpiresIn !== null ? `${divider()}<div style="padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-align:center;margin-bottom:4px;">
<p style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 8px 0;font-family:'SF Pro Display',sans-serif;">License Status</p>
<p style="color:#334155;font-size:14px;font-weight:600;margin:0;font-family:'SF Pro Display',sans-serif;">${data.licenseExpiresIn > 0 ? `Expires in <span style="color:${data.licenseExpiresIn <= 7 ? "#d97706" : "#16a34a"};font-weight:700;">${data.licenseExpiresIn} days</span>` : '<span style="color:#dc2626;font-weight:700;">Expired</span>'}</p>
</div>` : "") +
    btn("Open Dashboard", `${SITE_URL}/dashboard`, "#4f46e5"),
    { preheader: `This week: ${data.stats.messagesHandled} messages, ${data.stats.contactsAdded} contacts, ${data.stats.broadcastsSent} broadcasts.` }
  );
  return sendMail(to, "Your Weekly " + BRAND_NAME + " Digest", html);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 17. VERIFICATION CODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const html = wrap("Verify Your Email",
    sectionIcon("✉️", "#4f46e5") +
    badge("VERIFY EMAIL", "#4f46e5") +
    heading("Verify your email") +
    subtext("Use the following verification code to confirm your email address.") +
    `<div style="text-align:center;margin:28px 0;">
<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr>
${code.split("").map(d => `<td style="width:52px;height:64px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;text-align:center;vertical-align:middle;padding:0 4px;">
<span style="color:#4c1d95;font-size:28px;font-weight:800;line-height:64px;font-family:'SF Mono','SF Pro Display',monospace;">${d}</span>
</td>`).join('<td style="width:8px;"></td>')}
</tr></table></div>` +
    `<p style="color:#64748b;font-size:12px;line-height:1.6;margin:20px 0 0;text-align:center;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    { preheader: `Your ${BRAND_NAME} verification code: ${code}` }
  );
  const sent = await sendMail(email, "Verify Your Email — " + BRAND_NAME, html);
  return sent ? { success: true } : { success: false, error: "Failed to send" };
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BASE SEND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "noreply@avorex.com";

  if (resendApiKey) {
    try {
      console.log(`[Email] Attempting to send "${subject}" to ${to} via Resend...`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `"${BRAND_NAME}" <${fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
      });

      if (response.ok) {
        console.log(`[Email] Successfully sent "${subject}" to ${to} via Resend.`);
        return true;
      }

      const errText = await response.text();
      console.error(`[Email] Resend API returned error status: ${response.status}. Details: ${errText}`);
    } catch (err) {
      console.error(`[Email] Resend API exception while sending "${subject}" to ${to}:`, err);
    }
    
    console.log(`[Email] Falling back to Gmail SMTP to send "${subject}" to ${to}...`);
  }

  try {
    await transporter.sendMail({
      from: `"${BRAND_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`[Email] Gmail SMTP fallback failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}
