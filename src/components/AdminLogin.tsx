import React, { useState } from 'react';
import { User } from '../types';
import {
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Lock,
  User as UserIcon,
  UserPlus,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

interface AdminLoginProps {
  onLogin: (user: User) => void;
  onSwitchToCustomer: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onSwitchToCustomer }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login states
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up states
  const [signUpName, setSignUpName] = useState('');
  const [signUpId, setSignUpId] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpMobile, setSignUpMobile] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [adminRole, setAdminRole] = useState<'Executive Admin' | 'Verification Auditor'>('Executive Admin');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Helper to get registered admins
  const getStoredAdmins = (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('wms_admins_live_v1') || '[]');
    } catch {
      return [];
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanId = loginId.trim().toLowerCase();

    // 1. Check default credentials
    if ((cleanId === 'admin' || cleanId === 'admin@wms-rewards.com') && loginPassword === 'admin123') {
      onLogin({
        name: 'Super Executive Admin',
        mobile: '1800-WMS-ADM',
        email: 'admin@wms-rewards.com',
        type: 'admin'
      });
      return;
    }

    // 2. Check registered admins
    const storedAdmins = getStoredAdmins();
    const matchedAdmin = storedAdmins.find(
      (a) =>
        (a.id.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId) &&
        a.password === loginPassword
    );

    if (matchedAdmin) {
      onLogin({
        name: matchedAdmin.name,
        mobile: matchedAdmin.mobile || '1800-WMS-ADM',
        email: matchedAdmin.email,
        type: 'admin'
      });
    } else {
      setError('Invalid Admin credentials! Use your registered Admin ID/Email & Password.');
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!signUpName.trim()) {
      setError('Please enter Admin full name.');
      return;
    }

    const cleanId = signUpId.trim().toLowerCase();
    if (cleanId.length < 3) {
      setError('Admin ID must be at least 3 characters.');
      return;
    }

    if (!signUpEmail.includes('@') || !signUpEmail.includes('.')) {
      setError('Please enter a valid Admin email.');
      return;
    }

    if (signUpPassword.length < 4) {
      setError('Admin password must be at least 4 characters.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match. Please re-check confirm password.');
      return;
    }

    const storedAdmins = getStoredAdmins();
    const existing = storedAdmins.some(
      (a) => a.id.toLowerCase() === cleanId || a.email.toLowerCase() === signUpEmail.trim().toLowerCase()
    );

    if (existing || cleanId === 'admin') {
      setError('An Admin with this ID or Email already exists. Please login instead.');
      return;
    }

    const newAdmin = {
      name: signUpName.trim(),
      id: cleanId,
      email: signUpEmail.trim().toLowerCase(),
      mobile: signUpMobile.trim() || '1800-WMS-ADM',
      password: signUpPassword,
      role: adminRole,
      createdAt: new Date().toISOString()
    };

    storedAdmins.push(newAdmin);
    localStorage.setItem('wms_admins_live_v1', JSON.stringify(storedAdmins));

    // Auto-login the newly created admin
    onLogin({
      name: newAdmin.name,
      mobile: newAdmin.mobile,
      email: newAdmin.email,
      type: 'admin'
    });
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      <div className="bg-white p-6 sm:p-9 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-900/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-slate-900 text-white mb-3 shadow-md">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Console Access</h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Management portal for verifying claims, toggling active products & disbursing payouts.
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Admin Login vs Admin Sign Up) */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin Sign Up</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Admin Login Form */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-700" /> Admin ID or Email
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter Admin ID or Email"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-700" /> Admin Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter Password"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Login to Admin Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {/* Tab 2: Admin Sign Up Form */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> Full Name *
              </label>
              <input
                type="text"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="e.g. Mani Shankar Mandal"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Admin ID *
                </label>
                <input
                  type="text"
                  value={signUpId}
                  onChange={(e) => setSignUpId(e.target.value)}
                  placeholder="e.g. admin_mani"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" /> Mobile
                </label>
                <input
                  type="tel"
                  value={signUpMobile}
                  onChange={(e) => setSignUpMobile(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> Official Email *
              </label>
              <input
                type="email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password *
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" /> Confirm *
                </label>
                <input
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Role Assignment
              </label>
              <select
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Executive Admin">Executive Admin (Full Controls)</option>
                <option value="Verification Auditor">Verification Auditor (Claim Approvals & Audits)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 group cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Admin Account & Open Dashboard</span>
            </button>
          </form>
        )}

        {/* Switch back to Customer Portal */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onSwitchToCustomer}
            className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1 font-semibold cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Switch back to Customer Portal
          </button>
        </div>
      </div>
    </div>
  );
};
