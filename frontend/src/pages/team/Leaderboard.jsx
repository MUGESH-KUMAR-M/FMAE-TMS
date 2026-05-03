import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { leaderboardAPI, registrationAPI } from '../../services/api';
import { onLeaderboardUpdated } from '../../services/socket';
import { Medal, Users, Trophy, RefreshCw } from 'lucide-react';

const RANK_STYLE = {
  1: { bg: '#fff', border: '1px solid rgba(0,0,0,0.1)', icon: <Medal size={28} color="#FFD700" fill="#FFD700" fillOpacity={0.2} />, shadow: '0 8px 24px rgba(255,215,64,0.3)' },
  2: { bg: '#fff', border: '1px solid rgba(0,0,0,0.08)', icon: <Medal size={28} color="#C0C0C0" fill="#C0C0C0" fillOpacity={0.2} />, shadow: '0 4px 16px rgba(0,0,0,0.05)' },
  3: { bg: '#fff', border: '1px solid rgba(0,0,0,0.05)', icon: <Medal size={28} color="#CD7F32" fill="#CD7F32" fillOpacity={0.2} />, shadow: '0 4px 12px rgba(0,0,0,0.03)' },
};

export default function TeamLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehicleClass, setVehicleClass] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // Get my registration to find competition_id
      const regRes = await registrationAPI.getMy();
      const reg = regRes.data.registration;
      setRegistration(reg);

      if (reg?.competition_id) {
        const lbRes = await leaderboardAPI.get(reg.competition_id, vehicleClass ? { vehicle_class: vehicleClass } : {});
        setLeaderboard(lbRes.data.leaderboard || []);
      }
    } catch (e) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [vehicleClass]);

  useEffect(() => {
    load();
    onLeaderboardUpdated(() => load());
  }, [load]);

  if (loading && leaderboard.length === 0) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/moto_class_1777732019952.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      {/* Premium Banner */}
      <div style={{ position: 'relative', height: 200, marginBottom: 24, overflow: 'hidden' }}>
        <img src="/images/login-bg.png" alt="Leaderboard Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="badge badge-published" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none' }}>Live Standings</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#000' }}>Event Rankings</h1>
            {registration && <div style={{ fontSize: 15, color: 'rgba(0,0,0,0.6)', marginTop: 4, fontWeight: 600 }}>{registration.competition_name}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.8)', padding: '12px 20px', borderRadius: 12, backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--success)', letterSpacing: 1, fontWeight: 700 }}>LIVE UPDATES</span>
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
          <select className="form-input form-select" style={{ maxWidth: 160 }} value={vehicleClass} onChange={e => setVehicleClass(e.target.value)}>
            <option value="">All Classes</option>
            <option value="EV">EV Class Only</option>
            <option value="IC">IC Class Only</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>
            <Users size={16} /> {leaderboard.length} Teams Competing
          </div>
        </div>

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>

        {leaderboard.length === 0 ? (
          <div className="empty-state">
            <Trophy size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3>No rankings yet</h3>
            <p>Leaderboard updates as teams approve their scores.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '56px 40px 1fr 1fr 120px 120px 100px', gap: 12, padding: '0 16px 8px', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(0,0,0,0.5)' }}>
              <span>Rank</span><span></span><span>Team</span><span>College</span><span>Class</span><span>Progress</span><span style={{ textAlign: 'right' }}>Score</span>
            </div>

            {leaderboard.map((entry, idx) => {
              const rankStyle = RANK_STYLE[entry.rank] || {};
              const isMe = entry.is_current_team;

              return (
                <motion.div key={entry.team_id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '56px 40px 1fr 1fr 120px 120px 100px',
                    gap: 12, padding: '16px', borderRadius: 12,
                    background: isMe ? '#000' : (rankStyle.bg || '#fff'),
                    border: isMe ? 'none' : (rankStyle.border || '1px solid rgba(0,0,0,0.05)'),
                    boxShadow: isMe ? '0 20px 40px rgba(0,0,0,0.15)' : (rankStyle.shadow || '0 2px 8px rgba(0,0,0,0.02)'),
                    alignItems: 'center',
                    color: isMe ? '#fff' : '#000',
                    zIndex: isMe ? 1 : 0,
                    transform: isMe ? 'scale(1.02)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 900, fontSize: 18, color: isMe ? '#fff' : (rankStyle.icon ? '#000' : 'rgba(0,0,0,0.3)') }}>#{entry.rank}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isMe ? <Trophy size={28} color="#fff" fill="#fff" fillOpacity={0.2} /> : (rankStyle.icon || <div style={{ width: 28 }} />)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{entry.team_name} {isMe && <span style={{ marginLeft: 8, fontSize: 10, background: '#fff', color: '#000', padding: '2px 6px', borderRadius: 4 }}>YOU</span>}</div>
                  </div>
                  <div style={{ fontSize: 13, color: isMe ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {entry.college_name}
                  </div>
                  <span className="badge" style={{ background: isMe ? 'rgba(255,255,255,0.2)' : '#000', color: '#fff', border: 'none' }}>{entry.vehicle_class}</span>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: isMe ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600 }}>
                      <span>{entry.progress_pct || 0}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: 6, background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                      <motion.div className="progress-bar-fill" style={{ height: '100%', borderRadius: 3, background: isMe ? '#fff' : '#000' }}
                        initial={{ width: 0 }} animate={{ width: `${entry.progress_pct || 0}%` }} transition={{ duration: 0.8, delay: idx * 0.04 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 24 }}>{entry.total_score}</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
