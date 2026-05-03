import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { 
  LayoutDashboard, Users, Trophy, ClipboardList, 
  CheckSquare, CreditCard, Medal, Shield, LogOut, 
  Search, Bell, ChevronDown
} from 'lucide-react';
import './Layout.css';
import { notificationAPI } from '../services/api';
import { joinUser, onNotification } from '../services/socket';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const NAV_CONFIGS = {
  SUPER_ADMIN: [
    { label: 'PLATFORM', items: [
      { to: '/superadmin', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { to: '/superadmin/users', label: 'Team Accounts', icon: <Users size={18} /> },
      { to: '/finance', label: 'Financial Records', icon: <CreditCard size={18} /> },
    ]},
    { label: 'EVENTS', items: [
      { to: '/superadmin/competitions', label: 'Competition Hub', icon: <Trophy size={18} /> },
      { to: '/admin/registrations', label: 'Team Rosters', icon: <ClipboardList size={18} /> },
      { to: '/admin/tasks', label: 'Requirement List', icon: <CheckSquare size={18} /> },
    ]}
  ],
  ADMIN_COMPETITION: [
    { label: 'MANAGEMENT', items: [
      { to: '/admin', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { to: '/admin/registrations', label: 'Team Rosters', icon: <ClipboardList size={18} /> },
    ]},
    { label: 'TRACKING', items: [
      { to: '/admin/competitions', label: 'Events List', icon: <Trophy size={18} /> },
      { to: '/admin/tasks', label: 'Requirement List', icon: <CheckSquare size={18} /> },
      { to: '/admin/teams', label: 'Team Accounts', icon: <Users size={18} /> },
      { to: '/judge', label: 'Event Standings', icon: <Medal size={18} /> },
    ]}
  ],
  ADMIN_FINANCE: [
    { label: 'ACCOUNTING', items: [
      { to: '/finance', label: 'Payment Gateway', icon: <CreditCard size={18} /> },
    ]}
  ],
  TEAM: [
    { label: 'WORKSPACE', items: [
      { to: '/team', label: 'Team Dashboard', icon: <LayoutDashboard size={18} /> },
      { to: '/team/leaderboard', label: 'Live Standings', icon: <Medal size={18} /> },
    ]}
  ],
  JUDGE: [
    { label: 'RANKINGS', items: [
      { to: '/judge', label: 'Event Standings', icon: <Medal size={18} /> },
    ]}
  ],
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_COMPETITION: 'Event Lead',
  ADMIN_FINANCE: 'Finance Head',
  TEAM: 'Team Access',
  JUDGE: 'Official Judge',
};

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const navSections = NAV_CONFIGS[user?.role] || [];
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      if (res.data.success) setNotifications(res.data.notifications);
    } catch (e) { console.error('Failed to load notifications', e); }
  };

  useEffect(() => {
    if (user?.id) {
      joinUser(user.id);
      loadNotifications();
      
      const unsubscribe = onNotification((notif) => {
        setNotifications(prev => [notif, ...prev]);
        toast(notif.message, { icon: <Bell size={14} />, duration: 4000 });
      });
      return unsubscribe;
    }
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  const fullName = user?.name || '';
  const nameParts = fullName.split(' ');
  const displayName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : fullName;
  const userInitials = displayName.charAt(0) || 'U';
  const PAGE_TITLES = {
    '/superadmin': 'Super Admin Dashboard',
    '/superadmin/users': 'User Management',
    '/superadmin/competitions': 'Competition Control',
    '/admin': 'Competition Admin Dashboard',
    '/admin/registrations': 'Registration Queue',
    '/admin/competitions': 'Competition Setup',
    '/admin/tasks': 'Task Control',
    '/admin/teams': 'Team Management',
    '/finance': 'Finance Dashboard',
    '/judge': 'Judge Dashboard',
    '/team': 'Team Dashboard',
    '/team/leaderboard': 'Leaderboard',
  };
  const currentTitle = PAGE_TITLES[location.pathname] || 'Control Panel';

  return (
    <div className="layout-wrapper">
      {/* Premium Fixed Sidebar */}
      <aside className="sidebar">
        <div className="brand-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: 99, background: '#000' }} />
            <div className="brand-title">FMAE-TMS</div>
          </div>
          <div className="brand-subtitle" style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 800 }}>MOTORS SPORTS</div>
        </div>
        
        <nav style={{ flex: 1 }}>
          {navSections.map((section, idx) => (
            <div key={idx}>
              <div className="nav-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin' || item.to === '/superadmin' || item.to === '/team'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 16px 10px' }}>
          <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {ROLE_LABELS[user?.role]}
          </div>
        </div>
      </aside>

      {/* Glass Top Navbar (Landing-style centered container) */}
      <nav className="top-navbar-shell">
        <div className="top-navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="search-container">
              <Search size={18} color="rgba(0,0,0,0.5)" />
              <input className="search-input" type="text" placeholder="Global search..." />
            </div>
            <div className="top-title-chip">
              <span className="top-title-dot" />
              <span>{currentTitle}</span>
            </div>
          </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.6)', position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, background: '#ef4444', color: '#fff', borderRadius: '50%', border: '2px solid #fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {showNotifications && (
              <div className="profile-dropdown" style={{ width: 360, right: -60 }}>
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Notifications</div>
                  <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: 13, fontWeight: 600 }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markRead(n.id)}
                        style={{ 
                          padding: '16px 20px', 
                          borderBottom: '1px solid rgba(0,0,0,0.02)', 
                          cursor: 'pointer',
                          background: n.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.03)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.03)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: n.is_read ? '#444' : '#000' }}>{n.title}</div>
                          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)', lineHeight: 1.4, fontWeight: 500 }}>{n.message}</div>
                        {!n.is_read && <div style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', marginTop: 8 }} />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }} ref={menuRef}>
            <div className="profile-pill" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111', lineHeight: 1 }}>{displayName}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', marginTop: 3 }}>Live Now</div>
              </div>
              <div className="avatar-block">{userInitials}</div>
              <ChevronDown size={16} color="rgba(0,0,0,0.5)" />
            </div>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.04)', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#000', marginBottom: 2 }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)', fontWeight: 600, marginBottom: 12 }}>{user?.email}</div>
                  <div style={{ background: '#000', color: '#fff', padding: '4px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800, display: 'inline-block', textTransform: 'uppercase' }}>
                    {ROLE_LABELS[user?.role]}
                  </div>
                </div>
                <div style={{ padding: '8px' }}>
                  <button className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/change-password'); }}>
                    <Shield size={18} /> Privacy & Security
                  </button>
                  <button className="dropdown-item" style={{ color: '#ef4444' }} onClick={handleLogout}>
                    <LogOut size={18} /> Terminate Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
