import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

export const ProtectedRoute = ({ children, role }: { children: ReactNode; role?: "admin" | "student" }) => {
  const { user, role: userRole, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (role && userRole !== role) return <Navigate to={userRole === "admin" ? "/admin" : "/dashboard"} replace />;
  return <>{children}</>;
};
