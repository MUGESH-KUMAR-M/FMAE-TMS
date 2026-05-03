import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taskAPI, trackEventAPI, submissionAPI, competitionAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const FILE_TYPES = ['PDF', 'PPT', 'PPTX', 'PNG', 'JPG', 'MP4', 'ZIP', 'DOCX', 'DOC'];

function TaskModal({ task, competitions, onClose, onSaved }) {
  const [form, setForm] = useState(task || { competition_id: '', name: '', description: '', task_type: 'SUBMISSION', weight: '', max_score: '', allowed_file_types: [], due_date: '', status: 'DRAFT', formula_type: 'NONE' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleType = (t) => set('allowed_file_types', form.allowed_file_types.includes(t) ? form.allowed_file_types.filter(x => x !== t) : [...form.allowed_file_types, t]);

  const save = async () => {
    if (!form.competition_id || !form.name || !form.weight) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (task?.id) await taskAPI.update(task.id, form);
      else await taskAPI.create(form);
      toast.success(task?.id ? 'Task updated!' : 'Task created!');
      onSaved();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{task?.id ? 'Edit' : 'Create'} Task</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Competition *</label>
              <select className="form-input form-select" value={form.competition_id} onChange={e => set('competition_id', e.target.value)} disabled={!!task?.id}>
                <option value="">Select...</option>
                {competitions.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Task Type *</label>
              <select className="form-input form-select" value={form.task_type} onChange={e => set('task_type', e.target.value)} disabled={!!task?.id}>
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
            <textarea className="form-input" rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Task instructions..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Weight % *</label>
              <input className="form-input" type="number" min="1" max="100" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g., 20" />
            </div>
            {form.task_type === 'TRACK_EVENT' && (
              <div className="form-group">
                <label className="form-label">Max Score</label>
                <input className="form-input" type="number" value={form.max_score || ''} onChange={e => set('max_score', e.target.value)} placeholder="e.g., 100" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due_date ? form.due_date.split('T')[0] : ''} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          {form.task_type === 'TRACK_EVENT' && (
            <div className="form-group">
              <label className="form-label">Scoring Formula</label>
              <select className="form-input form-select" value={form.formula_type || 'NONE'} onChange={e => set('formula_type', e.target.value)}>
                <option value="NONE">Manual Scoring</option>
                <option value="ACCELERATION">Acceleration (Max 75+4.5)</option>
                <option value="SKIDPAD">Skidpad (Max 71.5+3.5)</option>
                <option value="AUTOCROSS">Autocross (Max 118.5+6.5)</option>
                <option value="ENDURANCE">Endurance (Max 250)</option>
              </select>
            </div>
          )}
          {form.task_type === 'SUBMISSION' && (
            <div className="form-group">
              <label className="form-label">Allowed File Types</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {FILE_TYPES.map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.allowed_file_types?.includes(t)} onChange={() => toggleType(t)} style={{ accentColor: '#fff' }} />
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
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gap Fix: Admin Track Event Entry UI — per-team value entry table
function TrackEventEntry({ taskId, formulaType }) {
  const [data, setData] = useState({ track_events: [], unentered_teams: [] });
  const [entries, setEntries] = useState({});
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    trackEventAPI.getTeams(taskId)
      .then(r => { setData(r.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [taskId]);

  const save = async (registrationId, teamId) => {
    const entry = entries[registrationId];
    if (!entry?.value) { toast.error('Enter a value'); return; }
    setSaving(registrationId);
    try {
      await trackEventAPI.enter(taskId, {
        registration_id: registrationId,
        admin_value: entry.value,
        admin_value_unit: entry.unit || (formulaType !== 'NONE' ? 'sec' : ''),
        score: parseInt(entry.score) || 0,
        admin_time: formulaType !== 'NONE' ? parseFloat(entry.value) : null,
      });
      toast.success('Value entered — team notified via email');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this track event entry?')) return;
    try {
      await trackEventAPI.delete(id);
      toast.success('Entry deleted');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="loading-page" style={{ minHeight: 200 }}><div className="spinner" /></div>;

  return (
    <div>
      {/* Already-entered values */}
      {data.track_events.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="text-uppercase text-muted mb-8">Entered Values</div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Team</th><th>College</th><th>Class</th><th>Value</th><th>Score</th><th>Status</th></tr></thead>
              <tbody>
                {data.track_events.map(te => (
                  <tr key={te.id}>
                    <td style={{ fontWeight: 600 }}>{te.team_name}</td>
                    <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>{te.college_name}</td>
                    <td><span className={`badge badge-${te.vehicle_class?.toLowerCase()}`}>{te.vehicle_class}</span></td>
                    <td style={{ fontWeight: 700 }}>{te.admin_value} {te.admin_value_unit}</td>
                    <td>{te.score}</td>
                    <td><span className={`badge ${te.approved ? 'badge-approved' : 'badge-pending'}`}>{te.approved ? 'Approved' : 'Awaiting Team'}</span></td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(te.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teams without values entered */}
      {data.unentered_teams.length > 0 && (
        <div>
          <div className="text-uppercase text-muted mb-8">Enter Values</div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Team</th><th>College</th><th>Class</th><th>{formulaType !== 'NONE' ? 'Time (sec)' : 'Value'}</th>{formulaType === 'NONE' && <th>Unit</th>}<th>Score</th><th>Action</th></tr></thead>
              <tbody>
                {data.unentered_teams.map(team => (
                  <tr key={team.registration_id}>
                    <td style={{ fontWeight: 600 }}>{team.team_name}</td>
                    <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>{team.college_name}</td>
                    <td><span className={`badge badge-${team.vehicle_class?.toLowerCase()}`}>{team.vehicle_class}</span></td>
                    <td>
                      <input className="form-input" style={{ width: 100, padding: '6px 10px' }} placeholder="3.82"
                        value={entries[team.registration_id]?.value || ''}
                        onChange={e => setEntries(prev => ({ ...prev, [team.registration_id]: { ...(prev[team.registration_id] || {}), value: e.target.value } }))} />
                    </td>
                    {formulaType === 'NONE' && (
                      <td>
                        <input className="form-input" style={{ width: 80, padding: '6px 10px' }} placeholder="sec"
                          value={entries[team.registration_id]?.unit || ''}
                          onChange={e => setEntries(prev => ({ ...prev, [team.registration_id]: { ...(prev[team.registration_id] || {}), unit: e.target.value } }))} />
                      </td>
                    )}
                    <td>
                      <input className="form-input" type="number" style={{ width: 80, padding: '6px 10px' }} placeholder={formulaType !== 'NONE' ? 'Auto' : 'Score'}
                        disabled={formulaType !== 'NONE'}
                        value={entries[team.registration_id]?.score || ''}
                        onChange={e => setEntries(prev => ({ ...prev, [team.registration_id]: { ...(prev[team.registration_id] || {}), score: e.target.value } }))} />
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => save(team.registration_id, team.team_id)} disabled={saving === team.registration_id}>
                        {saving === team.registration_id ? '…' : 'Enter'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data.track_events.length === 0 && data.unentered_teams.length === 0 && (
        <div className="empty-state"><h3>No approved teams yet</h3></div>
      )}
    </div>
  );
}

export default function AdminTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([taskAPI.getOne(id), taskAPI.getSubmissions(id), competitionAPI.getAll()])
      .then(([t, s, c]) => { 
        setTask(t.data.task); 
        setSubmissions(s.data.submissions || []); 
        setCompetitions(c.data.competitions || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const delSubmission = async (sid) => {
    if (!window.confirm('Delete this submission permanently? The file will be removed from the server.')) return;
    try {
      await submissionAPI.delete(sid);
      toast.success('Submission deleted');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  const del = async () => {
    if (!window.confirm('Are you sure you want to delete this task? All submissions and track scores will be lost.')) return;
    try {
      await taskAPI.delete(id);
      toast.success('Task deleted');
      navigate('/admin/tasks');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!task) return <div className="page"><div className="alert alert-danger">Task not found</div></div>;

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div className="text-uppercase text-muted mb-8">{task.task_type === 'SUBMISSION' ? 'Submission Task' : 'Track Event Task'}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{task.name}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit Task</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={del}>Delete</button>
            <span className={`badge ${task.status === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>{task.status}</span>
            <span className="badge badge-ev">{task.weight}% weight</span>
            {task.max_score > 0 && <span className="badge">Max: {task.max_score} pts</span>}
          </div>
        </div>
        {task.description && <p style={{ color: 'rgba(0,0,0,0.5)', marginTop: 8 }}>{task.description}</p>}
      </div>

      {showEdit && <TaskModal task={task} competitions={competitions} onClose={() => setShowEdit(false)} onSaved={load} />}

      {task.task_type === 'TRACK_EVENT' ? (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Track Event Entry — Per Team ({task.formula_type !== 'NONE' ? task.formula_type : 'Manual'})</h2>
          <TrackEventEntry taskId={id} formulaType={task.formula_type} />
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Submissions ({submissions.length})</h2>
            {task.allowed_file_types?.length > 0 && (
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>
                Accepted: {task.allowed_file_types.join(', ')}
              </div>
            )}
          </div>
          {submissions.length === 0 ? (
            <div className="empty-state"><h3>No submissions yet</h3></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Team</th><th>College</th><th>File</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {submissions.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.team_name}</td>
                      <td style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>{s.college_name}</td>
                      <td style={{ fontSize: 13 }}>{s.file_name}</td>
                      <td style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{new Date(s.submitted_at).toLocaleDateString('en-IN')}</td>
                      <td><span className={`badge badge-${s.status === 'NEEDS_RESUBMISSION' ? 'pending' : 'submitted'}`}>{s.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={async () => {
                            const r = await submissionAPI.download(s.id);
                            const url = URL.createObjectURL(r.data);
                            const a = document.createElement('a'); a.href = url; a.download = s.file_name; a.click();
                          }}>↓</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => delSubmission(s.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
