import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { taskAPI, competitionAPI, trackEventAPI, submissionAPI } from '../../services/api';
import { ArrowRight } from 'lucide-react';

const FILE_TYPES = ['PDF', 'PPT', 'PPTX', 'PNG', 'JPG', 'MP4', 'ZIP', 'DOCX', 'DOC'];

function CreateTaskModal({ competitions, onClose, onCreated }) {
  const [form, setForm] = useState({ competition_id: '', name: '', description: '', task_type: 'SUBMISSION', weight: '', max_score: '', allowed_file_types: [], due_date: '', status: 'DRAFT', formula_type: 'NONE' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleType = (t) => set('allowed_file_types', form.allowed_file_types.includes(t) ? form.allowed_file_types.filter(x => x !== t) : [...form.allowed_file_types, t]);

  const save = async () => {
    if (!form.competition_id || !form.name || !form.weight) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await taskAPI.create(form);
      toast.success('Task created!');
      onCreated();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Create Task</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Competition *</label>
              <select className="form-input form-select" value={form.competition_id} onChange={e => set('competition_id', e.target.value)}>
                <option value="">Select...</option>
                {competitions.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Task Type *</label>
              <select className="form-input form-select" value={form.task_type} onChange={e => set('task_type', e.target.value)}>
                <option value="SUBMISSION">Submission Task</option>
                <option value="TRACK_EVENT">Track Event</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Task Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Design Report Submission" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Task instructions..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Weight % *</label>
              <input className="form-input" type="number" min="1" max="100" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g., 20" />
            </div>
            {form.task_type === 'TRACK_EVENT' && (
              <div className="form-group">
                <label className="form-label">Max Score (Gap Fix)</label>
                <input className="form-input" type="number" value={form.max_score} onChange={e => set('max_score', e.target.value)} placeholder="e.g., 100" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          {form.task_type === 'TRACK_EVENT' && (
            <div className="form-group">
              <label className="form-label">Scoring Formula</label>
              <select className="form-input form-select" value={form.formula_type} onChange={e => set('formula_type', e.target.value)}>
                <option value="NONE">Manual Scoring</option>
                <option value="ACCELERATION">Acceleration (Max 75+4.5)</option>
                <option value="SKIDPAD">Skidpad (Max 71.5+3.5)</option>
                <option value="AUTOCROSS">Autocross (Max 118.5+6.5)</option>
                <option value="ENDURANCE">Endurance (Max 250)</option>
              </select>
              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>Note: Formulas automatically calculate Tmin/Tmax for all teams.</p>
            </div>
          )}
          {form.task_type === 'SUBMISSION' && (
            <div className="form-group">
              <label className="form-label">Allowed File Types</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {FILE_TYPES.map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.allowed_file_types.includes(t)} onChange={() => toggleType(t)} style={{ accentColor: '#fff' }} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published (notifies all teams)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [filter, setFilter] = useState({ competition_id: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [totalWeight, setTotalWeight] = useState(0);

  const load = () => {
    setLoading(true);
    const p = [taskAPI.getAll(filter), competitionAPI.getAll('ACTIVE')];
    if (filter.competition_id) p.push(taskAPI.getWeight(filter.competition_id));
    
    Promise.all(p)
      .then(([t, c, w]) => { 
        setTasks(t.data.tasks || []); 
        setCompetitions(c.data.competitions || []); 
        if (w) setTotalWeight(w.data.total_weight || 0);
        else setTotalWeight(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="page">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/images/classes/bsvc_class_1777732036212.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Task Manager</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Task</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select className="form-input form-select" style={{ maxWidth: 200 }} value={filter.competition_id} onChange={e => setFilter(f => ({ ...f, competition_id: e.target.value }))}>
          <option value="">All Competitions</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select className="form-input form-select" style={{ maxWidth: 140 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        
        {filter.competition_id && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.5)' }}>TOTAL WEIGHT:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 100, height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${totalWeight}%`, height: '100%', background: totalWeight > 100 ? '#ef4444' : '#10b981' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: totalWeight > 100 ? '#ef4444' : '#111' }}>{totalWeight}%</span>
            </div>
          </div>
        )}
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.length === 0 ? <div className="empty-state"><h3>No tasks yet</h3><p>Create your first task above</p></div> : tasks.map(task => (
            <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{task.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>
                  {task.task_type === 'SUBMISSION' ? 'Submission' : 'Track Event'} · {task.weight}% weight
                  {task.max_score > 0 && ` · Max Score: ${task.max_score}`}
                  {task.due_date && ` · Due ${new Date(task.due_date).toLocaleDateString('en-IN')}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${task.status === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>{task.status}</span>
                <a href={`/admin/tasks/${task.id}`} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Manage <ArrowRight size={13} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {showCreate && <CreateTaskModal competitions={competitions} onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
