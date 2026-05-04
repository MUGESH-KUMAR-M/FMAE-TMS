import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentAPI, competitionAPI } from '../../services/api';

export default function FinanceDashboard() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [competitions, setCompetitions] = useState([]);
  const [filter, setFilter] = useState({ competition_id: '', status: '', page: 1 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      paymentAPI.getAll({ ...filter, limit: 20 }),
      paymentAPI.getSummary({ competition_id: filter.competition_id }),
      competitionAPI.getAll('ACTIVE'),
    ]).then(([p, s, c]) => {
      setPayments(p.data.payments || []); setTotal(p.data.total);
      setSummary(s.data.summary || {}); setCompetitions(c.data.competitions || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (paymentId, status) => {
    setUpdating(paymentId);
    try {
      const team = payments.find(p => p.payment_id === paymentId);
      await paymentAPI.update(paymentId, { status, registration_id: team?.registration_id });
      toast.success(`Payment marked as ${status}`);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setUpdating(''); }
  };

  const exportCSV = async () => {
    try {
      const r = await paymentAPI.exportCSV({ competition_id: filter.competition_id });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'fmae_payments.csv'; a.click();
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
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
      {/* Premium Banner */}
      <div style={{ position: 'relative', height: 200, marginBottom: 24, overflow: 'hidden' }}>
        <img src="/images/login-bg.png" alt="Finance Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none' }}>Finance Admin</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#000' }}>Payment Dashboard</h1>
          </div>
          <button className="btn btn-outline" style={{ borderColor: '#000', color: '#000', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', fontWeight: 700 }} onClick={exportCSV}>↓ Export CSV</button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1400 }}>
      {/* Summary Stats */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[
          { label: 'Total Teams', value: summary.total_teams || 0 },
          { label: 'Paid', value: summary.paid || 0, color: 'var(--success)' },
          { label: 'Unpaid', value: summary.unpaid || 0, color: 'var(--danger)' },
          { label: 'Pending', value: summary.pending || 0, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="stat-label" style={{ fontWeight: 600 }}>{s.label}</div>
            <div className="stat-value" style={{ color: s.color || '#000' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select className="form-input form-select" style={{ maxWidth: 200 }} value={filter.competition_id} onChange={e => setFilter(f => ({ ...f, competition_id: e.target.value }))}>
          <option value="">All Competitions</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
        <select className="form-input form-select" style={{ maxWidth: 140 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Team Name</th><th>College</th><th>Competition</th><th>Reg Date</th>
                <th>Billing Name</th><th>GST</th><th>Payment Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">No teams found</div></td></tr>
              ) : payments.map(p => (
                <tr key={p.registration_id} style={{ background: '#fff' }}>
                  <td style={{ fontWeight: 700, color: '#000' }}>{p.team_name}</td>
                  <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', fontWeight: 500 }}>{p.college_name}</td>
                  <td><span className="badge badge-ev" style={{ background: '#000', color: '#fff' }}>{p.competition_code} — {p.vehicle_class}</span></td>
                  <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>{new Date(p.reg_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{p.billing_name || '—'}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>{p.billing_gst || '—'}</td>
                  <td><span className={`badge badge-${(p.payment_status || 'pending').toLowerCase()}`}>{p.payment_status || 'PENDING'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {p.payment_status !== 'PAID' && (
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(p.payment_id, 'PAID')} disabled={updating === p.payment_id}>
                          {updating === p.payment_id ? '…' : 'Mark Paid'}
                        </button>
                      )}
                      {p.payment_status === 'PAID' && (
                        <button className="btn btn-outline btn-sm" style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'rgba(0,0,0,0.6)' }} onClick={() => updateStatus(p.payment_id, 'UNPAID')} disabled={updating === p.payment_id}>
                          Unmark
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
      </div>
    </div>
  );
}
