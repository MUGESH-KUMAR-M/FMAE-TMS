import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { registrationAPI, competitionAPI } from '../services/api';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry','Other'];
const STEPS = [
  { num: 1, label: 'Acknowledgement' },
  { num: 2, label: 'Team Details' },
  { num: 3, label: 'Members' },
  { num: 4, label: 'Billing' },
];

const TERMS = `FMAE-TMS PARTICIPATION TERMS & CONDITIONS

1. ELIGIBILITY: Only registered student teams from recognized educational institutions may participate in FMAE competitions.

2. TEAM COMPOSITION: Each team must have a designated Captain and Manager. Faculty Advisor is optional but recommended.

3. REGISTRATION: Each team may register for only ONE competition. Registration details must be accurate and truthful.

4. CODE OF CONDUCT: All teams must maintain professional conduct throughout the competition lifecycle. Any form of cheating, data falsification, or misconduct will result in immediate disqualification.

5. TASK SUBMISSION: Teams are responsible for submitting all required documents and materials by the specified deadlines. Late submissions may not be accepted.

6. TRACK EVENT VALUES: Once a team approves a track event value recorded by the admin, the value is final and cannot be disputed or changed.

7. DATA USAGE: By registering, you consent to FMAE using your team information for competition management, communication, and public leaderboard display.

8. PAYMENT: Registration fees must be paid within the specified timeline. Teams with unpaid fees may be restricted from certain competition activities.

9. AMENDMENTS: FMAE reserves the right to modify competition rules, deadlines, or scoring criteria with prior notice to registered teams.

10. CONTACT: For queries, contact support@fmae.in. Official communications will only be sent to the registered team email.`;

