import React, { useState, useEffect } from 'react';
import { User, Product, Claim, ClaimStatus, ToastNotification } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CLAIMS,
  STORAGE_KEYS
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { CustomerLogin } from './components/CustomerLogin';
import { CustomerPortal } from './components/CustomerPortal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { LightboxModal } from './components/LightboxModal';
import { VercelDeployGuideModal } from './components/VercelDeployGuideModal';
import { Toast } from './components/Toast';

export default function App() {
  // Initialize state with localStorage fallbacks
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [claims, setClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLAIMS);
      return saved ? JSON.parse(saved) : INITIAL_CLAIMS;
    } catch {
      return INITIAL_CLAIMS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<
    'customer-login' | 'customer-signup' | 'customer-portal' | 'admin-login' | 'admin-dashboard'
  >(() => {
    if (currentUser?.type === 'admin') return 'admin-dashboard';
    if (currentUser?.type === 'customer') return 'customer-portal';
    return 'customer-login';
  });

  // Modal states
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);
  const [inspectingType, setInspectingType] = useState<'order' | 'payment' | 'rating'>('order');
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Sync products to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Storage quota exceeded for products', e);
    }
  }, [products]);

  // Sync claims to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
    } catch (e) {
      console.error('Storage quota exceeded for claims', e);
    }
  }, [claims]);

  // Sync user to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [currentUser]);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCustomerLogin = (user: User, isNewRegistration: boolean = false) => {
    setCurrentUser(user);
    setCurrentView('customer-portal');
    if (isNewRegistration) {
      addToast(
        'Account Created!',
        `Welcome to WMS Portal, ${user.name}! You can now claim cashback rewards.`,
        'success'
      );
    } else {
      addToast('Login Successful', `Welcome back, ${user.name}!`);
    }
  };

  const handleAdminLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('admin-dashboard');
    addToast('Admin Authenticated', 'Access granted to WMS Executive Console.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('customer-login');
    addToast('Logged Out', 'You have been safely logged out.', 'info');
  };

  const handleAddProduct = (newProdData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProducts((prev) => [newProduct, ...prev]);
    addToast('Product Added', `"${newProduct.title}" is now available for customers.`);
  };

  const handleSubmitClaim = (claimData: Omit<Claim, 'id' | 'submittedAt' | 'status'>) => {
    const now = new Date();
    const dateFormatted = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newClaim: Claim = {
      ...claimData,
      id: 1000 + claims.length + 1,
      status: 'Pending',
      submittedAt: dateFormatted
    };

    setClaims((prev) => [newClaim, ...prev]);
    addToast(
      'Claim Submitted!',
      'Your screenshot proofs and UPI details have been uploaded for Admin Approval.'
    );
  };

  const handleUpdateClaimStatus = (
    claimId: string | number,
    newStatus: ClaimStatus,
    adminNote?: string
  ) => {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.id === claimId) {
          return {
            ...c,
            status: newStatus,
            adminNote: adminNote || c.adminNote,
            processedAt: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          };
        }
        return c;
      })
    );

    if (newStatus === 'Approved') {
      addToast('Claim Approved', `Claim #${claimId} verified. Cashback payment released to UPI.`);
    } else {
      addToast('Claim Rejected', `Claim #${claimId} was rejected with remarks recorded.`, 'error');
    }
  };

  const handleViewProof = (claim: Claim, type: 'order' | 'payment' | 'rating') => {
    setInspectingClaim(claim);
    setInspectingType(type);
  };

  const handleResetData = () => {
    if (window.confirm('Clear all products and submitted claims records?')) {
      setProducts([]);
      setClaims([]);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.CLAIMS);
      addToast('Data Cleared', 'All products and claims records have been cleared.', 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-indigo-500 selection:text-white font-sans">
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={handleLogout}
        onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {(currentView === 'customer-login' || currentView === 'customer-signup') && (
          <CustomerLogin
            initialMode={currentView === 'customer-signup' ? 'signup' : 'login'}
            onLogin={handleCustomerLogin}
            onSwitchToAdmin={() => setCurrentView('admin-login')}
          />
        )}

        {currentView === 'admin-login' && (
          <AdminLogin
            onLogin={handleAdminLogin}
            onSwitchToCustomer={() => setCurrentView('customer-login')}
          />
        )}

        {currentView === 'customer-portal' && currentUser && (
          <CustomerPortal
            currentUser={currentUser}
            products={products}
            claims={claims}
            onSubmitClaim={handleSubmitClaim}
            onViewProof={handleViewProof}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            products={products}
            claims={claims}
            onAddProduct={handleAddProduct}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            onViewProof={handleViewProof}
            onResetData={handleResetData}
            onNotify={addToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
              W
            </div>
            <span className="font-bold text-slate-700">WMS Cashback & Rewards Portal</span>
            <span>•</span>
            <span className="text-slate-400">Verified Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Customer & Admin Verified Platform</span>
          </div>
        </div>
      </footer>

      {/* Proof Lightbox Modal */}
      <LightboxModal
        claim={inspectingClaim}
        initialType={inspectingType}
        onClose={() => setInspectingClaim(null)}
      />

      {/* Vercel Deploy Guide Modal */}
      <VercelDeployGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
        onCopyNotice={(msg) => addToast('Copied to Clipboard', msg, 'info')}
      />

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
