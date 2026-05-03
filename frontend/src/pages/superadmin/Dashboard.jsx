import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { userAPI } from '../../services/api';
import { Link } from 'react-router-dom';
import { Users, Trophy, CreditCard, Activity, ClipboardList, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuperDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getStats()
      .then(r => setStats(r.data.stats))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const statCards = [
    { label: 'Active Competitions', value: stats?.active_competitions || 0, sub: `${stats?.total_competitions || 0} total`, link: '/superadmin/competitions' },
    { label: 'Total Registrations', value: stats?.total_registrations || 0, link: '/superadmin' },
    { label: 'Pending Approvals', value: stats?.pending_registrations || 0, color: (stats?.pending_registrations || 0) > 0 ? 'var(--warning)' : '#000', link: '/admin/registrations?status=PENDING' },
    { label: 'Approved Teams', value: stats?.approved_registrations || 0, color: '#10b981', link: '/admin/registrations?status=APPROVED' },
    { label: 'Rejected', value: stats?.rejected_registrations || 0, color: '#ef4444' },
    { label: 'Total Users', value: stats?.total_users || 0, link: '/superadmin/users' },
    { label: 'Tasks', value: stats?.total_tasks || 0 },
    { label: 'Submissions', value: stats?.total_submissions || 0 },
    { label: 'Payments Confirmed', value: stats?.paid_count || 0, color: '#10b981' },
    { label: 'Payments Pending', value: stats?.payment_pending_count || 0, color: '#f59e0b', link: '/finance' },
  ];

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/hero-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', height: 220, marginBottom: -34, overflow: 'hidden' }}>
        <img src="/images/baja-bg.png" alt="Super Admin Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 54, left: 32, right: 32 }}>
          <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none' }}>Super Admin Portal</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#000' }}>System Control Center</h1>
          <p style={{ marginTop: 6, color: 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: 14 }}>Monitor users, competitions, registrations, and payments from one unified workspace.</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1400 }}>
      <div className="grid-4" style={{ marginBottom: 24, position: 'relative', zIndex: 10 }}>
        {statCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.35 }}
            className="stat-card" style={{ cursor: c.link ? 'pointer' : 'default', background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}
            onClick={() => c.link && (window.location.href = c.link)}>
            <div className="stat-label" style={{ fontWeight: 600 }}>{c.label}</div>
            <div className="stat-value" style={{ color: c.color || '#000', fontSize: 28 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 4, fontWeight: 500 }}>{c.sub}</div>}
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Activity size={18} />
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Operational Snapshot</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Registrations</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{stats?.pending_registrations || 0}</div>
            </div>
            <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', fontWeight: 700 }}>Tasks Published</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{stats?.total_tasks || 0}</div>
            </div>
            <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', fontWeight: 700 }}>Team Submissions</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{stats?.total_submissions || 0}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: '#fff', position: 'relative', overflow: 'hidden' }}>
          <img src="/images/classes/bsvc_class_1777732036212.png" alt="Insights" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(108%)', opacity: 0.2 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Admin Insight</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, marginBottom: 6 }}>Keep Every Event Aligned</h3>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Use registrations, competition setup, and payment visibility as your daily control loop.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {[
          { to: '/superadmin/users', icon: <Users size={32} color="#000" />, title: 'Manage Users', desc: 'Create admins, judges, and team access accounts.', image: '/images/feature-1.png' },
          { to: '/superadmin/competitions', icon: <Trophy size={32} color="#000" />, title: 'Manage Competitions', desc: 'Configure competitions, classes, and deadlines.', image: '/images/baja-bg.png' },
          { to: '/finance', icon: <CreditCard size={32} color="#000" />, title: 'Finance Overview', desc: 'Track fee confirmation and pending payment flow.', image: '/images/login-bg.png' },
          { to: '/admin/registrations', icon: <ClipboardList size={32} color="#000" />, title: 'Registration Queue', desc: 'Review incoming teams and approval statuses.', image: '/images/classes/fs_class_1777731992056.png' },
          { to: '/admin/tasks', icon: <CheckSquare size={32} color="#000" />, title: 'Task Oversight', desc: 'Monitor tasks and completion across competitions.', image: '/images/classes/kart_class_1777731932413.png' },
          { to: '/judge', icon: <Activity size={32} color="#000" />, title: 'Leaderboard View', desc: 'See score and approved track event progression.', image: '/images/classes/moto_class_1777732019952.png' },
        ].map((item, idx) => (
          <motion.div key={item.to} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.05, duration: 0.38 }}>
          <Link to={item.to} className="card card-3d" style={{ display: 'block', background: '#fff', position: 'relative', overflow: 'hidden' }}>
            <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(112%)', opacity: 0.12 }} />
            <div style={{ position: 'relative' }}>
              <div style={{ marginBottom: 16 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: '#000' }}>{item.title}</div>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>{item.desc}</div>
            </div>
          </Link>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
}
