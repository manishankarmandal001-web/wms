import React, { useState, useEffect } from 'react';
import { User, Product, Claim, ClaimStatus, ToastNotification } from './types';
import { Shield } from 'lucide-react';
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_PRODUCTS;
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

  // Sync across different browser tabs/windows in real time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.PRODUCTS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setProducts(updated);
          }
        } catch {}
      }
      if (e.key === STORAGE_KEYS.CLAIMS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setClaims(updated);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<
    'customer-login' | 'customer-portal' | 'admin-login' | 'admin-dashboard'
  >(() => {
    if (currentUser?.type === 'admin') return 'admin-dashboard';
    return 'customer-portal'; // Default to customer-portal so products are shown first!
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
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true
    };
    setProducts((prev) => [newProduct, ...prev]);
    addToast('Product Added', `"${newProduct.title}" is now available for customers.`, 'success');
  };

  const handleToggleProductStatus = (productId: string | number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const nextActive = p.isActive === false ? true : false;
          addToast(
            nextActive ? 'Product Activated' : 'Product Inactivated',
            `"${p.title}" is now ${nextActive ? 'Active (Live for customers)' : 'Inactive (Hidden from customers)'}.`,
            nextActive ? 'success' : 'info'
          );
          return { ...p, isActive: nextActive };
        }
        return p;
      })
    );
  };

  const handleDeleteProduct = (productId: string | number) => {
    const prod = products.find((p) => p.id === productId);
    if (window.confirm(`Are you sure you want to delete product "${prod?.title || 'this item'}"?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      addToast('Product Deleted', `Removed product from catalogue.`, 'info');
    }
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
      {/* Navigation Header - showing only "TBC WMS" */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={handleLogout}
        onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentView === 'customer-login' && (
          <CustomerLogin
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

        {currentView === 'customer-portal' && (
          <CustomerPortal
            currentUser={currentUser}
            products={products}
            claims={claims}
            onSubmitClaim={handleSubmitClaim}
            onViewProof={handleViewProof}
            onLogin={handleCustomerLogin}
            onLogout={handleLogout}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            products={products}
            claims={claims}
            onAddProduct={handleAddProduct}
            onToggleProductStatus={handleToggleProductStatus}
            onDeleteProduct={handleDeleteProduct}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            onViewProof={handleViewProof}
            onResetData={handleResetData}
            onLogout={handleLogout}
            onNotify={addToast}
            onSwitchToCustomerPortal={() => setCurrentView('customer-portal')}
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
            <button
              onClick={() => setCurrentView('admin-login')}
              className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Admin Portal Access</span>
            </button>
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
