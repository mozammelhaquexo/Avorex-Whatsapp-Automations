import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "wacrm-default-license-key-32ch!";

/**
 * Generate a license key in format AVX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const segment = () =>
    crypto.randomBytes(2).toString("hex").toUpperCase();
  return `AVX-${segment()}-${segment()}-${segment()}`;
}

/**
 * Encrypt a license key for secure storage
 */
export function encryptLicenseKey(key: string): string {
  const iv = crypto.randomBytes(16);
  const keyBuf = crypto.scryptSync(ENCRYPTION_KEY, "license-salt", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  let encrypted = cipher.update(key, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a license key
 */
export function decryptLicenseKey(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const keyBuf = crypto.scryptSync(ENCRYPTION_KEY, "license-salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Calculate expiry date from duration string
 */
export function calculateExpiryDate(
  duration: string,
  startDate: Date = new Date()
): Date | null {
  const start = new Date(startDate);

  switch (duration) {
    case "7 Days":
      start.setDate(start.getDate() + 7);
      return start;
    case "1 Month":
    case "30 Days":
      start.setDate(start.getDate() + 30);
      return start;
    case "3 Months":
    case "90 Days":
      start.setDate(start.getDate() + 90);
      return start;
    case "6 Months":
    case "180 Days":
      start.setDate(start.getDate() + 180);
      return start;
    case "12 Months":
    case "1 Year":
      start.setFullYear(start.getFullYear() + 1);
      return start;
    case "Lifetime":
      // Set to 100 years from now (effectively never expires)
      start.setFullYear(start.getFullYear() + 100);
      return start;
    case "Custom":
      return null; // Must be set manually
    default:
      start.setDate(start.getDate() + 30);
      return start;
  }
}

/**
 * Get remaining days between now and an expiry date
 */
export function getRemainingDays(expiryDate: string | Date | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a license is expired
 */
export function isLicenseExpired(expiryDate: string | Date | null): boolean {
  if (!expiryDate) return false; // No expiry = never expires
  return new Date(expiryDate) < new Date();
}

/**
 * Check if account is in grace period
 */
export function isInGracePeriod(
  expiresAt: string | Date | null,
  gracePeriodEndsAt: string | Date | null
): boolean {
  if (!expiresAt || !gracePeriodEndsAt) return false;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const graceEnd = new Date(gracePeriodEndsAt);
  return now > expiry && now <= graceEnd;
}

/**
 * Format remaining time as human-readable string
 */
export function formatRemainingTime(days: number | null): string {
  if (days === null) return "No expiry";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day remaining";
  if (days < 30) return `${days} days remaining`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} month${months > 1 ? "s" : ""} remaining`;
    return `${months}m ${remainingDays}d remaining`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} remaining`;
}

/**
 * Mask a license key for display (e.g., AVX-XXXX-XXXX-XXXX → AVX-••••-••••-XXXX)
 */
export function maskLicenseKey(key: string): string {
  const parts = key.split("-");
  if (parts.length !== 4) return key;
  return `${parts[0]}-••••-••••-${parts[3]}`;
}

/**
 * Default menus per package code
 */
export const PACKAGE_MENUS: Record<string, string[]> = {
  Standard: ["dashboard", "inbox", "notifications", "contacts"],
  Starter: ["dashboard", "inbox", "notifications", "contacts"],
  Premium: [
    "dashboard",
    "inbox",
    "notifications",
    "contacts",
    "pipelines",
    "broadcasts",
    "automations",
    "flows",
  ],
  Enterprise: [
    "dashboard",
    "inbox",
    "notifications",
    "contacts",
    "pipelines",
    "broadcasts",
    "automations",
    "flows",
    "agents",
  ],
  Max: [
    "dashboard",
    "inbox",
    "notifications",
    "contacts",
    "pipelines",
    "broadcasts",
    "automations",
    "flows",
    "agents",
  ],
};

/**
 * Get allowed menus for a given plan
 */
export function getAllowedMenus(plan: string | null): string[] {
  if (!plan) return [];
  return PACKAGE_MENUS[plan] || PACKAGE_MENUS["Starter"];
}

/**
 * All available sidebar menu items
 */
export const ALL_SIDEBAR_MENUS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "inbox", label: "Inbox" },
  { id: "notifications", label: "Notifications" },
  { id: "contacts", label: "Contacts" },
  { id: "pipelines", label: "Pipelines" },
  { id: "broadcasts", label: "Broadcasts" },
  { id: "automations", label: "Automations" },
  { id: "flows", label: "Flows" },
  { id: "agents", label: "AI Agents" },
];
