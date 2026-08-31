/**
 * Mirrors Dms.Application.Access.PasswordPolicyDtos.
 */

export interface PasswordPolicyView {
  minimumLength: number;
  /** Days before a password must be changed. Zero means never. */
  expiryDays: number;
  /** How many previous passwords may not be reused. */
  historyCount: number;
  maxFailedAttempts: number;
  lockoutMinutes: number;
  /** Requires an uppercase letter, a digit and a symbol. */
  requireComplexity: boolean;
  updatedBy: string;
  updatedAt: string;
}

/**
 * Every value is clamped server-side rather than rejected, so a typo yields a sane policy
 * instead of a 400 — which means the response may not equal what was sent. Always render the
 * returned policy rather than assuming the request took effect verbatim.
 */
export interface UpdatePasswordPolicyRequest {
  minimumLength: number;
  expiryDays: number;
  historyCount: number;
  maxFailedAttempts: number;
  lockoutMinutes: number;
  requireComplexity: boolean;
}

/**
 * The rules, phrased for someone about to type a password. Derived on the client because the
 * backend returns the policy as numbers, and a list of plain sentences is what the change
 * screen actually needs to show.
 */
export function describePolicy(policy: PasswordPolicyView): string[] {
  const rules = [`At least ${policy.minimumLength} characters`];

  if (policy.requireComplexity) {
    rules.push("At least one uppercase letter", "At least one number", "At least one special character");
  }

  rules.push(`Cannot reuse your last ${policy.historyCount} password${policy.historyCount === 1 ? "" : "s"}`);

  if (policy.expiryDays > 0) {
    rules.push(`Must be changed every ${policy.expiryDays} days`);
  }

  return rules;
}