export default function Register() {
  const [step, setStep] = useState(1);
  const [competitions, setCompetitions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const [form, setForm] = useState({
    // Step 1
    agreed: false,
    // Step 2
    competition_id: '', vehicle_class: '', team_name: '', college_name: '',
    city: '', state: '', country: 'India', team_email: '', email_declared: false,
    instagram_handle: '',
    // Step 3
    captain_name: '', captain_phone: '', captain_email: '',
    manager_name: '', manager_phone: '', manager_email: '',
    advisor_name: '', advisor_phone: '', advisor_email: '',
    // Step 4 — Gap Fix: all 7 billing fields
    billing_name: '', billing_address_line1: '', billing_address_line2: '',
    billing_city: '', billing_state: '', billing_pin: '', billing_gst: '',
  });
  const [errors, setErrors] = useState({});
  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  useEffect(() => {
    competitionAPI.getAll('ACTIVE').then(({ data }) => setCompetitions(data.competitions || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = (k) => errors[k] ? <span className="form-error">{errors[k]}</span> : null;

  const selectedComp = competitions.find(c => String(c.id) === String(form.competition_id));
  const isBSVC = selectedComp?.code === 'BSVC';

  const validate = () => {
    const e = {};
    if (step === 1 && !form.agreed) e.agreed = 'You must agree to the terms';
    if (step === 2) {
      if (!form.competition_id) e.competition_id = 'Select a competition';
      if (!form.vehicle_class) e.vehicle_class = 'Select vehicle class';
      if (!form.team_name) e.team_name = 'Team name is required';
      if (!form.college_name) e.college_name = 'College name is required';
      if (!form.city) e.city = 'City is required';
      if (!form.state) e.state = 'State is required';
      if (!form.team_email) e.team_email = 'Team email is required';
      if (!form.email_declared) e.email_declared = 'Declare this is your official team email';
    }
    if (step === 3) {
      if (!form.captain_name) e.captain_name = 'Captain name required';
      if (!form.captain_phone) e.captain_phone = 'Captain phone required';
      if (!form.captain_email) e.captain_email = 'Captain email required';
      if (!form.manager_name) e.manager_name = 'Manager name required';
      if (!form.manager_phone) e.manager_phone = 'Manager phone required';
      if (!form.manager_email) e.manager_email = 'Manager email required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const prev = () => { setStep(s => s - 1); setErrors({}); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await registrationAPI.submit(form);
      setSubmittedId(data.registration_id);
      toast.success('Registration submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit, sans-serif' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: 520, width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, padding: '56px 48px', textAlign: 'center', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}>
          <div style={{ background: '#f0fdf4', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', margin: '0 auto 24px' }}>
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#000', letterSpacing: -1, marginBottom: 12 }}>Registration Sent!</h2>
          <p style={{ color: 'rgba(0,0,0,0.5)', marginBottom: 8, fontWeight: 600 }}>Your details have been submitted for review.</p>
          <p style={{ color: 'rgba(0,0,0,0.5)', marginBottom: 24, fontWeight: 500 }}>Our team will verify your application and send your login credentials to:</p>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderRadius: 16, margin: '24px 0', fontWeight: 800, color: '#111', border: '1px solid #f1f5f9' }}>{form.team_email}</div>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.3)', marginBottom: 40, fontWeight: 600 }}>Response time: 2–3 business days</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/registration-status/${submittedId}`} className="btn btn-primary" style={{ padding: '14px 28px', textDecoration: 'none' }}>Track Submission</Link>
            <Link to="/" className="btn btn-ghost" style={{ padding: '14px 28px', textDecoration: 'none' }}>Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const stepCardStyle = {
    background: 'rgba(255,255,255,0.92)',
    padding: 32,
    borderRadius: 18,
    border: '1px solid rgba(0,0,0,0.12)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 14px 40px rgba(0,0,0,0.10)',
  };

  return (
    <div className="register-page" style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, sans-serif', color: '#000' }}>
      {/* Background Image */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/images/register-bg.png)',
        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.62, filter: 'grayscale(100%) contrast(112%)'
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.72) 100%)' }} />
      <motion.div
        initial={{ opacity: 0.25, scale: 1 }}
        animate={{ opacity: 0.35, scale: 1.06 }}
        transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          right: '-6%',
          top: '20%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 68%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 2, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 18px', background: 'transparent' }}>
        <div style={{ width: '100%', maxWidth: 980, minHeight: 52, display: 'flex', alignItems: 'center', padding: '0 16px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 16, background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(12px)' }}>
          <Link to="/" style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1.2, color: '#000' }}>FMAE-TMS</Link>
          <span style={{ marginLeft: 12, fontSize: 12, color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>Team Registration</span>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 18,
            position: 'relative',
            height: 150,
            boxShadow: '0 10px 26px rgba(0,0,0,0.08)',
          }}
        >
          <img
            src="/images/login-bg.png"
            alt="Registration visual"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(108%)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.15) 70%)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', color: '#fff' }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700, opacity: 0.9 }}>FMAE Registration Workflow</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>Team Onboarding Portal</div>
          </div>
        </motion.div>

        {/* Step Indicators */}
        <div style={{ marginBottom: 34, padding: 18, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 16, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Registration Progress</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.65)' }}>Step {step} of 4</div>
          </div>
          <div style={{ width: '100%', height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: '#000', transition: 'width 0.35s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                border: `1px solid ${step >= s.num ? '#000' : 'rgba(0,0,0,0.15)'}`,
                background: step === s.num ? '#000' : '#fff',
                color: step === s.num ? '#fff' : '#000',
                borderRadius: 10, padding: '8px 10px', fontSize: 11, fontWeight: 700,
              }}>
                <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, background: step === s.num ? '#fff' : '#000', color: step === s.num ? '#000' : '#fff', fontSize: 10 }}>
                  {step > s.num ? <Check size={11} /> : s.num}
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* ── STEP 1: Acknowledgement ───────────────────────────────── */}
            {step === 1 && (
              <div style={stepCardStyle}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 110 }}>
                  <img src="/images/feature-1.png" alt="Acknowledgement" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(110%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                  <div style={{ position: 'absolute', left: 14, bottom: 10, color: '#fff', fontSize: 13, fontWeight: 700 }}>Read & Confirm Participation Terms</div>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#000' }}>Acknowledgement</h2>
                <p style={{ color: 'rgba(0,0,0,0.6)', marginBottom: 24 }}>Please read and accept the FMAE Terms & Conditions before proceeding.</p>
                <div style={{
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12,
                  padding: 24, maxHeight: 320, overflowY: 'auto',
                  background: 'rgba(255,255,255,0.6)', marginBottom: 24,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)'
                }}>
                  <pre style={{ fontSize: 12, color: 'rgba(0,0,0,0.7)', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'inherit' }}>
                    {TERMS}
                  </pre>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: '#000', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.agreed} onChange={e => set('agreed', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#000' }} />
                  <span>I have read and agree to the FMAE Terms & Conditions and Competition Rules.</span>
                </label>
                {err('agreed')}
              </div>
            )}

            {/* ── STEP 2: Team Details ──────────────────────────────────── */}
            {step === 2 && (
              <div style={stepCardStyle}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 110 }}>
                  <img src="/images/classes/baja_class_1777731976193.png" alt="Team details" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(110%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                  <div style={{ position: 'absolute', left: 14, bottom: 10, color: '#fff', fontSize: 13, fontWeight: 700 }}>Competition & Team Information</div>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: '#000' }}>Team Details</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Competition *</label>
                      <select className="form-input form-select" value={form.competition_id} onChange={e => { set('competition_id', e.target.value); set('vehicle_class', ''); }}>
                        <option value="">Select Competition</option>
                        {competitions.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                      </select>
                      {err('competition_id')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vehicle Class *</label>
                      <select className="form-input form-select" value={form.vehicle_class} onChange={e => set('vehicle_class', e.target.value)} disabled={!form.competition_id}>
                        <option value="">Select Class</option>
                        {selectedComp && (
                          <>
                            <option value="EV">EV — Electric Vehicle</option>
                            {!isBSVC && <option value="IC">IC — Internal Combustion</option>}
                          </>
                        )}
                      </select>
                      {isBSVC && <span className="form-hint">BSVC is EV class only</span>}
                      {err('vehicle_class')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team Name *</label>
                    <input className="form-input" value={form.team_name} onChange={e => set('team_name', e.target.value)} placeholder="e.g., Team Alpha" />
                    {err('team_name')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">College/University Name *</label>
                    <input className="form-input" value={form.college_name} onChange={e => set('college_name', e.target.value)} placeholder="e.g., MIT Manipal" />
                    {err('college_name')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g., Manipal" />
                      {err('city')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">State *</label>
                      <select className="form-input form-select" value={form.state} onChange={e => set('state', e.target.value)}>
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {err('state')}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Team Email * <span style={{ color: 'rgba(0,0,0,0.5)', fontWeight: 400 }}>(login credentials sent here)</span></label>
                      <input className="form-input" type="email" value={form.team_email} onChange={e => set('team_email', e.target.value)} placeholder="team@college.edu" />
                      {err('team_email')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Instagram (optional)</label>
                      <input className="form-input" value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} placeholder="@handle" />
                    </div>
                  </div>
                  <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start', color: '#000', fontWeight: 500 }}>
                    <input type="checkbox" checked={form.email_declared} onChange={e => set('email_declared', e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: '#000' }} />
                    <span style={{ fontSize: 13 }}>I declare this is the official team email. All login credentials and notifications will be sent to this email.</span>
                  </label>
                  {err('email_declared')}
                </div>
              </div>
            )}

            {/* ── STEP 3: Captain / Manager / Advisor ──────────────────── */}
            {step === 3 && (
              <div style={stepCardStyle}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 110 }}>
                  <img src="/images/classes/fs_class_1777731992056.png" alt="Members" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(110%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                  <div style={{ position: 'absolute', left: 14, bottom: 10, color: '#fff', fontSize: 13, fontWeight: 700 }}>Captain, Manager & Advisor Contacts</div>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: '#000' }}>Team Members</h2>
                {[
                  { title: 'Captain', prefix: 'captain', required: true },
                  { title: 'Manager', prefix: 'manager', required: true },
                  { title: 'Faculty Advisor', prefix: 'advisor', required: false },
                ].map(({ title, prefix, required }) => (
                  <div key={prefix} style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(0,0,0,0.6)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {title}
                      {required ? <span style={{ color: '#ef4444', fontSize: 10 }}>REQUIRED</span> : <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: 10 }}>OPTIONAL</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Full Name {required && '*'}</label>
                        <input className="form-input" value={form[`${prefix}_name`]} onChange={e => set(`${prefix}_name`, e.target.value)} placeholder={`${title} name`} />
                        {err(`${prefix}_name`)}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone {required && '*'}</label>
                        <input className="form-input" value={form[`${prefix}_phone`]} onChange={e => set(`${prefix}_phone`, e.target.value)} placeholder="+91 " type="tel" />
                        {err(`${prefix}_phone`)}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email {required && '*'}</label>
                        <input className="form-input" type="email" value={form[`${prefix}_email`]} onChange={e => set(`${prefix}_email`, e.target.value)} placeholder={`${prefix}@college.edu`} />
                        {err(`${prefix}_email`)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 4: Billing Details ────────────────────────────────── */}
            {step === 4 && (
              <div style={stepCardStyle}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 110 }}>
                  <img src="/images/classes/bsvc_class_1777732036212.png" alt="Billing" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(110%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                  <div style={{ position: 'absolute', left: 14, bottom: 10, color: '#fff', fontSize: 13, fontWeight: 700 }}>Invoice & Billing Information</div>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#000' }}>Billing Details</h2>
                <div className="alert alert-warning" style={{ marginBottom: 24 }}>
                  If billing details are not provided, no invoice requests will be accepted in future.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Billing Name <span className="form-hint">(authority under which invoice should be generated)</span></label>
                    <input className="form-input" value={form.billing_name} onChange={e => set('billing_name', e.target.value)} placeholder="e.g., MIT Manipal Institute of Technology" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Address Line 1</label>
                    <input className="form-input" value={form.billing_address_line1} onChange={e => set('billing_address_line1', e.target.value)} placeholder="Street, Building" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Address Line 2</label>
                    <input className="form-input" value={form.billing_address_line2} onChange={e => set('billing_address_line2', e.target.value)} placeholder="Area, Landmark" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-input" value={form.billing_city} onChange={e => set('billing_city', e.target.value)} placeholder="City" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <select className="form-input form-select" value={form.billing_state} onChange={e => set('billing_state', e.target.value)}>
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">PIN Code</label>
                      <input className="form-input" value={form.billing_pin} onChange={e => set('billing_pin', e.target.value)} placeholder="000000" maxLength={6} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Number <span className="form-hint">(college/university GST if invoice required under institution name)</span></label>
                    <input className="form-input" value={form.billing_gst} onChange={e => set('billing_gst', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <div>
            {step > 1 && <button className="btn btn-outline" style={{ borderColor: '#000', color: '#000', display: 'flex', alignItems: 'center', gap: 8 }} onClick={prev}><ChevronLeft size={16} /> Back</button>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>Step {step} of 4</span>
            {step < 4
              ? <motion.button className="btn btn-primary" onClick={next} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Next <ChevronRight size={16} />
                </motion.button>
              : <motion.button className="btn btn-primary" onClick={submit} disabled={submitting} whileHover={{ scale: 1.02 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting...</> : <>Submit Registration <Check size={16} /></>}
                </motion.button>
            }
          </div>
        </div>
      </div>
      <style>{`
        .register-page .form-label { color: rgba(0,0,0,0.82) !important; font-weight: 700; }
        .register-page .form-hint { color: rgba(0,0,0,0.55) !important; }
        .register-page .form-input {
          color: #111 !important;
          background: rgba(255,255,255,0.95) !important;
          border: 1px solid rgba(0,0,0,0.16) !important;
          box-shadow: none !important;
        }
        .register-page .form-input::placeholder { color: rgba(0,0,0,0.45) !important; }
        .register-page .form-input:focus {
          border-color: #000 !important;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.08) !important;
        }
        .register-page .btn.btn-primary {
          background: #000 !important;
          color: #fff !important;
          border-color: #000 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
