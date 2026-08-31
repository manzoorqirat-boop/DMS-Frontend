import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";

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

  return <Outlet />;
}
