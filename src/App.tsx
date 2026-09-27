import React, { useState, useEffect } from 'react';
import { User, Product, Claim, ClaimStatus, ToastNotification } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CLAIMS,
  STORAGE_KEYS
} from './data/initialData';
import { CustomerApp } from './apps/CustomerApp';
import { AdminApp } from './apps/AdminApp';
import { LightboxModal } from './components/LightboxModal';
import { VercelDeployGuideModal } from './components/VercelDeployGuideModal';
import { Toast } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [customerTab, setCustomerTab] = useState<'offers' | 'my-claims'>('offers');
  const [customerView, setCustomerView] = useState<'customer-portal' | 'customer-login'>('customer-portal');

  // Shared Persistent Products State
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

  // Shared Persistent Claims State
  const [claims, setClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLAIMS);
      return saved ? JSON.parse(saved) : INITIAL_CLAIMS;
    } catch {
      return INITIAL_CLAIMS;
    }
  });

  // Sync state in real time across different browser tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.PRODUCTS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setProducts(updated);
        } catch {}
      }
      if (e.key === STORAGE_KEYS.CLAIMS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setClaims(updated);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save products on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Error saving products to localStorage', e);
    }
  }, [products]);

  // Save claims on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
    } catch (e) {
      console.error('Error saving claims to localStorage', e);
    }
  }, [claims]);

  // Current logged in user (customer or admin)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Save user session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.error('Error updating current user in localStorage', e);
    }
  }, [currentUser]);

  // Check if current route is dedicated to Admin App
  const checkIsAdminApp = () => {
    if (typeof window === 'undefined') return false;
    try {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const isSession = sessionStorage.getItem('wms_admin_session') === 'true';
      return (
        search.includes('admin') ||
        hash.includes('admin') ||
        path.includes('/admin') ||
        isSession
      );
    } catch {
      return false;
    }
  };

  const [activeApp, setActiveApp] = useState<'customer' | 'admin'>(() => {
    return checkIsAdminApp() ? 'admin' : 'customer';
  });

  // Listen for direct URL navigation changes
  useEffect(() => {
    const handleUrlChange = () => {
      const isAdmin = checkIsAdminApp();
      setActiveApp(isAdmin ? 'admin' : 'customer');
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Keyboard shortcut for owner: Ctrl+Shift+A opens Admin App
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        switchToAdminApp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const switchToAdminApp = () => {
    setActiveApp('admin');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('wms_admin_session', 'true');
        const url = new URL(window.location.href);
        url.hash = 'admin';
        window.history.pushState({}, '', url.toString());
      } catch {}
    }
  };

  const switchToCustomerApp = () => {
    setActiveApp('customer');
    setCustomerView('customer-portal');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('wms_admin_session');
        const url = new URL(window.location.href);
        url.searchParams.delete('admin');
        url.searchParams.delete('app');
        if (url.hash.includes('admin')) {
          url.hash = '';
        }
        window.history.pushState({}, '', url.toString());
      } catch {}
    }
  };

  // Toast System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };
  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Modal inspection states
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);
  const [inspectingType, setInspectingType] = useState<'order' | 'payment' | 'rating'>('order');
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);

  // Handlers for Authentication
  const handleCustomerLogin = (user: User) => {
    setCurrentUser(user);
    setCustomerView('customer-portal');
    addToast('Welcome!', `Logged in successfully as ${user.name}`);
  };

  const handleAdminLogin = (user: User) => {
    setCurrentUser(user);
    addToast('Admin Authenticated', `Welcome to Admin Console, ${user.name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    addToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  // Product Operations
  const handleAddProduct = (newProdData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true
    };
    setProducts((prev) => [newProduct, ...prev]);
    addToast('Product Added', `"${newProduct.title}" is now live in Customer App.`, 'success');
  };

  const handleEditProduct = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    addToast('Product Updated', `"${updatedProduct.title}" has been updated.`, 'success');
  };

  const handleToggleProductStatus = (productId: string | number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = !p.isActive;
          addToast(
            updated ? 'Deal Activated' : 'Deal Paused',
            `"${p.title}" is now ${updated ? 'active for customer claims' : 'paused'}.`,
            'info'
          );
          return { ...p, isActive: updated };
        }
        return p;
      })
    );
  };

  const handleDeleteProduct = (productId: string | number) => {
    const prod = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    addToast('Product Deleted', `"${prod?.title || 'Item'}" removed from catalog.`, 'info');
  };

  // Claim Operations
  const handleSubmitClaim = (claimData: Omit<Claim, 'id' | 'submittedAt' | 'status'>) => {
    const newClaim: Claim = {
      ...claimData,
      id: Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'Pending'
    };
    setClaims((prev) => [newClaim, ...prev]);
    setCustomerTab('my-claims');
    addToast(
      'Claim Submitted!',
      'Your order screenshots & cashback claim have been sent for verification.',
      'success'
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
      addToast('Claim Approved', `Claim #${claimId} approved & cashback released.`, 'success');
    } else {
      addToast('Claim Rejected', `Claim #${claimId} was marked as rejected.`, 'error');
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
    <>
      {activeApp === 'admin' ? (
        /* 🛡️ STANDALONE DEDICATED ADMIN APP */
        <AdminApp
          products={products}
          claims={claims}
          currentUser={currentUser}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleLogout}
          onAddProduct={handleAddProduct}
          onEditProduct={handleEditProduct}
          onToggleProductStatus={handleToggleProductStatus}
          onDeleteProduct={handleDeleteProduct}
          onUpdateClaimStatus={handleUpdateClaimStatus}
          onViewProof={handleViewProof}
          onResetData={handleResetData}
          onNotify={addToast}
          onOpenCustomerApp={switchToCustomerApp}
        />
      ) : (
        /* 🛒 STANDALONE DEDICATED CUSTOMER APP */
        <CustomerApp
          products={products}
          claims={claims}
          currentUser={currentUser}
          currentView={customerView}
          onNavigate={(view) => setCustomerView(view)}
          customerTab={customerTab}
          onSetCustomerTab={setCustomerTab}
          onCustomerLogin={handleCustomerLogin}
          onCustomerLogout={handleLogout}
          onSubmitClaim={handleSubmitClaim}
          onViewProof={handleViewProof}
          onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
          onOpenQuickClaim={() => {
            setCustomerView('customer-portal');
            setCustomerTab('offers');
            addToast('Choose an Offer', 'Click "Claim Cashback" on any verified product below.', 'info');
          }}
        />
      )}

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

      {/* Floating System Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Connectivity Status Pill */}
      <OfflineIndicator />
    </>
  );
}
