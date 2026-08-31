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
}

export interface CreateUserRequest {
  userName: string;
  fullName: string;
  department: string;
  designation: string;
  password: string;
}

/** Body of POST /api/users/me/change-password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
