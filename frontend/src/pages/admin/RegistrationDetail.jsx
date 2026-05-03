import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registrationAPI } from '../../services/api';
import { Check, X, ChevronLeft } from 'lucide-react';

export default function AdminRegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    registrationAPI.getOne(id)
      .then(r => setReg(r.data.registration))
      .catch(() => toast.error('Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const approve = async () => {
    if (!window.confirm('Approve this registration and send login credentials to the team?')) return;
    setActing('approve');
    try {
      await registrationAPI.approve(id);
      toast.success('Registration approved! Credentials sent to team.');
      navigate('/admin/registrations');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(''); }
  };

  const reject = async () => {
    if (!rejectReason.trim()) { toast.error('Provide a rejection reason'); return; }
    setActing('reject');
    try {
      await registrationAPI.reject(id, rejectReason);
      toast.success('Registration rejected.');
      navigate('/admin/registrations');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(''); }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!reg) return <div className="page"><div className="alert alert-danger">Registration not found</div></div>;

  const Row = ({ label, value }) => (
    <tr>
      <td style={{ padding: '10px 0', color: 'rgba(0,0,0,0.4)', width: 200, fontSize: 13 }}>{label}</td>
      <td style={{ padding: '10px 0', fontWeight: 500 }}>{value || '—'}</td>
    </tr>
  );

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{reg.team_name}</h1>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>{reg.competition_name} — {reg.vehicle_class}</div>
        </div>
        <span className={`badge badge-${reg.status.toLowerCase()}`}>{reg.status}</span>
      </div>

      {[
        { title: 'Team Details', rows: [['College', reg.college_name], ['City', reg.city], ['State', reg.state], ['Country', reg.country], ['Email', reg.team_email], ['Instagram', reg.instagram_handle]] },
        { title: 'Captain', rows: [['Name', reg.captain_name], ['Phone', reg.captain_phone], ['Email', reg.captain_email]] },
        { title: 'Manager', rows: [['Name', reg.manager_name], ['Phone', reg.manager_phone], ['Email', reg.manager_email]] },
        { title: 'Faculty Advisor', rows: [['Name', reg.advisor_name], ['Phone', reg.advisor_phone], ['Email', reg.advisor_email]] },
        { title: 'Billing Details', rows: [['Billing Name', reg.billing_name], ['Address', [reg.billing_address_line1, reg.billing_address_line2].filter(Boolean).join(', ')], ['City / State / PIN', [reg.billing_city, reg.billing_state, reg.billing_pin].filter(Boolean).join(', ')], ['GST Number', reg.billing_gst]] },
      ].map(section => (
        <div key={section.title} className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>{section.title}</div>
          <table style={{ width: '100%' }}><tbody>{section.rows.map(([l, v]) => <Row key={l} label={l} value={v} />)}</tbody></table>
        </div>
      ))}

      {/* Action Buttons */}
      {reg.status === 'PENDING' && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Review Decision</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={approve} disabled={!!acting} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {acting === 'approve' ? 'Approving…' : <><Check size={16} /> Approve Registration</>}
            </button>
            <button className="btn btn-danger" onClick={() => setShowReject(true)} disabled={!!acting} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <X size={16} /> Reject Registration
            </button>
          </div>
          {showReject && (
            <div style={{ marginTop: 16 }}>
              <label className="form-label">Rejection Reason *</label>
              <textarea className="form-input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a clear reason for rejection…" style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-danger" onClick={reject} disabled={!!acting}>
                  {acting === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowReject(false); setRejectReason(''); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {reg.status === 'REJECTED' && reg.rejection_reason && (
        <div className="alert alert-danger" style={{ marginTop: 16 }}>Rejection reason: {reg.rejection_reason}</div>
      )}
    </div>
  );
}
