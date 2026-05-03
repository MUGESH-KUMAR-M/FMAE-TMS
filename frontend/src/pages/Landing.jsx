import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MoveRight, CheckCircle2, Gauge, ShieldCheck, Trophy } from 'lucide-react';

// ── Competition List ───────────────────────────────────────────────────────────
const COMPETITIONS = [
  { code: 'FKDC', name: 'Formula Kart Design Challenge', classes: ['EV', 'IC'], image: '/images/classes/kart_class_1777731932413.png' },
  { code: 'DKDC', name: 'Design Kart Design Challenge', classes: ['EV', 'IC'], image: '/images/classes/kart_class_1777731932413.png' },
  { code: 'QBDC', name: 'Quad Bike Design Challenge', classes: ['EV', 'IC'], image: '/images/classes/quad_class_1777731958474.png' },
  { code: 'F.BAJA', name: 'Formula BAJA', classes: ['EV', 'IC'], image: '/images/classes/baja_class_1777731976193.png' },
  { code: 'FFS', name: 'Formula FS', classes: ['EV', 'IC'], image: '/images/classes/fs_class_1777731992056.png' },
  { code: 'F.MOTO.S', name: 'Formula Moto Sport', classes: ['EV', 'IC'], image: '/images/classes/moto_class_1777732019952.png' },
  { code: 'BSVC', name: 'BSVC', classes: ['EV'], image: '/images/classes/bsvc_class_1777732036212.png' },
];

function Hero3D() {
  const ringRef = useRef(null);
  const coreRef = useRef(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.35;
      ringRef.current.rotation.y += 0.006;
    }
    if (coreRef.current) {
      coreRef.current.rotation.z += 0.01;
      coreRef.current.rotation.x += 0.004;
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1} color="#ffffff" />
      <pointLight position={[-4, -2, -3]} intensity={0.8} color="#ffffff" />
      <Float speed={1.8} rotationIntensity={0.35} floatIntensity={0.7}>
        <mesh ref={ringRef} position={[1.4, 0.6, -1]}>
          <torusGeometry args={[1.7, 0.06, 24, 120]} />
          <meshStandardMaterial color="#111111" metalness={0.85} roughness={0.15} />
        </mesh>
      </Float>
      <mesh ref={coreRef} position={[-1.5, -0.1, -0.5]}>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#000000" wireframe />
      </mesh>
    </>
  );
}

