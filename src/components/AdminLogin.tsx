import React, { useState } from 'react';
import { User } from '../types';
import { ShieldAlert, ArrowRight, UserCheck, Lock, User as UserIcon } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (user: User) => void;
  onSwitchToCustomer: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onSwitchToCustomer }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (adminId.trim() === 'admin' && password === 'admin123') {
      onLogin({
        name: 'Executive Admin',
        mobile: '1800-WMS-ADM',
        email: 'admin@wms-rewards.com',
        type: 'admin'
      });
    } else {
      setError('Invalid Admin Credentials!');
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      <div className="bg-white p-7 sm:p-9 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-slate-900 text-white mb-3 shadow-md">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Console Access</h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Management portal for verifying image proofs, code matching & approving payouts.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-700" /> Admin ID
            </label>
            <input
              type="text"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Enter Admin ID"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* Switch to Customer */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onSwitchToCustomer}
            className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1 font-semibold"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Switch back to Customer Portal
          </button>
        </div>
      </div>
    </div>
  );
};
