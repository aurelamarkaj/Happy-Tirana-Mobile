import { z } from 'zod';

export const roleSchema = z.enum(['RIDER', 'BUSINESS', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;

// server.ts:2527 (RIDER), :2478 (BUSINESS). Password is never trimmed.
export function loginSchema(role: Role) {
  return z.object({
    email: z.string().trim().email('Shkruaj një email të vlefshëm.'),
    password: z.string().min(role === 'RIDER' ? 4 : 6,
      `Fjalëkalimi duhet të ketë të paktën ${role === 'RIDER' ? 4 : 6} karaktere.`),
  });
}
export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;

// Minimal account fields from mapRiderProfile/mapBusinessSession in server.ts.
// Do not import browser session modules (localStorage).
export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  token: z.string().min(1),
});
export const sessionSchema = z.object({
  role: roleSchema,
  account: accountSchema,
});
export type Session = z.infer<typeof sessionSchema>;

// Existing opaque HMAC token: id.expiry.signature[.version], not a JWT.
// This check only avoids restoring expired data. API remains authoritative.
export function sessionExpired(session: Session, now = Date.now()): boolean {
  const parts = session.account.token.split('.');
  const expiry = Number(parts[1]);
  return parts[0] !== session.account.id || !Number.isInteger(expiry) || expiry * 1000 <= now;
}
