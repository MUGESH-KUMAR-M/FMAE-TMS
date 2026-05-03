import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { taskAPI, submissionAPI, trackEventAPI, paymentAPI, leaderboardAPI, registrationAPI, scrutineeringAPI, certificateAPI } from '../../services/api';
import { useAuthStore } from '../../context/store';
import { Trophy, FileText, Download, Clock, Timer, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { onLeaderboardUpdated } from '../../services/socket';

const STATUS_BADGE = {
  SUBMITTED: 'badge-submitted', VIEWED: 'badge-submitted', NEEDS_RESUBMISSION: 'badge-pending',
  APPROVED: 'badge-approved', PENDING: 'badge-pending', NOT_STARTED: '',
};

function ProgressBar({ value }) {
  return (
    <div>
      <div className="progress-bar-bg" style={{ height: 20, borderRadius: 10 }}>
        <motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: 'easeOut' }} style={{ borderRadius: 10 }} />
      </div>
    </div>
  );
}

function UploadTask({ task, submission, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await submissionAPI.upload(task.id, fd);
      toast.success('File uploaded successfully!');
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  }, [task.id, onRefresh]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxSize: 52428800, multiple: false,
    accept: task.allowed_file_types?.reduce((a, t) => ({ ...a, [`application/${t.toLowerCase()}`]: [] }), {}) || undefined,
  });

  return (
    <div>
      {submission ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`badge ${submission.status === 'NEEDS_RESUBMISSION' ? 'badge-pending' : 'badge-submitted'}`}>
            {submission.status === 'NEEDS_RESUBMISSION' ? 'Resubmit Required' : submission.file_name}
          </span>
          {(submission.status === 'NEEDS_RESUBMISSION') && (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button className="btn btn-outline btn-sm" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload New File'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-active' : ''}`} style={{ padding: '20px', textAlign: 'center' }}>
          <input {...getInputProps()} />
          {uploading ? <span>Uploading...</span> : (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Upload File</div>
              <div style={{ fontSize: 13 }}>{isDragActive ? 'Drop file here' : 'Click or drag file to upload'}</div>
              {task.allowed_file_types?.length > 0 && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>Allowed: {task.allowed_file_types.join(', ')}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrackEventCard({ task, trackEvent, onRefresh }) {
  const [approving, setApproving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleApprove = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    setApproving(true);
    try {
      await trackEventAPI.approve(trackEvent.id);
      toast.success('Value approved! Score added to leaderboard.');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Approval failed'); }
    finally { setApproving(false); setConfirmed(false); }
  };

  if (!trackEvent?.admin_value) {
    return <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>Awaiting admin entry…</span>;
  }
  if (trackEvent.approved) {
    return (
      <span className="badge badge-approved" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle size={12} /> Approved — {trackEvent.admin_value} {trackEvent.admin_value_unit}
      </span>
    );
  }
  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '20px', background: 'rgba(0,0,0,0.02)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Admin Recorded Value</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
        {trackEvent.admin_value} <span style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{trackEvent.admin_value_unit}</span>
      </div>
      {confirmed && <div className="alert alert-warning" style={{ marginBottom: 12, fontSize: 12 }}>Once approved, this value CANNOT be changed or disputed. Click again to confirm.</div>}
      <button className="btn btn-success btn-sm" onClick={handleApprove} disabled={approving}>
        {approving ? 'Approving...' : confirmed ? 'Confirm Approval' : 'Approve Value'}
      </button>
    </div>
  );
}

export default function TeamDashboard() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [trackEvents, setTrackEvents] = useState({});
  const [payment, setPayment] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [rank, setRank] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [tasksRes, subsRes, teRes, payRes, regRes, insRes] = await Promise.all([
        taskAPI.getAll({}),
        submissionAPI.getMy(),
        trackEventAPI.getMy(),
        paymentAPI.getMy(),
        registrationAPI.getMy(),
        scrutineeringAPI.getMy(),
      ]);
      const taskList = tasksRes.data.tasks || [];
      setTasks(taskList);
      const subsMap = {};
      (subsRes.data.submissions || []).forEach(s => { subsMap[s.task_id] = s; });
      setSubmissions(subsMap);
      const teMap = {};
      (teRes.data.track_events || []).forEach(te => { teMap[te.task_id] = te; });
      setTrackEvents(teMap);
      setPayment(payRes.data.payment);
      const reg = regRes.data.registration || { 
        team_name: user.name, 
        competition_id: user.competition_id,
        status: 'APPROVED' // Fallback for manually created users
      };
      setRegistration(reg);
      setInspection(insRes.data.inspection);
      
      // Load rank if competition exists
      if (reg?.competition_id) {
        const rankRes = await leaderboardAPI.getMyPosition(reg.competition_id);
        if (rankRes.data.success) setRank(rankRes.data.rank);
      }
    } catch (e) {
      toast.error('Failed to load dashboard');
    } finally { setLoading(false); }
  }, []);

  const handlePayment = async () => {
    toast.info('Contact Finance Admin to process your payment. Payment status will be updated in the dashboard.');
  };

  const handleDownloadCertificate = async () => {
    try {
      const res = await certificateAPI.download();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${user.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error('Could not download certificate. Ensure all tasks are completed.');
    }
  };

  useEffect(() => {
    loadAll();
    onLeaderboardUpdated(() => loadAll());
  }, [loadAll]);

  // Calculate progress
  const progress = tasks.reduce((sum, task) => {
    if (task.task_type === 'SUBMISSION') {
      const sub = submissions[task.id];
      if (sub && (sub.status === 'SUBMITTED' || sub.status === 'VIEWED')) return sum + task.weight;
    } else {
      const te = trackEvents[task.id];
      if (te?.approved) return sum + task.weight;
    }
    return sum;
  }, 0);

  const getTaskStatus = (task) => {
    if (task.task_type === 'SUBMISSION') {
      const sub = submissions[task.id];
      if (!sub) return 'NOT_STARTED';
      return sub.status;
    } else {
      const te = trackEvents[task.id];
      if (!te) return 'NOT_STARTED';
      if (!te.admin_value) return 'AWAITING';
      if (te.approved) return 'APPROVED';
      return 'PENDING_APPROVAL';
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <>
      <div className="page" style={{ padding: '0 0 40px 0' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('/images/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.06,
            pointerEvents: 'none',
          }}
        />
        {/* Premium Banner */}
        <div style={{ position: 'relative', height: 240, marginBottom: 40, overflow: 'hidden' }}>
          <img src="/images/baja-bg.png" alt="Dashboard Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--grey-900) 0%, transparent 100%)' }} />
          <div style={{ position: 'absolute', bottom: 40, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ maxWidth: '60%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="badge" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1, fontSize: 10, padding: '4px 10px' }}>TEAM PORTAL</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>ID: {user?.name?.split(' ')[0]}</div>
              </div>
              <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1, marginBottom: 12 }}>
                {user?.name?.split(' ').slice(1).join(' ')}
              </h1>
              {registration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600 }}>
                  <Trophy size={18} />
                  {registration.competition_name} <span style={{ opacity: 0.5 }}>|</span> {registration.vehicle_class}
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '24px 32px', borderRadius: 24, backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', display: 'flex', gap: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Live Standing</span>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {rank ? `#${rank}` : '--'}
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Operational Status</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {payment ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span className={`badge ${payment.status === 'PAID' ? 'badge-paid' : payment.status === 'UNPAID' ? 'badge-unpaid' : 'badge-pending'}`} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800 }}>
                        {payment.status}
                      </span>
                      {payment.status !== 'PAID' && (
                        <button className="btn btn-primary" onClick={handlePayment} style={{ height: 'auto', padding: '8px 16px', fontSize: 11, fontWeight: 800, background: '#fff', color: '#000', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={12} /> PAY REGISTRATION FEE
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span className="badge badge-pending" style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800 }}>PAYMENT PENDING</span>
                      <button className="btn btn-primary" onClick={handlePayment} style={{ height: 'auto', padding: '8px 16px', fontSize: 11, fontWeight: 800, background: '#fff', color: '#000', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={12} /> PAY NOW
                      </button>
                    </div>
                  )}
                  {registration && (
                    <span className="badge badge-approved" style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800 }}>{registration.status}</span>
                  )}
                  {inspection && (
                    <span className={`badge ${inspection.status === 'PASS' ? 'badge-approved' : inspection.status === 'FAIL' ? 'badge-unpaid' : 'badge-pending'}`} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800 }}>
                      TECH: {inspection.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container" style={{ maxWidth: 1000 }}>
          {!registration ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ color: 'var(--warning)', marginBottom: 20 }}>
                <Clock size={64} style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Registration Pending</h2>
              <p style={{ color: 'rgba(0,0,0,0.5)', maxWidth: 500, margin: '0 auto' }}>
                Your team registration is currently being processed by the administrators. 
                Once approved, you will see your tasks and progress tracking here.
              </p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>OVERALL PROGRESS</span>
                  <span style={{ fontWeight: 800, fontSize: 24 }}>{progress}%</span>
                </div>
                <ProgressBar value={progress} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>
                    {tasks.filter(t => {
                      const te = trackEvents[t.id]; const sub = submissions[t.id];
                      return (t.task_type === 'SUBMISSION' && (sub?.status === 'SUBMITTED' || sub?.status === 'VIEWED')) ||
                             (t.task_type === 'TRACK_EVENT' && te?.approved);
                    }).length} of {tasks.length} tasks completed
                  </div>
                  {progress === 100 && tasks.length > 0 && (
                    <button className="btn btn-success btn-sm" onClick={handleDownloadCertificate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Download size={14} /> Download Certificate
                    </button>
                  )}
                </div>
              </div>

              {/* Tasks Table */}
              <div className="card" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>TASKS</h2>
                {tasks.length === 0 ? (
                  <div className="empty-state"><h3>No tasks published yet</h3><p>Check back soon</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {tasks.map(task => {
                      const status = getTaskStatus(task);
                      return (
                        <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="card-3d" style={{ padding: '24px', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ width: 48, height: 48, background: 'var(--grey-800)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)' }}>
                                {task.task_type === 'SUBMISSION' ? <FileText size={20} /> : <Timer size={20} />}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--white)' }}>{task.name}</div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase' }}>
                                    {task.task_type === 'SUBMISSION' ? 'Submission' : 'Track Event'}
                                  </span>
                                  <span style={{ color: 'var(--grey-600)', fontSize: 11 }}>•</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-400)' }}>{task.weight}% Weight</span>
                                </div>
                              </div>
                            </div>
                            <span className={`badge ${STATUS_BADGE[status] || ''}`} style={{ padding: '6px 14px', borderRadius: 8 }}>
                              {status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          
                          {task.description && (
                            <div style={{ background: 'var(--grey-800)', padding: '16px', borderRadius: 12, marginBottom: 20, fontSize: 14, color: 'var(--grey-300)', border: '1px solid var(--grey-700)' }}>
                              {task.description}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 20 }}>
                              {task.due_date && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 2 }}>Deadline</div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                </div>
                              )}
                              {task.max_score > 0 && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 2 }}>Points</div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{task.max_score} MAX</div>
                                </div>
                              )}
                            </div>
                            <div style={{ minWidth: 200, display: 'flex', justifyContent: 'flex-end' }}>
                              {task.task_type === 'SUBMISSION'
                                ? <UploadTask task={task} submission={submissions[task.id]} onRefresh={loadAll} />
                                : <TrackEventCard task={task} trackEvent={trackEvents[task.id]} onRefresh={loadAll} />
                              }
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
