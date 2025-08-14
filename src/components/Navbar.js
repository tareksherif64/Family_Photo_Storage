import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" className="nav-logo">
            📸 Family Photos
          </Link>
        </div>
        <div className="nav-user">
          <span className="user-name">
            {currentUser?.displayName || currentUser?.email}
          </span>
          <div className="nav-user-desktop-actions">
            <button
              onClick={toggleTheme}
              className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
        {/* Hamburger for mobile - moved to far right */}
        <button
          className={`nav-hamburger${menuOpen ? ' open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>
        <div className={`nav-menu${menuOpen ? ' open' : ''}${isDarkMode ? ' dark' : ''}`} id="nav-menu">
          <div className="nav-menu-inner">
            <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
              Gallery
            </Link>
            <Link to="/upload" className="nav-link" onClick={() => setMenuOpen(false)}>
              Upload
            </Link>
            <Link to="/profile" className="nav-link" onClick={() => setMenuOpen(false)}>
              Profile
            </Link>
            {/* Mobile-only: Theme toggle and logout */}
            <div className="nav-menu-mobile-actions">
              <button
                onClick={() => { toggleTheme(); }}
                className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="logout-button">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
