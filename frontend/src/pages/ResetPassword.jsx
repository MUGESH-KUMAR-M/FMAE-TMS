import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { ShieldCheck, Lock } from 'lucide-react';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, newPassword: form.newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (e) { toast.error(e.response?.data?.message || 'Invalid or expired link'); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit, sans-serif' }}>
      <div className="alert alert-danger" style={{ maxWidth: 400, borderRadius: 16 }}>
        Invalid or expired reset link. <Link to="/forgot-password" style={{ color: 'inherit', fontWeight: 700 }}>Request a new one.</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: 400, width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, padding: '48px 40px', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}>
        <div style={{ background: '#f8fafc', width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: 24 }}>
          <ShieldCheck size={32} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: -0.5, marginBottom: 8 }}>Reset Password</h1>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', fontWeight: 500, marginBottom: 32 }}>Secure your account with a new strong password.</p>
        
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 800 }}>New Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.2)' }} />
              <input className="form-input" style={{ paddingLeft: 48 }} type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min. 8 characters" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 800 }}>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.2)' }} />
              <input className="form-input" style={{ paddingLeft: 48 }} type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat password" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ height: 48, marginTop: 8 }}>
            {loading ? 'Resetting...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
