import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Plus, Power, Trash2, Users } from 'lucide-react';
import { userAPI, competitionAPI } from '../../services/api';
import { useAuthStore } from '../../context/store';

function TeamUserModal({ user, competitions, canPickCompetition, defaultCompetitionId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: 'TEAM',
    competition_id: user?.competition_id || defaultCompetitionId || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.name || !form.email) return toast.error('Full name and email are required');
    if (!form.competition_id) return toast.error('Competition assignment is required');

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: 'TEAM',
        competition_id: form.competition_id,
        ...(user?.id ? {} : { password: form.password || undefined }),
      };
      const res = user?.id ? await userAPI.update(user.id, payload) : await userAPI.create(payload);
      if (!user?.id && res.data.tempPassword) {
        toast.success(`Team user created. Temp password: ${res.data.tempPassword}`, { duration: 12000, icon: <KeyRound size={14} /> });
      } else {
        toast.success('Team user saved');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save team user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{user?.id ? 'Edit Team User' : 'Create Team User'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Team Captain Name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} disabled={!!user?.id} onChange={(e) => set('email', e.target.value)} placeholder="team@example.com" />
          </div>
          {!user?.id && (
            <div className="form-group">
              <label className="form-label">Password (optional)</label>
              <input className="form-input" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Leave blank for auto-generated password" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Competition *</label>
            <select className="form-input form-select" value={form.competition_id} disabled={!canPickCompetition} onChange={(e) => set('competition_id', e.target.value)}>
              <option value="">Select Competition</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Team User'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeams() {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [total, setTotal] = useState(0);
  const [competitions, setCompetitions] = useState([]);
  const [filter, setFilter] = useState({ search: '', competition_id: '' });
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(null);
  const [acting, setActing] = useState('');

  const isSuper = user?.role === 'SUPER_ADMIN';
  const canPickCompetition = isSuper;
  const fixedCompetitionId = !isSuper ? user?.competition_id : '';

  const competitionOptions = useMemo(() => {
    if (isSuper) return competitions;
    return competitions.filter((c) => String(c.id) === String(fixedCompetitionId));
  }, [competitions, isSuper, fixedCompetitionId]);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, compRes] = await Promise.all([
        userAPI.getAll({
          role: 'TEAM',
          search: filter.search || undefined,
          competition_id: isSuper ? (filter.competition_id || undefined) : fixedCompetitionId,
        }),
        competitionAPI.getAllAdmin(),
      ]);
      setTeams(usersRes.data.users || []);
      setTotal(usersRes.data.total || 0);
      setCompetitions(compRes.data.competitions || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load team users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter.search, filter.competition_id, fixedCompetitionId]);

  const toggleUser = async (id) => {
    setActing(`toggle-${id}`);
    try {
      await userAPI.toggleActive(id);
      toast.success('User status updated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update user status');
    } finally {
      setActing('');
    }
  };

  const resetPassword = async (id) => {
    setActing(`reset-${id}`);
    try {
      const res = await userAPI.resetPassword(id);
      toast.success(`Password reset. New password: ${res.data.tempPassword}`, { duration: 12000, icon: <KeyRound size={14} /> });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reset password');
    } finally {
      setActing('');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this team user?')) return;
    setActing(`delete-${id}`);
    try {
      await userAPI.delete(id);
      toast.success('Team user deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete user');
    } finally {
      setActing('');
    }
  };

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div className="page-surface page-surface-light" />
      <div style={{ position: 'relative', height: 190, marginBottom: -28, overflow: 'hidden' }}>
        <img src="/images/classes/bsvc_class_1777732036212.png" alt="Team Management Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 44, left: 28, right: 28 }}>
          <div className="badge badge-published" style={{ marginBottom: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none' }}>Competition Admin</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#000' }}>Team Management</h1>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="grid-3" style={{ marginBottom: 18 }}>
          <div className="stat-card"><div className="stat-label">Total Team Users</div><div className="stat-value">{total}</div></div>
          <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value" style={{ color: '#10b981' }}>{teams.filter((u) => u.is_active).length}</div></div>
          <div className="stat-card"><div className="stat-label">Temp Password</div><div className="stat-value" style={{ color: '#f59e0b' }}>{teams.filter((u) => u.is_temp_password).length}</div></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" style={{ maxWidth: 260 }} placeholder="Search name or email..." value={filter.search} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))} />
            {isSuper && (
              <select className="form-input form-select" style={{ maxWidth: 240 }} value={filter.competition_id} onChange={(e) => setFilter((f) => ({ ...f, competition_id: e.target.value }))}>
                <option value="">All Competitions</option>
                {competitionOptions.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setModalUser({})}>
            <Plus size={16} /> Create Team User
          </button>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap table-modern">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th><th>Email</th><th>Competition</th><th>Status</th><th>Last Login</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><Users size={34} style={{ opacity: 0.25 }} /><h3>No team users found</h3></div></td></tr>
                ) : teams.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700 }}>{u.name} {u.is_temp_password && <span className="badge badge-pending" style={{ marginLeft: 8 }}>TEMP PW</span>}</td>
                    <td>{u.email}</td>
                    <td>{u.competition_code || '—'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>{u.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                    <td>{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModalUser(u)}>Edit</button>
                        <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleUser(u.id)} disabled={acting === `toggle-${u.id}`}><Power size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => resetPassword(u.id)} disabled={acting === `reset-${u.id}`}><KeyRound size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteUser(u.id)} disabled={acting === `delete-${u.id}`}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalUser !== null && (
        <TeamUserModal
          user={modalUser.id ? modalUser : null}
          competitions={competitionOptions}
          canPickCompetition={canPickCompetition}
          defaultCompetitionId={fixedCompetitionId}
          onClose={() => setModalUser(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
