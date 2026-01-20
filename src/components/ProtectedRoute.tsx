import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, hasAccess } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !hasAccess(requiredRoles)) {
    return <Navigate to="/dashboard" replace />;  
  }

  return <>{children}</>;
};

export default ProtectedRoute;
