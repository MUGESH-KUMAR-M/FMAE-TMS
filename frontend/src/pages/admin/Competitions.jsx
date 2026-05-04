import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { competitionAPI } from '../../services/api';
import { useAuthStore } from '../../context/store';

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry','Other'];

function CompModal({ comp, onClose, onSaved }) {
  const [form, setForm] = useState(comp || { code: '', name: '', vehicle_class: 'BOTH', description: '', status: 'DRAFT', start_date: '', end_date: '', deadlines: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addDeadline = () => setForm(f => ({ ...f, deadlines: [...(f.deadlines || []), { label: '', deadline_date: '' }] }));
  const setDl = (i, k, v) => setForm(f => {
    const dl = [...f.deadlines]; dl[i] = { ...dl[i], [k]: v }; return { ...f, deadlines: dl };
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
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
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

export default function AdminCompetitions() {
  const { user } = useAuthStore();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    competitionAPI.getAllAdmin().then(r => setCompetitions(r.data.competitions || [])).finally(() => setLoading(false));
  };
  const del = async (id) => {
    if (!window.confirm('Are you sure you want to delete this competition? This will remove all associated tasks and registrations.')) return;
    try {
      await competitionAPI.delete(id);
      toast.success('Competition deleted');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Event Settings</h1>
        {user?.role === 'SUPER_ADMIN' && (
          <button className="btn btn-primary" onClick={() => setModal({})}>+ Create Competition</button>
        )}
      </div>
      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Code</th><th>Name</th><th>Class</th><th>Status</th><th>Deadlines</th><th>Action</th></tr></thead>
            <tbody>
              {competitions.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 800, letterSpacing: 1 }}>{c.code}</td>
                  <td>{c.name}</td>
                  <td><span className="badge badge-ev">{c.vehicle_class}</span></td>
                  <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                  <td style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{c.deadlines?.length || 0} deadlines</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(user?.role === 'SUPER_ADMIN' || Number(c.id) === Number(user?.competition_id)) ? (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ ...c, deadlines: c.deadlines || [] })}>Edit</button>
                          {user?.role === 'SUPER_ADMIN' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(c.id)}>Delete</button>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', fontStyle: 'italic' }}>View Only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal !== null && <CompModal comp={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}
