import React from 'react';
import { User } from '../types';

interface NavbarProps {
  currentUser?: User | null;
  currentView?: string;
  onNavigate?: (view: 'customer-login' | 'customer-portal' | 'admin-login' | 'admin-dashboard') => void;
  onLogout?: () => void;
  onOpenDeployGuide?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Header showing exclusively "TBC WMS" as requested */}
          <div
            onClick={() => onNavigate && onNavigate('customer-portal')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              T
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              TBC WMS
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
