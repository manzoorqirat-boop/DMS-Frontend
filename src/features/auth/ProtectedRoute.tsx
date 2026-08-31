import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";

/** The one screen reachable while a password change is outstanding. */
const CHANGE_PASSWORD_PATH = "/settings/password";

/**
 * Gates every route nested under it on a live session, redirecting to /login otherwise and
 * remembering where the person was headed so login can send them back rather than always
 * landing on the default screen.
 * <p>
 * This is a convenience for navigation, not the actual access control — every real permission
 * check happens server-side, per request, against the database (see IAccessControl). A route
 * hidden here that the API would still refuse is the correct default; a route shown here that
 * the API would refuse is merely a worse experience, not a security gap, because the API is
 * where enforcement actually lives.
 * <p>
 * The forced-password-change lock below is the exception worth understanding. A newly created
 * account has a password its administrator chose and therefore knows — and in this system the
 * password is also the e-signature credential. Until the holder has replaced it, that
 * credential is shared, so the account must not be able to reach anything it could sign, view
 * or distribute. Hence a hard lock to the change screen rather than a redirect the user can
 * navigate away from. This mirrors the ERES build's behaviour for the same reason.
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Deliberately quiet — this only shows for the instant it takes to check sessionStorage on
    // first load, not worth a full skeleton screen.
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Already on the change screen: let it render, or there'd be nowhere to satisfy the
  // requirement from.
  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  return <Outlet />;
}
