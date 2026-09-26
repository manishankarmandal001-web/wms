import React from 'react';
import { User } from '../types';
import { LogOut, Shield, User as UserIcon, UserPlus, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: 'customer-login' | 'customer-signup' | 'customer-portal' | 'admin-login' | 'admin-dashboard') => void;
  onLogout: () => void;
  onOpenDeployGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
  onOpenDeployGuide
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentUser) {
                  onNavigate(currentUser.type === 'admin' ? 'admin-dashboard' : 'customer-portal');
                } else {
                  onNavigate('customer-login');
                }
              }}
              className="flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                W
              </div>
              <div>
                <span className="text-lg font-black bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-700 bg-clip-text text-transparent">
                  WMS Portal
                </span>
                <span className="block text-[10px] text-slate-500 font-medium -mt-1">
                  Cashback & Rewards
                </span>
              </div>
            </button>
          </div>

          {/* Right Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!currentUser ? (
              <>
                <button
                  onClick={() => onNavigate('customer-login')}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'customer-login'
                      ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold'
                      : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-slate-600" />
                  <span>Login</span>
                </button>

                {/* Prominent Sign Up Button */}
                <button
                  onClick={() => onNavigate('customer-signup')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    currentView === 'customer-signup'
                      ? 'bg-indigo-700 text-white shadow-indigo-200 ring-2 ring-indigo-400'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </button>

                <button
                  onClick={() => onNavigate('admin-login')}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'admin-login'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {currentUser.type === 'admin' ? 'Executive Admin' : 'Customer Account'}
                    </span>
                  </div>
                </div>

                {currentUser.type === 'admin' ? (
                  <button
                    onClick={() => onNavigate('admin-dashboard')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      currentView === 'admin-dashboard'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('customer-portal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      currentView === 'customer-portal'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    My Portal
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
