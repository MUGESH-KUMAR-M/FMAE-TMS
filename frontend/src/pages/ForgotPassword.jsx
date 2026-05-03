import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { ChevronLeft, Mail, Send } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try { await authAPI.forgotPassword(email); setSent(true); }
    catch { setSent(true); } // Always show success to prevent email enumeration
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: 400, width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, padding: '48px 32px', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}>
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: 2, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 800, marginBottom: 24 }}>
          <ChevronLeft size={14} /> Back to Login
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: -0.5, marginBottom: 8 }}>Recovery</h1>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', fontWeight: 500, marginBottom: 32 }}>Enter your email to receive a password reset link.</p>
        
        {!sent ? (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800 }}>Registered Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.2)' }} />
                <input className="form-input" style={{ paddingLeft: 48 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="team@college.edu" autoFocus />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ height: 48 }}>
              {loading ? 'Sending...' : 'Send Reset Link'} <Send size={16} style={{ marginLeft: 8 }} />
            </button>
          </form>
        ) : (
          <div style={{ marginTop: 24 }}>
            <div className="alert alert-success" style={{ borderRadius: 16, border: 'none', background: '#ecfdf5', color: '#065f46', padding: 20, fontWeight: 600 }}>
              If an account exists for this email, we've sent a recovery link. Please check your inbox.
            </div>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 24, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Return to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
