import React from 'react';
import './Header.css';
import { useAuthStore } from '../context/store';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <h1>FMAE-TMS</h1>
          <p>Facility Management & Asset Equipment Tracking System</p>
        </div>

        <nav className="header-nav">
          <a href="/">Dashboard</a>
          <a href="/assets">Assets</a>
          <a href="/tasks">Tasks</a>
          <a href="/reports">Reports</a>
        </nav>

        <div className="header-user">
          <span className="user-name">{user?.name || 'User'}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