export default function Landing() {
  const pageRef = useRef(null);
  const navbarRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroTextRef = useRef(null);
  const heroButtonsRef = useRef(null);
  const sectionRefs = useRef([]);
  const compRefs = useRef([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [heroTitleRef.current, heroTextRef.current, heroButtonsRef.current],
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power3.out',
        }
      );

      gsap.to(navbarRef.current, {
        backgroundColor: 'rgba(8,8,8,0.2)',
        borderBottomColor: 'rgba(255,255,255,0.16)',
        boxShadow: '0 14px 30px rgba(0,0,0,0.2)',
        scrollTrigger: {
          trigger: pageRef.current,
          start: 'top top',
          end: '+=140',
          scrub: true,
        },
      });

      sectionRefs.current.forEach((section) => {
        if (!section) return;
        gsap.fromTo(
          section,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 82%',
            },
          }
        );
      });

      compRefs.current.forEach((card, index) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            delay: index * 0.04,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
            },
          }
        );
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const applyTilt = (event, index) => {
    const card = compRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 12;
    const rotateX = ((y / rect.height) - 0.5) * -12;
    gsap.to(card, {
      rotateX,
      rotateY,
      transformPerspective: 1000,
      transformOrigin: 'center',
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const resetTilt = (index) => {
    const card = compRefs.current[index];
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.45, ease: 'power3.out' });
  };

  return (
    <div ref={pageRef} style={{ background: '#fff', minHeight: '100vh', color: '#000', overflowX: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.92)), url('/images/baja-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }} />
      <nav ref={navbarRef} style={{
        position: 'sticky', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '10px 22px',
        background: 'transparent',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 1280,
          minHeight: 66,
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px 0 20px',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: '#fff' }} />
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.3, color: '#fff' }}>
            FMAE - TMS
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <a href="#competitions" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: 'rgba(255,255,255,0.82)', padding: '8px 10px', borderRadius: 10 }}>Competitions</a>
          <a href="#cta" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: 'rgba(255,255,255,0.82)', padding: '8px 10px', borderRadius: 10 }}>Get Started</a>
        </div>
        <Link to="/login" style={{
          padding: '10px 18px', border: '1px solid rgba(255,255,255,0.26)',
          borderRadius: 14, fontSize: 13, fontWeight: 700, color: '#fff', marginRight: 8, background: 'rgba(255,255,255,0.06)'
        }}>Login</Link>
        <Link to="/register" style={{
          padding: '10px 18px', background: '#fff', color: '#000',
          borderRadius: 14, fontSize: 13, fontWeight: 800, border: '1px solid #fff'
        }}>Register Team</Link>
        </div>
      </nav>

      <section style={{ padding: '40px 24px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }} ref={(el) => { sectionRefs.current[0] = el; }}>
          <div style={{
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 30,
            overflow: 'hidden',
            background: '#fff',
            position: 'relative',
            minHeight: 580,
          }}>
            <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.95) 55%, #fff 92%)',
            pointerEvents: 'none'
            }} />
            <img src="/images/hero-bg.png" alt="FMAE Hero" style={{ width: '100%', height: 580, objectFit: 'cover', display: 'block', filter: 'grayscale(100%) contrast(115%)' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '42%' }}>
              <Canvas camera={{ position: [0, 0, 4], fov: 52 }}>
                <Hero3D />
              </Canvas>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', textAlign: 'left', padding: '0 44px' }}>
              <div style={{ maxWidth: 760 }}>
                <div ref={heroTitleRef} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  Formula / Motorsport Activity Event
                </div>
                <h1 style={{ fontSize: 'clamp(42px, 7vw, 96px)', lineHeight: 0.9, letterSpacing: -2.2, marginBottom: 14 }}>
                  FMAE TEAM MANAGEMENT
                  <br />
                  <span style={{ color: 'rgba(0,0,0,0.44)' }}>AGGRESSIVE COMPETITION OPS</span>
                </h1>
                <p ref={heroTextRef} style={{ maxWidth: 690, margin: '0 0 26px', color: 'rgba(0,0,0,0.68)', fontSize: 16, lineHeight: 1.55 }}>
                  High-impact workflow for team onboarding, engineering task control, live score approvals, and battle-ready leaderboard visibility.
                </p>
                <div ref={heroButtonsRef} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to="/register" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 24px',
                    background: '#000', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 999, boxShadow: '0 14px 30px rgba(0,0,0,0.22)'
                  }}>ENTER PLATFORM <MoveRight size={20} /></Link>
                  <Link to="/login" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 24px',
                    border: '1px solid rgba(0,0,0,0.2)', color: '#000', fontWeight: 700, fontSize: 14, borderRadius: 999
                  }}>Open Dashboard</Link>
                </div>
              </div>
            </div> 
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 66px' }}>
        <div style={{ position: 'relative', zIndex: 1 }} ref={(el) => { sectionRefs.current[1] = el; }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            { title: 'Registration Workflow', desc: 'Structured four-step onboarding with complete team details and billing capture.', icon: <CheckCircle2 size={16} /> },
            { title: 'Task Progress Tracking', desc: 'Weighted completion model to show real progress at every competition stage.', icon: <Gauge size={16} /> },
            { title: 'Live Leaderboard', desc: 'Track-event approvals update points and ranking in real-time.', icon: <Trophy size={16} /> },
            { title: 'Admin Operations', desc: 'Competition, finance, and super-admin controls in one secure dashboard.' },
          ].map((item) => (
            <div key={item.title} style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 18, padding: 20, background: '#fff', boxShadow: '0 10px 22px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {item.icon || <ShieldCheck size={16} />}
                <h3 style={{ fontSize: 18 }}>{item.title}</h3>
              </div>
              <p style={{ color: 'rgba(0,0,0,0.62)', fontSize: 14, lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      <section id="competitions" style={{ padding: '72px 24px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }} ref={(el) => { sectionRefs.current[2] = el; }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', marginBottom: 10, textAlign: 'center', letterSpacing: -1 }}>
            Choose Your Competition Class
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)', marginBottom: 28 }}>
            Each card shows the available class options for that event.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {COMPETITIONS.map((comp, index) => (
              <div
                key={comp.code}
                ref={(el) => { compRefs.current[index] = el; }}
                onMouseMove={(event) => applyTilt(event, index)}
                onMouseLeave={() => resetTilt(index)}
                style={{
                  border: '1px solid rgba(0,0,0,0.12)', borderRadius: 18, overflow: 'hidden',
                  background: '#fff', position: 'relative', boxShadow: '0 18px 30px rgba(0,0,0,0.05)', transformStyle: 'preserve-3d', willChange: 'transform'
                }}
              >
                <div style={{ position: 'relative', height: 170 }}>
                  <img src={comp.image} alt={`${comp.code} class`} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(112%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 65%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', left: 14, bottom: 12, color: '#fff' }}>
                    <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: 0.3 }}>{comp.code}</div>
                    <div style={{ fontSize: 12, opacity: 0.86 }}>Competition Event</div>
                  </div>
                </div>
                <div style={{ padding: '16px 16px 18px' }}>
                  <div style={{ fontSize: 15, color: 'rgba(0,0,0,0.7)', marginBottom: 14, lineHeight: 1.45, minHeight: 44, fontWeight: 500 }}>
                    {comp.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {comp.classes.map((cls) => (
                      <span key={cls} style={{
                        padding: '4px 10px', border: '1px solid rgba(0,0,0,0.2)',
                        borderRadius: 30, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: '#000'
                      }}>
                        {cls === 'EV' ? 'EV - Electric Vehicle' : 'IC - Internal Combustion'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" style={{ padding: '72px 24px', position: 'relative', zIndex: 1 }} ref={(el) => { sectionRefs.current[3] = el; }}>
        <div style={{ maxWidth: 940, margin: '0 auto', borderRadius: 24, border: '1px solid rgba(0,0,0,0.12)', padding: '44px 28px', textAlign: 'center', color: '#fff', overflow: 'hidden', position: 'relative' }}>
          <img src="/images/feature-1.png" alt="CTA background" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(112%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
          <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 60px)', lineHeight: 1, marginBottom: 14, letterSpacing: -1 }}>
            Ready To Join The Grid?
          </h2>
          <p style={{ maxWidth: 700, margin: '0 auto 20px', color: 'rgba(255,255,255,0.78)' }}>
            Start your team registration and manage every competition stage with a modern, focused workflow.
          </p>
          <Link to="/register" style={{
            display: 'inline-block', padding: '12px 24px',
            background: '#fff', color: '#000', fontWeight: 700,
            fontSize: 14, borderRadius: 999
          }}>Start Registration</Link>
          </div>
        </div>
      </section>

      <footer style={{
        maxWidth: 1280,
        margin: '0 auto 24px',
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 22,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        padding: '22px 22px',
        boxShadow: '0 14px 30px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: '#000' }} />
              <span style={{ fontWeight: 800, color: '#000', letterSpacing: 0.3 }}>FMAE-TMS</span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>Formula / Motorsport Activity Event Team Management System</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontWeight: 700, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#competitions" style={{ color: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>Competitions</a>
            <a href="#cta" style={{ color: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>Get Started</a>
            <Link to="/register" style={{ color: '#fff', background: '#000', border: '1px solid #000', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>Register</Link>
            <Link to="/login" style={{ color: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>Login</Link>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed rgba(0,0,0,0.14)', fontSize: 12, color: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>© 2026 FMAE-TMS. All rights reserved.</span>
          <span>Built for high-performance event operations.</span>
        </div>
      </footer>
    </div>
  );
}
