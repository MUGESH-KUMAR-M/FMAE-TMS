import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registrationAPI, competitionAPI } from '../../services/api';
import { useAuthStore } from '../../context/store';
import { Filter, Search, Trash2, Eye, User, Check } from 'lucide-react';

export default function AdminRegistrations() {
  const { user } = useAuthStore();
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState([]);
  const [search] = useSearchParams();
  const [filters, setFilters] = useState({ status: search.get('status') || '', competition_id: '', search: '' });
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    registrationAPI.getAll({ ...filters, page, limit: 15 })
      .then(r => { setRegs(r.data.registrations); setTotal(r.data.total); })
      .catch(() => toast.error('Failed to load registrations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const isSuper = user?.role === 'SUPER_ADMIN';
    (isSuper ? competitionAPI.getAllAdmin() : competitionAPI.getAll('ACTIVE'))
      .then(r => setCompetitions(r.data.competitions || []));
  }, [user]);
  const del = async (id) => {
    if (!window.confirm('Are you sure? This will permanently remove the team registration.')) return;
    try {
      await registrationAPI.delete(id);
      toast.success('Registration deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  useEffect(() => { load(); }, [filters, page]);


  const ROLE_LABELS = {
    SUPER_ADMIN: 'Super Admin Portal',
    ADMIN_COMPETITION: 'Event Lead Portal',
    ADMIN_FINANCE: 'Finance Portal'
  };

  const STATUS_BADGE = { PENDING: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected' };

  return (
    <div className="page">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/fs_class_1777731992056.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div>
          <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 700, fontSize: 10 }}>
            {ROLE_LABELS[user?.role] || 'Admin Portal'}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: '-0.5px' }}>Registration Queue</h1>
          <p style={{ color: 'rgba(0,0,0,0.5)', fontSize: 14, fontWeight: 500, marginTop: 4 }}>Manage and review team applications for FMAE competitions.</p>
        </div>
        <div className="stat-pill" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', padding: '10px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <User size={18} color="#10b981" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', marginTop: 2 }}>Applications</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
          <Search size={18} color="rgba(0,0,0,0.4)" />
          <input className="form-input" style={{ border: 'none', background: 'transparent', paddingLeft: 0 }} placeholder="Search team / college…"
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Filter size={16} color="rgba(0,0,0,0.4)" />
          <select className="form-input form-select" style={{ border: 'none', background: 'transparent', width: 140, paddingLeft: 0 }} value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select className="form-input form-select" style={{ border: 'none', background: 'transparent', width: 160, paddingLeft: 0 }} value={filters.competition_id}
            onChange={e => setFilters(f => ({ ...f, competition_id: e.target.value }))}>
            <option value="">All Events</option>
            {competitions.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Team Name</th><th>College</th><th>Competition</th>
                <th>Submitted</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {regs.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state">No registrations found</div></td></tr>
              ) : regs.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.team_name}</td>
                  <td style={{ color: 'rgba(0,0,0,0.6)', fontSize: 13 }}>{r.college_name}</td>
                  <td><span className="badge badge-ev">{r.competition_code} — {r.vehicle_class}</span></td>
                  <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>{new Date(r.submitted_at).toLocaleDateString('en-IN')}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={`/admin/registrations/${r.id}`} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {r.status === 'PENDING' ? <><Check size={14} /> Review</> : <><Eye size={14} /> View</>}
                      </Link>
                      {user?.role === 'SUPER_ADMIN' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => del(r.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 15 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          {Array.from({ length: Math.ceil(total / 15) }, (_, i) => (
            <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
