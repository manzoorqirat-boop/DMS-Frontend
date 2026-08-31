/**
 * Mirrors Dms.Application.Signing.SigningDtos (CreateUserRequest, UserSummary). Note:
 * UserService.cs on the backend carries its own header noting it was reconstructed after
 * going missing from the repo — the DTOs below are the part independently verified (they're
 * shared with SigningDtos.cs, which has no such caveat).
 */
export interface UserSummary {
  id: string;
  userName: string;
  fullName: string;
  department: string;
  designation: string;
  isActive: boolean;
  isLockedOut: boolean;
  /** Optional payroll-backed identifier; see CreateUserRequest. */
  employeeId: string | null;
  /** True while the account still has a password its administrator set. */
  mustChangePassword: boolean;
  passwordLastChanged: string;
}

export interface CreateUserRequest {
  userName: string;
  fullName: string;
  department: string;
  designation: string;
  password: string;
  /**
   * Optional staff/employee number. §11.100(b) asks that an individual's identity be verified
   * before their electronic signature is issued; a payroll-backed identifier ties the account
   * to a verified person rather than to a login someone created.
   */
  employeeId?: string | null;
}

/** Body of POST /api/users/me/change-password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
