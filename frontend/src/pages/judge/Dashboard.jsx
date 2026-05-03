import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { leaderboardAPI, competitionAPI, trackEventAPI } from '../../services/api';
import { onLeaderboardUpdated } from '../../services/socket';
import { Medal, RefreshCw } from 'lucide-react';

const RANK_STYLE = {
  1: { bg: '#fff', border: '1px solid rgba(0,0,0,0.1)', icon: <Medal size={28} color="#FFD700" fill="#FFD700" fillOpacity={0.2} />, shadow: '0 8px 24px rgba(255,215,64,0.3)' },
  2: { bg: '#fff', border: '1px solid rgba(0,0,0,0.08)', icon: <Medal size={28} color="#C0C0C0" fill="#C0C0C0" fillOpacity={0.2} />, shadow: '0 4px 16px rgba(0,0,0,0.05)' },
  3: { bg: '#fff', border: '1px solid rgba(0,0,0,0.05)', icon: <Medal size={28} color="#CD7F32" fill="#CD7F32" fillOpacity={0.2} />, shadow: '0 4px 12px rgba(0,0,0,0.03)' },
};

export default function JudgeDashboard() {
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [approvedValues, setApprovedValues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    competitionAPI.getAll('ACTIVE').then(r => {
      const comps = r.data.competitions || [];
      setCompetitions(comps);
      if (comps.length > 0) setSelectedComp(String(comps[0].id));
    });
  }, []);

  const load = useCallback(() => {
    if (!selectedComp) return;
    setLoading(true);
    leaderboardAPI.get(selectedComp, vehicleClass ? { vehicle_class: vehicleClass } : {})
      .then(async (r) => {
        setLeaderboard(r.data.leaderboard || []);
        const approvedRes = await trackEventAPI.getApprovedValues({
          competition_id: selectedComp,
          ...(vehicleClass ? { vehicle_class: vehicleClass } : {}),
        });
        setApprovedValues(approvedRes.data.approved_values || []);
      })
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [selectedComp, vehicleClass]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onLeaderboardUpdated(() => load()); }, [load]);

  const currentComp = competitions.find(c => String(c.id) === String(selectedComp));

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/quad_class_1777731958474.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.06,
          pointerEvents: 'none',
        }}
      />
      {/* Premium Banner */}
      <div style={{ position: 'relative', height: 200, marginBottom: 24, overflow: 'hidden' }}>
        <img src="/images/feature-1.png" alt="Judge Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none' }}>Live Leaderboard</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#000' }}>FMAE Rankings</h1>
            {currentComp && <div style={{ fontSize: 15, color: 'rgba(0,0,0,0.6)', marginTop: 4, fontWeight: 600 }}>{currentComp.name}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.8)', padding: '12px 20px', borderRadius: 12, backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--success)', letterSpacing: 1, fontWeight: 700 }}>LIVE</span>
            </div>
            <button className="btn btn-outline btn-sm" style={{ borderColor: 'rgba(0,0,0,0.2)', color: '#000', display: 'flex', alignItems: 'center', gap: 6 }} onClick={load}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1000 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <select className="form-input form-select" style={{ maxWidth: 280 }} value={selectedComp} onChange={e => setSelectedComp(e.target.value)}>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
        <select className="form-input form-select" style={{ maxWidth: 160 }} value={vehicleClass} onChange={e => setVehicleClass(e.target.value)}>
          <option value="">All Classes</option>
          <option value="EV">EV Class</option>
          <option value="IC">IC Class</option>
        </select>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state"><h3>No data yet</h3><p>Leaderboard updates when teams approve track event values</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '56px 40px 1fr 1fr 120px 120px 100px', gap: 12, padding: '0 16px 8px', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(0,0,0,0.5)' }}>
            <span>Rank</span><span></span><span>Team</span><span>College</span><span>Class</span><span>Progress</span><span style={{ textAlign: 'right' }}>Score</span>
          </div>

          {leaderboard.map((entry, idx) => {
            const rankStyle = RANK_STYLE[entry.rank] || {};
            return (
              <motion.div key={entry.team_id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                style={{
                  display: 'grid', gridTemplateColumns: '56px 40px 1fr 1fr 120px 120px 100px',
                  gap: 12, padding: '16px', borderRadius: 12,
                  background: rankStyle.bg || '#fff',
                  border: rankStyle.border || '1px solid rgba(0,0,0,0.05)',
                  boxShadow: rankStyle.shadow || '0 2px 8px rgba(0,0,0,0.02)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 900, fontSize: 18, color: rankStyle.icon ? '#000' : 'rgba(0,0,0,0.3)' }}>#{entry.rank}</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rankStyle.icon || <div style={{ width: 28 }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#000' }}>{entry.team_name}</div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {entry.college_name}
                </div>
                <span className={`badge badge-${entry.vehicle_class?.toLowerCase()}`} style={{ background: '#000', color: '#fff' }}>{entry.vehicle_class}</span>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>
                    <span>{entry.progress_pct || 0}%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: 6, background: 'rgba(0,0,0,0.05)' }}>
                    <motion.div className="progress-bar-fill" style={{ height: '100%', borderRadius: 3, background: '#000' }}
                      initial={{ width: 0 }} animate={{ width: `${entry.progress_pct || 0}%` }} transition={{ duration: 0.8, delay: idx * 0.04 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 24, color: '#000' }}>{entry.total_score}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Approved Track Values (Read-only)</h2>
        {approvedValues.length === 0 ? (
          <p style={{ color: 'rgba(0,0,0,0.5)', fontSize: 13 }}>No approved track event values found for current filters.</p>
        ) : (
          <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Task</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Team</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Class</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Value</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {approvedValues.map((row) => (
                  <tr key={row.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.task_name}</td>
                    <td style={{ padding: '10px 12px' }}>{row.team_name}</td>
                    <td style={{ padding: '10px 12px' }}>{row.vehicle_class}</td>
                    <td style={{ padding: '10px 12px' }}>{row.admin_value} {row.admin_value_unit || ''}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
