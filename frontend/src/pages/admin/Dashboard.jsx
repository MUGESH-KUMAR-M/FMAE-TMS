import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registrationAPI, taskAPI, auditAPI } from '../../services/api';
import { ClipboardList, CheckSquare, Flag, Activity, Users } from 'lucide-react';
import { useAuthStore } from '../../context/store';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ pending: 0, total: 0, active_comps: 0, tasks: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      registrationAPI.getAll({ limit: 1, status: 'PENDING' }),
      registrationAPI.getAll({ limit: 1 }),
      taskAPI.getAll({ status: 'PUBLISHED' }),
      user?.role === 'SUPER_ADMIN' ? auditAPI.getAll() : Promise.resolve({ data: { logs: [] } }),
    ]).then(([pending, all, tasks, audit]) => {
      setStats({
        pending: pending.data.total,
        total: all.data.total,
        tasks: tasks.data.tasks?.length || 0,
      });
      setAuditLogs(audit.data.logs || []);
    }).catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Pending Approvals', value: stats.pending, link: '/admin/registrations?status=PENDING', highlight: true },
    { label: 'Total Registrations', value: stats.total, link: '/admin/registrations' },
    { label: 'Tasks Published', value: stats.tasks, link: '/admin/tasks' },
  ];

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/kart_class_1777731932413.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      {/* Premium Banner */}
      <div style={{ position: 'relative', height: 200, marginBottom: -60, overflow: 'hidden' }}>
        <img src="/images/hero-bg.png" alt="Admin Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 80, left: 32, right: 32 }}>
          <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none' }}>Admin Portal</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#000' }}>Competition Dashboard</h1>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1200 }}>
      <div className="grid-3" style={{ marginBottom: 40, position: 'relative', zIndex: 10 }}>
        {cards.map(c => (
          <Link key={c.label} to={c.link} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="stat-label" style={{ fontWeight: 600 }}>{c.label}</div>
              <div className="stat-value" style={{ color: c.highlight && c.value > 0 ? 'var(--warning)' : '#000' }}>
                {c.value}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {[
          { to: '/admin/registrations', icon: <ClipboardList size={32} color="#000" />, title: 'Review Registrations', desc: `${stats.pending} pending approvals` },
          { to: '/admin/tasks', icon: <CheckSquare size={32} color="#000" />, title: 'Manage Tasks', desc: 'Create and manage competition tasks' },
          { to: '/admin/competitions', icon: <Flag size={32} color="#000" />, title: 'Competitions', desc: 'Create and edit competitions' },
          { to: '/admin/teams', icon: <Users size={32} color="#000" />, title: 'Team Accounts', desc: 'Create and manage team login users' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="card card-3d" style={{ display: 'block', background: '#fff' }}>
            <div style={{ marginBottom: 16 }}>{item.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, color: '#000' }}>{item.title}</div>
            <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)' }}>{item.desc}</div>
          </Link>
        ))}
      </div>
      
      {user?.role === 'SUPER_ADMIN' && auditLogs.length > 0 && (
        <div className="card" style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Activity size={20} />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Recent Activity (Audit Logs)</h2>
          </div>
          <div className="table-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>Admin</th><th>Action</th><th>Entity</th><th>Time</th><th>IP</th></tr></thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td><div style={{ fontWeight: 600 }}>{log.user_name}</div><div style={{ fontSize: 11, opacity: 0.5 }}>{log.user_email}</div></td>
                    <td><span className="badge" style={{ background: 'var(--grey-800)', border: '1px solid var(--grey-700)', color: '#fff', fontSize: 10 }}>{log.action}</span></td>
                    <td style={{ fontSize: 13 }}>{log.entity_type} {log.entity_id && `#${log.entity_id}`}</td>
                    <td style={{ fontSize: 12, opacity: 0.6 }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.5 }}>{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
