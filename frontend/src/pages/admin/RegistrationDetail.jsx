import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registrationAPI } from '../../services/api';
import { Check, X, ChevronLeft, Shield, Mail, Home, CreditCard, User } from 'lucide-react';
import { useAuthStore } from '../../context/store';
import { motion } from 'framer-motion';

export default function AdminRegistrationDetail() {
  const { user } = useAuthStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const ROLE_LABELS = {
    SUPER_ADMIN: 'Super Admin Oversight',
    ADMIN_COMPETITION: 'Event Lead Review'
  };

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
    <div className="page" style={{ maxWidth: 900 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
        <ChevronLeft size={16} /> Back to Queue
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 700, fontSize: 10 }}>
              {ROLE_LABELS[user?.role] || 'Admin Portal'}
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#000', letterSpacing: '-1px' }}>{reg.team_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} /> {reg.competition_name}
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{reg.vehicle_class} Class</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${reg.status.toLowerCase()}`} style={{ fontSize: 12, padding: '8px 16px', borderRadius: 12 }}>{reg.status}</span>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontWeight: 700, marginTop: 8, textTransform: 'uppercase' }}>Submission ID: #{reg.id}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { title: 'Academic Profile', icon: <Home size={16} />, rows: [['College', reg.college_name], ['Location', `${reg.city}, ${reg.state}, ${reg.country}`]] },
              { title: 'Contact Registry', icon: <Mail size={16} />, rows: [['Team Email', reg.team_email], ['Instagram', reg.instagram_handle]] },
              { title: 'Leadership & Support', icon: <User size={16} />, rows: [
                ['Captain', `${reg.captain_name} (${reg.captain_phone})`],
                ['Manager', `${reg.manager_name} (${reg.manager_phone})`],
                ['Faculty Advisor', reg.advisor_name ? `${reg.advisor_name} (${reg.advisor_phone})` : 'Not provided']
              ]},
            ].map(section => (
              <div key={section.title} className="card" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: 12 }}>
                  {section.icon}
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(0,0,0,0.4)' }}>{section.title}</div>
                </div>
                <table style={{ width: '100%' }}><tbody>{section.rows.map(([l, v]) => <Row key={l} label={l} value={v} />)}</tbody></table>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ background: '#fcfcfd', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <CreditCard size={16} />
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(0,0,0,0.4)' }}>Billing Summary</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>{reg.billing_name}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 1.5, marginBottom: 16 }}>
                {reg.billing_address_line1}<br/>
                {reg.billing_address_line2 && <>{reg.billing_address_line2}<br/></>}
                {reg.billing_city}, {reg.billing_state} - {reg.billing_pin}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.03)', padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                GST: {reg.billing_gst || 'Not provided'}
              </div>
            </div>

            {/* Action Buttons */}
            {reg.status === 'PENDING' && (
              <div className="card" style={{ background: '#000', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ fontWeight: 800, marginBottom: 16, fontSize: 15 }}>Decision Panel</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="btn" onClick={approve} disabled={!!acting} style={{ background: '#fff', color: '#000', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
                    {acting === 'approve' ? 'Processing…' : <><Check size={18} /> Approve Team</>}
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowReject(true)} disabled={!!acting} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
                    <X size={18} /> Decline Application
                  </button>
                </div>
                
                {showReject && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block', textTransform: 'uppercase' }}>Reason for Rejection</label>
                    <textarea className="form-input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Explain the decision to the team…" 
                      style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={reject} disabled={!!acting} style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: 700 }}>
                        Confirm Decline
                      </button>
                      <button className="btn btn-ghost" onClick={() => { setShowReject(false); setRejectReason(''); }} style={{ color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            
            {reg.status === 'REJECTED' && reg.rejection_reason && (
              <div className="card" style={{ background: '#fef2f2', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: 8 }}>Rejection Log</div>
                <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>{reg.rejection_reason}</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}