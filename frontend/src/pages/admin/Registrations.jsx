import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registrationAPI, competitionAPI } from '../../services/api';

export default function AdminRegistrations() {
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

  useEffect(() => { competitionAPI.getAll('ACTIVE').then(r => setCompetitions(r.data.competitions || [])); }, []);
  const del = async (id) => {
    if (!window.confirm('Are you sure? This will permanently remove the team registration.')) return;
    try {
      await registrationAPI.delete(id);
      toast.success('Registration deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  useEffect(() => { load(); }, [filters, page]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="text-uppercase text-muted mb-8">Competition Admin</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Registration Queue</h1>
        </div>
        <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>{total} total</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search team / college…"
          value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <select className="form-input form-select" style={{ maxWidth: 160 }} value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select className="form-input form-select" style={{ maxWidth: 200 }} value={filters.competition_id}
          onChange={e => setFilters(f => ({ ...f, competition_id: e.target.value }))}>
          <option value="">All Competitions</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
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
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link to={`/admin/registrations/${r.id}`} className="btn btn-ghost btn-sm">
                        {r.status === 'PENDING' ? 'Review' : 'View'}
                      </Link>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(r.id)}>Delete</button>
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
