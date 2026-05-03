import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/store';

// Redirect to correct portal based on role
const ROLE_HOME = {
  SUPER_ADMIN: '/superadmin',
  ADMIN_COMPETITION: '/admin',
  ADMIN_FINANCE: '/finance',
  TEAM: '/team',
  JUDGE: '/judge',
};

export default function ProtectedRoute({ children, roles, skipTempPasswordCheck = false }) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force password change if using temporary password (except on /change-password page)
  if (user.is_temp_password && !skipTempPasswordCheck && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" state={{ from: location, reason: 'temp_password' }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const home = ROLE_HOME[user.role] || '/login';
    return <Navigate to={home} replace />;
  }

  return children;
}

export { ROLE_HOME };
