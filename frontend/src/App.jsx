import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/store';
import { initSocket } from './services/socket';
import ProtectedRoute, { ROLE_HOME } from './hooks/ProtectedRoute';
import Layout from './components/Layout';
import './styles/globals.css';

// ── Public Pages ──────────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const RegistrationStatus = lazy(() => import('./pages/RegistrationStatus'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// ── Team Portal ───────────────────────────────────────────────
const TeamDashboard = lazy(() => import('./pages/team/Dashboard'));
const TeamLeaderboard = lazy(() => import('./pages/team/Leaderboard'));

// ── Competition Admin Portal ──────────────────────────────────
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminRegistrations = lazy(() => import('./pages/admin/Registrations'));
const AdminRegistrationDetail = lazy(() => import('./pages/admin/RegistrationDetail'));
const AdminCompetitions = lazy(() => import('./pages/admin/Competitions'));
const AdminTasks = lazy(() => import('./pages/admin/Tasks'));
const AdminTaskDetail = lazy(() => import('./pages/admin/TaskDetail'));
const AdminTeams = lazy(() => import('./pages/admin/Teams'));

// ── Finance Admin Portal ──────────────────────────────────────
const FinanceDashboard = lazy(() => import('./pages/finance/Dashboard'));

// ── Super Admin Portal ────────────────────────────────────────
const SuperDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const SuperUsers = lazy(() => import('./pages/superadmin/Users'));
const SuperCompetitions = lazy(() => import('./pages/superadmin/Competitions'));

// ── Judge Portal ──────────────────────────────────────────────
const JudgeDashboard = lazy(() => import('./pages/judge/Dashboard'));

function Loader() {
  return (
    <div className="loading-page">
      <div className="spinner" />
      <span className="text-sm text-muted">Loading...</span>
    </div>
  );
}

function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

export default function App() {
  const { token } = useAuthStore();
  useEffect(() => { if (token) initSocket(); }, [token]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#fff', color: '#111', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontFamily: 'Outfit', fontWeight: 600, fontSize: '14px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* ── Public ─────────────────────────────────────── */}
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registration-status/:id" element={<RegistrationStatus />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ── Redirect based on role ──────────────────────── */}
          <Route path="/dashboard" element={<RoleRedirect />} />

          {/* ── Change Password (all roles) – Force on first login ─────────────────────── */}
          <Route path="/change-password" element={
            <ProtectedRoute skipTempPasswordCheck={true}>
              <Layout><ChangePassword /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Team Portal ─────────────────────────────────── */}
          <Route path="/team" element={
            <ProtectedRoute roles={['TEAM']}>
              <Layout><TeamDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/team/leaderboard" element={
            <ProtectedRoute roles={['TEAM']}>
              <Layout><TeamLeaderboard /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Competition Admin Portal ─────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/registrations" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminRegistrations /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/registrations/:id" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminRegistrationDetail /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/competitions" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminCompetitions /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/tasks" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminTasks /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/tasks/:id" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminTaskDetail /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/teams" element={
            <ProtectedRoute roles={['ADMIN_COMPETITION', 'SUPER_ADMIN']}>
              <Layout><AdminTeams /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Finance Admin Portal ─────────────────────────── */}
          <Route path="/finance" element={
            <ProtectedRoute roles={['ADMIN_FINANCE', 'SUPER_ADMIN']}>
              <Layout><FinanceDashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Super Admin Portal ───────────────────────────── */}
          <Route path="/superadmin" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <Layout><SuperDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/users" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <Layout><SuperUsers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/competitions" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <Layout><SuperCompetitions /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Judge Portal ─────────────────────────────────── */}
          <Route path="/judge" element={
            <ProtectedRoute roles={['JUDGE', 'SUPER_ADMIN', 'ADMIN_COMPETITION']}>
              <Layout><JudgeDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
