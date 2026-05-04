import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { userAPI } from '../../services/api';
import { competitionAPI } from '../../services/api';
import { motion } from 'framer-motion';
import { X, Check, Trash2, Power, Key, Plus, KeyRound } from 'lucide-react';

function UserModal({ user, competitions, onClose, onSaved }) {
  const [form, setForm] = useState(user || { name: '', email: '', role: 'ADMIN_COMPETITION', competition_id: '', password: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.email || !form.role) { toast.error('Fill all required fields'); return; }
    if (form.role === 'TEAM' && !form.competition_id) { toast.error('Select competition for Team user'); return; }
    setSaving(true);
    try {
      let res;
      if (user?.id) res = await userAPI.update(user.id, form);
      else res = await userAPI.create(form);
      
      if (!user?.id && res.data.tempPassword) {
        toast.success(
          <div style={{ padding: '4px' }}>
            User created!<br />
            Temp Password: <strong style={{ fontSize: 16, fontFamily: 'monospace', letterSpacing: 1 }}>{res.data.tempPassword}</strong>
            <br /><span style={{ fontSize: 11, opacity: 0.8 }}>Credentials are also sent to the user’s email. They must change password on first login.</span>
          </div>,
          { duration: 15000, icon: <KeyRound size={14} /> }
        );
      } else {
        toast.success('User updated!');
      }
      onSaved(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{user?.id ? 'Edit' : 'Create'} User</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., John Doe" /></div>
          <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@fmae.in" disabled={!!user?.id} /></div>
          {!user?.id && (
            <div className="form-group">
              <label className="form-label">Password (optional)</label>
              <input
                className="form-input"
                type="text"
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder="Leave empty to auto-generate"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-input form-select" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="ADMIN_COMPETITION">Competition Admin</option>
              <option value="ADMIN_FINANCE">Finance Admin</option>
              <option value="JUDGE">Judge</option>
              <option value="TEAM">Team</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assign Competition</label>
            <select className="form-input form-select" value={form.competition_id || ''} onChange={e => set('competition_id', e.target.value)}>
              <option value="">None (All Access)</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperUsers() {
  const [users, setUsers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ role: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [acting, setActing] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([userAPI.getAll(filter), competitionAPI.getAllAdmin()])
      .then(([u, c]) => { setUsers(u.data.users || []); setTotal(u.data.total); setCompetitions(c.data.competitions || []); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const toggle = async (id) => {
    setActing(id);
    try { await userAPI.toggleActive(id); toast.success('User status updated'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(''); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    setActing(id + '-del');
    try { await userAPI.delete(id); toast.success('User deleted'); load(); }
    catch { toast.error('Failed'); }
    finally { setActing(''); }
  };

  const resetPw = async (id) => {
    if (!window.confirm('Send password reset email to this user?')) return;
    setActing(id + '-pw');
    try { 
      const res = await userAPI.resetPassword(id); 
      if (res.data.tempPassword) {
        toast.success(
          <div style={{ padding: '4px' }}>
            Password reset!<br />
            New Password: <strong style={{ fontSize: 16, fontFamily: 'monospace', letterSpacing: 1 }}>{res.data.tempPassword}</strong>
          </div>,
          { duration: 15000, icon: <KeyRound size={14} /> }
        );
      } else {
        toast.success('Reset email sent'); 
      }
      load(); 
    }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(''); }
  };

  const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', ADMIN_COMPETITION: 'Comp Admin', ADMIN_FINANCE: 'Finance Admin', TEAM: 'Team', JUDGE: 'Judge' };
  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;
  const teamCount = users.filter(u => u.role === 'TEAM').length;

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/quad_class_1777731958474.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', height: 190, marginBottom: -28, overflow: 'hidden' }}>
        <img src="/images/feature-1.png" alt="Users Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 46, left: 28, right: 28 }}>
          <div className="badge badge-published" style={{ marginBottom: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none' }}>Super Admin</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#000' }}>User Management</h1>
        </div>
      </div>
      <div className="container" style={{ maxWidth: 1280 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: total },
          { label: 'Active Users', value: activeCount },
          { label: 'Inactive Users', value: inactiveCount },
          { label: 'Team Accounts', value: teamCount },
        ].map((s) => (
          <div key={s.label} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="text-uppercase text-muted mb-8">Super Admin</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>User Management ({total})</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Create User
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search name / email…"
          value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select className="form-input form-select" style={{ maxWidth: 160 }} value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
          <option value="">All Roles</option>
          <option value="ADMIN_COMPETITION">Competition Admin</option>
          <option value="ADMIN_FINANCE">Finance Admin</option>
          <option value="JUDGE">Judge</option>
          <option value="TEAM">Team</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Competition</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name} {u.is_temp_password && <span style={{ fontSize: 10, color: 'var(--warning)' }}>TEMP PW</span>}</td>
                  <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>{u.email}</td>
                  <td><span className="badge badge-ev" style={{ fontSize: 10 }}>{ROLE_LABEL[u.role]}</span></td>
                  <td style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{u.competition_code || '—'}</td>
                  <td><span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal(u)}>Edit</button>
                      <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggle(u.id)} disabled={acting === u.id} title={u.is_active ? 'Deactivate' : 'Activate'}>
                        <Power size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => resetPw(u.id)} disabled={acting === u.id + '-pw'} title="Reset Password">
                        <Key size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(u.id)} disabled={acting === u.id + '-del'} title="Delete User">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal !== null && <UserModal user={modal.id ? modal : null} competitions={competitions} onClose={() => setModal(null)} onSaved={load} />}
      </div>
    </div>
  );
}
