import { apiFetch } from "@/lib/api-client";
import type { PasswordPolicyView, UpdatePasswordPolicyRequest } from "@/types/password-policy";

/**
 * GET /api/password-policy
 *
 * Open to any authenticated caller, deliberately: the change-password screen has to state the
 * rules before someone types, not after they've had a password rejected.
 */
export function getPasswordPolicy(): Promise<PasswordPolicyView> {
  return apiFetch<PasswordPolicyView>("/api/password-policy");
}

/** PUT /api/password-policy — requires UserManage. */
export function updatePasswordPolicy(
  request: UpdatePasswordPolicyRequest,
): Promise<PasswordPolicyView> {
  return apiFetch<PasswordPolicyView>("/api/password-policy", { method: "PUT", body: request });
}
