/**
 * shieldcn
 * lib/email.ts
 *
 * Transactional email via Resend. Used by the Better Auth flows
 * (password reset, email verification). Kept intentionally small: one Resend
 * client, a couple of branded HTML templates, and a single send() that never
 * throws — a mail failure must not break an auth request.
 *
 * Configured via env:
 *   RESEND_API_KEY   — Resend API key (unset in local dev; sends are skipped)
 *   EMAIL_FROM       — verified sender, e.g. "shieldcn <noreply@shieldcn.dev>"
 */

import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM || "shieldcn <noreply@shieldcn.dev>"
const SITE = process.env.NEXT_PUBLIC_URL || "https://shieldcn.dev"

// Lazily construct the client so a missing key doesn't crash module load
// (local dev / build without email configured). Sends are skipped when unset.
const resend = apiKey ? new Resend(apiKey) : null

export interface SendArgs {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Send an email, best-effort. Never throws — returns false on failure or when
 * email isn't configured, so the caller (an auth flow) is never blocked.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  if (!resend) {
    // Not configured (e.g. local dev). Log so devs can grab the link from stdout.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:skipped] to=${to} subject="${subject}"\n${text}`)
    }
    return false
  }
  try {
    const { error } = await resend.emails.send({ from, to, subject, html, text })
    if (error) {
      console.error("[email] send failed:", error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[email] send threw:", e instanceof Error ? e.message : e)
    return false
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

/** Shared shell: dark, minimal, matches the shieldcn aesthetic. */
function shell(heading: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#09090b;color:#e4e4e7;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#111113;border:1px solid #27272a;border-radius:12px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:-0.01em;color:#fafafa;">shieldcn</p>
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;letter-spacing:-0.02em;color:#fafafa;">${heading}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${body}</p>
            <a href="${cta.url}" style="display:inline-block;background:#fafafa;color:#09090b;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">${cta.label}</a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;">Or paste this link into your browser:<br><a href="${cta.url}" style="color:#a1a1aa;word-break:break-all;">${cta.url}</a></p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#52525b;"><a href="${SITE}" style="color:#71717a;text-decoration:none;">${SITE.replace(/^https?:\/\//, "")}</a></p>
      </td></tr>
    </table>
  </body>
</html>`
}

export function resetPasswordEmail(url: string): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your shieldcn password",
    html: shell(
      "Reset your password",
      "We got a request to reset your shieldcn password. Click below to choose a new one. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
      { label: "Reset password", url },
    ),
    text: `Reset your shieldcn password:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  }
}

export function verifyEmail(url: string): { subject: string; html: string; text: string } {
  return {
    subject: "Verify your email for shieldcn",
    html: shell(
      "Verify your email",
      "Confirm your email address to secure your shieldcn account. Click below to verify.",
      { label: "Verify email", url },
    ),
    text: `Verify your email for shieldcn:\n${url}`,
  }
}
