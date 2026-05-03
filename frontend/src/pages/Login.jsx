import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { ROLE_HOME } from '../hooks/ProtectedRoute';
import {
  Key, ArrowRight, Shield, Users, Eye, EyeOff,
  Mail, Lock, UserPlus
} from 'lucide-react';

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin', icon: Shield, color: '#111111', desc: 'Full platform authority' },
  { id: 'ADMIN_COMPETITION', label: 'Admin', icon: Users, color: '#222222', desc: 'Competition management' },
  { id: 'ADMIN_FINANCE', label: 'Finance', icon: Key, color: '#333333', desc: 'Finance & payments' },
  { id: 'JUDGE', label: 'Judge', icon: Shield, color: '#444444', desc: 'Score & evaluate' },
  { id: 'TEAM', label: 'Team', icon: Users, color: '#555555', desc: 'Team portal' },
];

export default function Login() {
  const [loginMode, setLoginMode] = useState('super-admin'); // 'super-admin' | 'team'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter email and password');
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      setAuth(data.user, data.token, data.refreshToken);
      toast.success(`Welcome back, ${data.user.name}!`);
      const home = ROLE_HOME[data.user.role] || '/';
      navigate(home);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const { data } = await authAPI.firebaseAuth({ idToken, expectedRole: 'SUPER_ADMIN' });
      setAuth(data.user, data.token, data.refreshToken);
      if (data.generatedPassword) {
        toast.success(`Account created! Default password: ${data.generatedPassword}`, {
          duration: 10000,
          icon: <Key size={20} color="#000" />,
        });
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
      }
      const home = ROLE_HOME[data.user.role] || '/';
      navigate(home);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = loginMode === 'super-admin';

  // Animated particles data
  const particles = Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 37 + 11) % 100}%`,
    top: `${(i * 53 + 7) % 100}%`,
    size: 2 + (i % 4),
    opacity: 0.04 + (i % 5) * 0.015,
    duration: 3 + (i % 5),
    delay: i * 0.3,
  }));

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Animated background ──────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {/* Hero image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/login-bg.png)',
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.45, filter: 'grayscale(100%) contrast(110%)',
        }} />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.9) 100%)',
        }} />
        {/* Decorative orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '10%', left: '10%',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 70%)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '10%', right: '8%',
            width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Floating dots */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            animate={{ y: [-8, 8, -8], opacity: [p.opacity, p.opacity * 2, p.opacity] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
            style={{
              position: 'absolute', left: p.left, top: p.top,
              width: p.size, height: p.size,
              borderRadius: '50%', background: '#000',
            }}
          />
        ))}
      </div>

      {/* ── Main login card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 460,
          margin: '24px',
          borderRadius: 22,
          padding: '40px 38px 36px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)',
          position: 'relative', zIndex: 1,
        }}
      >
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 92, marginBottom: 18 }}>
          <img src="/images/feature-1.png" alt="Login visual" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(112%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.2) 70%)' }} />
          <div style={{ position: 'absolute', left: 12, bottom: 10, color: '#fff' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase', opacity: 0.9 }}>FMAE Access</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Portal Sign In</div>
          </div>
        </div>

        {/* ── Top nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            textDecoration: 'none', color: 'rgba(0,0,0,0.6)',
            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0,0,0,0.6)'}
          >
            <ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} />
            Back to Home
          </Link>
          <motion.div
            whileHover={{ x: 2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            <Link to="/register" style={{
              fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
              textDecoration: 'none', letterSpacing: 0.5,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <UserPlus size={13} />
              Team Registration
            </Link>
          </motion.div>
        </div>

        {/* ── Heading ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: '#000', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 500 }}>
            {isSuperAdmin
              ? 'Sign in with your Super Admin credentials'
              : 'Enter your assigned credentials to access your portal'}
          </p>
        </div>

        {/* ── Mode Toggle ── */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 28,
          padding: 5,
          background: 'rgba(0,0,0,0.03)',
          borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          {[
            { id: 'super-admin', label: 'Super Admin', icon: Shield },
            { id: 'team', label: 'Team / Staff', icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const active = loginMode === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => { setLoginMode(id); setEmail(''); setPassword(''); setShowPass(false); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 700,
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: active ? '#000' : 'transparent',
                  color: active ? '#fff' : 'rgba(0,0,0,0.65)',
                  transition: 'all 0.25s ease',
                  boxShadow: active ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <Icon size={13} />
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* ── Form content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={loginMode}
            initial={{ opacity: 0, x: isSuperAdmin ? -16 : 16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: isSuperAdmin ? 16 : -16, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {/* ── Google Sign-In (Super Admin only) ── */}
            {isSuperAdmin && (
              <>
                <motion.button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  whileHover={{ scale: 1.015, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', padding: '13px 20px', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14,
                    background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#000',
                    marginBottom: 20, transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontWeight: 700, letterSpacing: 1 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
                </div>
              </>
            )}

            {/* ── Email/Password form ── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email field */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'rgba(0,0,0,0.55)', marginBottom: 7,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{
                    position: 'absolute', left: 13, top: '50%',
                    transform: 'translateY(-50%)', color: focusedField === 'email' ? '#000' : 'rgba(0,0,0,0.3)',
                    transition: 'color 0.2s', pointerEvents: 'none',
                  }} />
                  <input
                    type="email"
                    id="login-email"
                    placeholder={isSuperAdmin ? 'superadmin@fmae.org' : 'your.email@fmae.org'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="email"
                    style={{
                      width: '100%', padding: '12px 14px 12px 38px', fontSize: 14,
                      border: `1.5px solid ${focusedField === 'email' ? '#000' : 'rgba(0,0,0,0.10)'}`,
                      borderRadius: 12, background: focusedField === 'email' ? '#fff' : '#fafafa',
                      outline: 'none', fontFamily: 'inherit', color: '#000',
                      boxShadow: focusedField === 'email' ? '0 0 0 4px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'rgba(0,0,0,0.55)', marginBottom: 7,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 13, top: '50%',
                    transform: 'translateY(-50%)', color: focusedField === 'password' ? '#000' : 'rgba(0,0,0,0.3)',
                    transition: 'color 0.2s', pointerEvents: 'none',
                  }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    id="login-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="current-password"
                    style={{
                      width: '100%', padding: '12px 42px 12px 38px', fontSize: 14,
                      border: `1.5px solid ${focusedField === 'password' ? '#000' : 'rgba(0,0,0,0.10)'}`,
                      borderRadius: 12, background: focusedField === 'password' ? '#fff' : '#fafafa',
                      outline: 'none', fontFamily: 'inherit', color: '#000',
                      boxShadow: focusedField === 'password' ? '0 0 0 4px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.35)',
                      padding: 4, display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
                <Link to="/forgot-password" style={{
                  fontSize: 12, color: 'rgba(0,0,0,0.55)', fontWeight: 600,
                  textDecoration: 'none', letterSpacing: 0.2,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                style={{
                  marginTop: 4, padding: '14px 20px', fontSize: 15,
                  background: loading ? 'rgba(0,0,0,0.6)' : '#000',
                  color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 17, height: 17,
                      border: '2px solid rgba(255,255,255,0.25)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.75s linear infinite', display: 'inline-block',
                    }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0px 1000px #fafafa inset;
          -webkit-text-fill-color: #000;
        }
      `}</style>
    </div>
  );
}