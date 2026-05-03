import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';

function PasswordStrengthMeter({ password }) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*]/.test(password)) strength++;

  const levels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981'];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              background: i < strength ? colors[strength - 1] : '#e5e7eb',
              borderRadius: 2,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: colors[Math.max(0, strength - 1)], fontWeight: 600 }}>
        {levels[strength - 1] || 'No password'}
      </div>
    </div>
  );
}

function PasswordRequirements({ password, confirmPassword }) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    match: password && confirmPassword && password === confirmPassword,
  };

  return (
    <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: checks.length ? '#10b981' : '#ef4444' }}>
          {checks.length ? '[OK]' : '[NEED]'}
        </span>
        At least 8 characters
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: checks.uppercase ? '#10b981' : '#ef4444' }}>
          {checks.uppercase ? '[OK]' : '[NEED]'}
        </span>
        One uppercase letter
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: checks.lowercase ? '#10b981' : '#ef4444' }}>
          {checks.lowercase ? '[OK]' : '[NEED]'}
        </span>
        One lowercase letter
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: checks.numbers ? '#10b981' : '#ef4444' }}>
          {checks.numbers ? '[OK]' : '[NEED]'}
        </span>
        One number
      </div>
      {confirmPassword && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: checks.match ? '#10b981' : '#ef4444' }}>
            {checks.match ? '[OK]' : '[NO MATCH]'}
          </span>
          Passwords match
        </div>
      )}
    </div>
  );
}

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isTempPassword = user?.is_temp_password === true;
  const reason = location.state?.reason;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.newPassword || form.newPassword.length < 8) { 
      toast.error('New password must be at least 8 characters'); 
      return; 
    }
    if (!/[A-Z]/.test(form.newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(form.newPassword)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    if (!/\d/.test(form.newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }
    if (form.newPassword !== form.confirmPassword) { 
      toast.error('Passwords do not match'); 
      return; 
    }

    setSaving(true);
    try {
      await authAPI.changePassword({ 
        currentPassword: form.currentPassword, 
        newPassword: form.newPassword 
      });
      toast.success('Password changed successfully!');
      updateUser({ is_temp_password: false });
      
      // Redirect based on role if temp password was forced
      if (isTempPassword) {
        const roleHome = {
          SUPER_ADMIN: '/superadmin',
          ADMIN_COMPETITION: '/admin',
          ADMIN_FINANCE: '/finance',
          TEAM: '/team',
          JUDGE: '/judge',
        };
        navigate(roleHome[user?.role] || '/');
      } else {
        navigate(-1);
      }
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Failed to change password'); 
    }
    finally { setSaving(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 540 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}>
          {isTempPassword ? 'Set Your Password' : 'Change Password'}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.6)', lineHeight: 1.6 }}>
          {isTempPassword 
            ? 'You are using a temporary password. Please set a permanent password now to continue.'
            : 'Update your account password to something secure.'}
        </p>
      </div>

      {isTempPassword && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgb(59, 130, 246)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          fontSize: 13,
          color: 'rgb(30, 58, 138)',
          fontWeight: 500,
        }}>
          This is your first login. Setting a permanent password is required before you can access the system.
        </div>
      )}

      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 32 }}>
        <div className="form-group">
          <label className="form-label">Current Password *</label>
          <input
            className="form-input"
            type="password"
            value={form.currentPassword}
            onChange={e => set('currentPassword', e.target.value)}
            placeholder={isTempPassword ? 'Enter temporary password' : 'Enter current password'}
            required
          />
          {isTempPassword && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
              Use your temporary password
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">New Password *</label>
          <input
            className="form-input"
            type="password"
            value={form.newPassword}
            onChange={e => set('newPassword', e.target.value)}
            placeholder="Enter new password"
            required
          />
          {form.newPassword && (
            <>
              <PasswordStrengthMeter password={form.newPassword} />
              <div style={{ marginTop: 12 }} />
            </>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm New Password *</label>
          <input
            className="form-input"
            type="password"
            value={form.confirmPassword}
            onChange={e => set('confirmPassword', e.target.value)}
            placeholder="Repeat new password"
            required
          />
        </div>

        {form.newPassword && (
          <div style={{ background: '#f9fafb', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>
              Password Requirements
            </div>
            <PasswordRequirements password={form.newPassword} confirmPassword={form.confirmPassword} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? 'Setting Password...' : 'Set New Password'}
          </button>
          {!isTempPassword && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
