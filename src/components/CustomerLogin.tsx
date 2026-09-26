import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ArrowRight, UserCheck, ShieldCheck, Phone, Mail, Lock, User as UserIcon, UserPlus, CheckCircle2 } from 'lucide-react';

interface CustomerLoginProps {
  initialMode?: 'login' | 'signup';
  onLogin: (user: User, isNewRegistration?: boolean) => void;
  onSwitchToAdmin: () => void;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({
  initialMode = 'login',
  onLogin,
  onSwitchToAdmin
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Sync mode if initialMode changes from parent (e.g. Navbar click)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }

      if (!email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address.');
        return;
      }

      if (password.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-check confirm password.');
        return;
      }

      if (!agreedTerms) {
        setError('Please agree to the cashback reward policy.');
        return;
      }

      // Save to registered users storage
      try {
        const existingUsers = JSON.parse(localStorage.getItem('wms_registered_users_live_v1') || '[]');
        const alreadyExists = existingUsers.some(
          (u: any) => u.mobile === cleanMobile || u.email === email.trim().toLowerCase()
        );

        if (alreadyExists) {
          setError('An account with this mobile number or email already exists. Please log in instead.');
          return;
        }

        const newUser = {
          name: name.trim(),
          mobile: cleanMobile,
          email: email.trim().toLowerCase(),
          password,
          createdAt: new Date().toISOString()
        };

        existingUsers.push(newUser);
        localStorage.setItem('wms_registered_users_live_v1', JSON.stringify(existingUsers));
      } catch (err) {
        console.error('Storage error', err);
      }

      onLogin(
        {
          name: name.trim(),
          mobile: cleanMobile,
          email: email.trim().toLowerCase(),
          type: 'customer'
        },
        true
      );
    } else {
      // Login mode
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }

      if (!password) {
        setError('Please enter your password.');
        return;
      }

      // Check registered users if available
      let userEmail = email.trim().toLowerCase();
      try {
        const existingUsers = JSON.parse(localStorage.getItem('wms_registered_users_live_v1') || '[]');
        const found = existingUsers.find((u: any) => u.mobile === cleanMobile);
        if (found) {
          userEmail = found.email;
        }
      } catch (err) {
        console.error('Error finding user', err);
      }

      onLogin(
        {
          name: name.trim(),
          mobile: cleanMobile,
          email: userEmail || `${cleanMobile}@customer.wms`,
          type: 'customer'
        },
        false
      );
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      <div className="bg-white p-6 sm:p-9 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Mode Selector Tabs (Log In vs Sign Up) */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Customer Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up (Register)</span>
          </button>
        </div>

        {/* Header Content */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
            {mode === 'signup' ? <UserPlus className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'signup' ? 'Create Customer Account' : 'Customer Login'}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            {mode === 'signup'
              ? 'Sign up in 30 seconds to claim cashback on verified merchant purchases.'
              : 'Enter your credentials to claim cashbacks. OTP is not required.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600" /> 10-Digit Mobile Number *
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address {mode === 'signup' ? '*' : '(Optional)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required={mode === 'signup'}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer">
                I agree to the cashback reward policy and genuine order screenshot proof verification rules.
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 group cursor-pointer"
          >
            {mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account & Start Claiming</span>
              </>
            ) : (
              <>
                <span>Access Customer Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Signup */}
        <div className="mt-5 text-center text-xs text-slate-600">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Sign Up here
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Log In to your account
              </button>
            </p>
          )}
        </div>

        {/* Switch to Admin */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Switch to Admin Console
          </button>
        </div>
      </div>
    </div>
  );
};
