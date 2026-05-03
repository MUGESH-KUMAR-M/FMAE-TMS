import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { competitionAPI } from '../../services/api';
import { Trophy, CalendarDays, CheckCircle2, Archive } from 'lucide-react';

function CompModal({ comp, onClose, onSaved }) {
  const [form, setForm] = useState(comp || { code: '', name: '', vehicle_class: 'BOTH', description: '', status: 'DRAFT', start_date: '', end_date: '', deadlines: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addDeadline = () => setForm(f => ({ ...f, deadlines: [...(f.deadlines || []), { label: '', deadline_date: '' }] }));
  const setDl = (i, k, v) => setForm(f => {
    const dl = [...f.deadlines];
    dl[i] = { ...dl[i], [k]: v };
    return { ...f, deadlines: dl };
  });
  const removeDl = (i) => setForm(f => ({ ...f, deadlines: f.deadlines.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.code || !form.name || !form.vehicle_class) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (comp?.id) await competitionAPI.update(comp.id, form);
      else await competitionAPI.create(form);
      toast.success(comp?.id ? 'Competition updated!' : 'Competition created!');
      onSaved();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{comp?.id ? 'Edit' : 'Create'} Competition</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input className="form-input" value={form.code} onChange={e => set('code', e.target.value)} placeholder="FKDC" disabled={!!comp?.id} />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Formula Kart Design Challenge" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Vehicle Class *</label>
              <select className="form-input form-select" value={form.vehicle_class} onChange={e => set('vehicle_class', e.target.value)}>
                <option value="BOTH">Both EV & IC</option>
                <option value="EV">EV Only</option>
                <option value="IC">IC Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">End Date</label><input className="form-input" type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Description / Rules</label>
            <textarea className="form-input" rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>Key Deadlines</label>
              <button className="btn btn-ghost btn-sm" onClick={addDeadline}>+ Add</button>
            </div>
            {(form.deadlines || []).map((dl, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <input className="form-input" value={dl.label} onChange={e => setDl(i, 'label', e.target.value)} placeholder="e.g., Design Report Due" />
                <input className="form-input" type="date" value={dl.deadline_date} onChange={e => setDl(i, 'deadline_date', e.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeDl(i)}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperCompetitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    competitionAPI.getAllAdmin()
      .then(r => setCompetitions(r.data.competitions || []))
      .catch(() => toast.error('Failed to load competitions'))
      .finally(() => setLoading(false));
  };

  const del = async (id) => {
    if (!window.confirm('Delete this competition? This also removes related records.')) return;
    try {
      await competitionAPI.delete(id);
      toast.success('Competition deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  useEffect(() => { load(); }, []);

  const active = competitions.filter(c => c.status === 'ACTIVE').length;
  const draft = competitions.filter(c => c.status === 'DRAFT').length;
  const archived = competitions.filter(c => c.status === 'ARCHIVED').length;

  return (
    <div className="page" style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/baja_class_1777731976193.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', height: 190, marginBottom: -28, overflow: 'hidden' }}>
        <img src="/images/baja-bg.png" alt="Competitions Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 46, left: 28, right: 28 }}>
          <div className="badge badge-published" style={{ marginBottom: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none' }}>Super Admin</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#000' }}>Competition Control</h1>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1280 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <div className="card" style={{ background: '#fff' }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}>Total</div><div style={{ fontSize: 26, fontWeight: 900 }}>{competitions.length}</div></div>
          <div className="card" style={{ background: '#fff' }}><div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}><CheckCircle2 size={13} /> Active</div><div style={{ fontSize: 26, fontWeight: 900 }}>{active}</div></div>
          <div className="card" style={{ background: '#fff' }}><div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}><CalendarDays size={13} /> Draft</div><div style={{ fontSize: 26, fontWeight: 900 }}>{draft}</div></div>
          <div className="card" style={{ background: '#fff' }}><div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}><Archive size={13} /> Archived</div><div style={{ fontSize: 26, fontWeight: 900 }}>{archived}</div></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>Competitions</h2>
          <button className="btn btn-primary" onClick={() => setModal({})}>+ Create Competition</button>
        </div>

        {loading ? <div className="loading-page"><div className="spinner" /></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {competitions.map((c) => (
              <div key={c.id} className="card card-3d" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}>{c.code}</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{c.name}</div>
                  </div>
                  <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.62)', marginBottom: 10 }}>{c.description || 'No description provided.'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className="badge badge-ev">{c.vehicle_class}</span>
                  <span className="badge badge-draft">Regs: {c.total_registrations || 0}</span>
                  <span className="badge badge-draft">Approved: {c.approved_teams || 0}</span>
                  <span className="badge badge-draft">Tasks: {c.total_tasks || 0}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ ...c, deadlines: c.deadlines || [] })}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal !== null && <CompModal comp={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={load} />}
      </div>
    </div>
  );
}
