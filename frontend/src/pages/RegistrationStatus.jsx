import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { registrationAPI } from '../services/api';
import { ChevronLeft, Info, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING:  { color: '#f59e0b', icon: <Clock size={40} />, label: 'Under Review' },
  APPROVED: { color: '#10b981', icon: <CheckCircle2 size={40} />, label: 'Approved' },
  REJECTED: { color: '#ef4444', icon: <XCircle size={40} />, label: 'Rejected' },
};

export default function RegistrationStatus() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    registrationAPI.getStatus(id)
      .then(r => setData(r.data.registration))
      .catch(() => setError('Registration not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, padding: '48px 40px', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', textDecoration: 'none', marginBottom: 32 }}>
          <ChevronLeft size={14} /> FMAE-TMS
        </Link>
        
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#000', letterSpacing: -0.5, marginBottom: 32 }}>Tracking Status</h2>
        
        {error ? (
          <div className="alert alert-danger" style={{ borderRadius: 12 }}>{error}</div>
        ) : data ? (
          <>
            <div style={{ textAlign: 'center', padding: '32px 0', background: '#f8fafc', borderRadius: 20, marginBottom: 32, border: '1px solid rgba(0,0,0,0.02)' }}>
              <div style={{ color: STATUS_CONFIG[data.status]?.color, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                {STATUS_CONFIG[data.status]?.icon}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#000', marginBottom: 4 }}>
                {STATUS_CONFIG[data.status]?.label}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>ID: #{data.id}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['Team Name', data.team_name],
                ['Competition', `${data.competition_name}`],
                ['Category', data.vehicle_class],
                ['Contact Email', data.team_email],
                ['Submitted On', new Date(data.submitted_at).toLocaleDateString('en-IN')],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{value}</span>
                </div>
              ))}
            </div>

            {data.status === 'APPROVED' && (
              <div style={{ marginTop: 32, padding: 20, background: '#ecfdf5', borderRadius: 16, border: '1px solid #d1fae5', color: '#065f46', fontSize: 13, fontWeight: 600, display: 'flex', gap: 12 }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                Your account is ready! Please check your email for the login credentials.
              </div>
            )}

            {data.status === 'REJECTED' && data.rejection_reason && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#ef4444', marginBottom: 8 }}>Reason for Rejection</div>
                <div style={{ padding: '16px', border: '1px solid #fee2e2', borderRadius: 12, background: '#fef2f2', fontSize: 14, color: '#991b1b', lineHeight: 1.5, fontWeight: 500 }}>
                  {data.rejection_reason}
                </div>
                <Link to="/register" className="btn btn-primary" style={{ marginTop: 24, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Re-submit Registration</Link>
              </div>
            )}
            
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>Need help? Contact support@fmae.in</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
