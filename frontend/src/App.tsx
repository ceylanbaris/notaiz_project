/* ── Notaiz — App Layout & Router ── */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  BarChart3,
  History as HistoryIcon,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { getStoredUser, getStoredToken, logout } from './services/api';
import type { User as UserType } from './types';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
import Home from './pages/Home';
import AnalysisPage from './pages/Analysis';
import ResultsPage from './pages/Results';
import HistoryPage from './pages/History';
import AuthPage from './pages/Auth';

/* ── Navbar ── */
function Navbar() {
  const [user, setUser] = useState<UserType | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
  }, [location]);

  const navLinks = [
    { path: '/', label: 'Ana Sayfa', icon: Music },
    { path: '/history', label: 'Geçmiş', icon: HistoryIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="section-container flex items-center justify-between py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            <Music size={18} className="text-white" />
          </div>
          <span className="text-xl font-display font-bold gradient-text tracking-tight">
            Notaiz
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User / Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || ''}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User size={16} className="text-slate-400" />
                )}
                <span className="text-sm text-slate-300">{user.name || user.email}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Çıkış Yap"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="btn-primary !py-2 !px-5 !text-sm"
            >
              Giriş Yap
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 overflow-hidden"
          >
            <div className="section-container py-4 flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive(link.path)
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                    navigate('/');
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <LogOut size={18} />
                  Çıkış Yap
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary text-center !text-sm mt-2"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ── Main App ── */
export default function App() {
  return (
    <>
      {/* Animated background blobs */}
      <div className="animated-bg" aria-hidden="true" />

      {/* Navbar */}
      <Navbar />

      {/* Pages */}
      <main className="page-container flex-1">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/analysis/:id" element={<AnalysisPage />} />
              <Route path="/results/:id" element={<ResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="section-container text-center">
          <p className="text-xs text-slate-500">
            © 2026 Notaiz — Sakarya Üniversitesi, Bilişim Sistemleri Mühendisliği
          </p>
          <p className="text-xs text-slate-600 mt-1">
            TÜBİTAK 2209-A Projesi • Barış CEYLAN & Mehmet Emin UÇAN
          </p>
        </div>
      </footer>
    </>
  );
}
