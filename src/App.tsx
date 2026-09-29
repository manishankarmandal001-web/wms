import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ThemeProvider } from './context/ThemeContext';
import {
  apiFetchProducts,
  apiCreateProduct,
  apiUpdateProduct,
  apiToggleProduct,
  apiDeleteProduct,
  apiFetchClaims,
  apiCreateClaim,
  apiUpdateClaimStatus,
  apiResetData
} from './utils/api';

function MainApp() {
  const [customerTab, setCustomerTab] = useState<'offers' | 'my-claims'>('offers');
  const [customerView, setCustomerView] = useState<'customer-portal' | 'customer-login'>('customer-portal');

  // Shared Persistent Products State: initial read from localStorage (if exists)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed; // Allow empty array if user deleted all products!
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
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_CLAIMS;
    } catch {
      return INITIAL_CLAIMS;
    }
  });

  // Cross-tab broadcast channel for instant 0ms sync
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Clear legacy cached demo products on boot
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.OLD_PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.OLD_CLAIMS);
      localStorage.removeItem('wms_products_live_v1');
      localStorage.removeItem('wms_claims_live_v1');
    } catch {}
  }, []);

  // Server-Sent Events (SSE) for instant push across ALL devices (phones, tablets, PCs)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') {
              if (Array.isArray(data.products)) {
                setProducts(data.products);
                try {
                  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
                } catch {}
              }
              if (Array.isArray(data.claims)) {
                setClaims(data.claims);
                try {
                  localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(data.claims));
                } catch {}
              }
            } else if (data.type === 'PRODUCTS_UPDATED') {
              if (Array.isArray(data.payload)) {
                setProducts(data.payload);
                try {
                  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.payload));
                } catch {}
              }
            } else if (data.type === 'CLAIMS_UPDATED') {
              if (Array.isArray(data.payload)) {
                setClaims(data.payload);
                try {
                  localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(data.payload));
                } catch {}
              }
            }
          } catch (err) {
            console.warn('Error parsing SSE event:', err);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(setupSSE, 3000);
        };
      } catch (err) {
        console.warn('SSE connection failed, falling back to polling:', err);
      }
    };

    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('wms_sync_channel');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_ALL') {
          syncWithServer();
        }
      };
      return () => {
        channel.close();
      };
    }
  }, []);

  const notifyOtherTabs = useCallback(() => {
    try {
      broadcastChannelRef.current?.postMessage({ type: 'SYNC_ALL', timestamp: Date.now() });
    } catch {}
  }, []);

  // Fetch live products & claims from server
  const syncWithServer = useCallback(async () => {
    try {
      const [serverProducts, serverClaims] = await Promise.all([
        apiFetchProducts(),
        apiFetchClaims()
      ]);

      if (serverProducts !== null) {
        setProducts(serverProducts);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(serverProducts));
        } catch {}
      }

      if (serverClaims !== null) {
        setClaims(serverClaims);
        try {
          localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(serverClaims));
        } catch {}
      }
    } catch (e) {
      console.warn('Sync with server failed, using local cache:', e);
    }
  }, []);

  // Initial fetch on mount & background polling every 2.5s for real-time live sync across devices
  useEffect(() => {
    syncWithServer();

    const interval = setInterval(() => {
      syncWithServer();
    }, 2500);

    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Sync state across different browser tabs/windows via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.PRODUCTS && e.newValue !== null) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setProducts(updated);
        } catch {}
      }
      if (e.key === STORAGE_KEYS.CLAIMS && e.newValue !== null) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setClaims(updated);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  // ================= PRODUCT OPERATIONS =================
  // ADD PRODUCT: sends to backend + updates state immediately
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'createdAt'>) => {
    const tempId = Date.now();
    const optimisticProduct: Product = {
      ...newProdData,
      id: tempId,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true
    };

    setProducts((prev) => {
      const next = [optimisticProduct, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    addToast('Product Added', `"${optimisticProduct.title}" is now live in Customer Portal.`, 'success');
    notifyOtherTabs();

    // Persist to server
    const serverResult = await apiCreateProduct(newProdData);
    if (serverResult) {
      setProducts((prev) => {
        const next = prev.map((p) => (p.id === tempId ? serverResult : p));
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      notifyOtherTabs();
    }
  };

  // EDIT PRODUCT: updates title, image, code, link, cashback immediately + saves to server
  const handleEditProduct = async (updatedProduct: Product) => {
    setProducts((prev) => {
      const next = prev.map((p) =>
        String(p.id) === String(updatedProduct.id) ? updatedProduct : p
      );
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    addToast('Product Updated', `"${updatedProduct.title}" has been updated live.`, 'success');
    notifyOtherTabs();

    // Persist to server
    await apiUpdateProduct(updatedProduct);
    notifyOtherTabs();
  };

  // TOGGLE STATUS
  const handleToggleProductStatus = async (productId: string | number) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (String(p.id) === String(productId)) {
          const updated = !p.isActive;
          addToast(
            updated ? 'Deal Activated' : 'Deal Paused',
            `"${p.title}" is now ${updated ? 'active for customer claims' : 'paused'}.`,
            'info'
          );
          return { ...p, isActive: updated };
        }
        return p;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    notifyOtherTabs();
    await apiToggleProduct(productId);
    notifyOtherTabs();
  };

  // PERMANENT DELETE PRODUCT: permanently removes from state, localStorage, and server file!
  const handleDeleteProduct = async (productId: string | number) => {
    const prod = products.find((p) => String(p.id) === String(productId));

    setProducts((prev) => {
      const next = prev.filter((p) => String(p.id) !== String(productId));
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    addToast('Product Permanently Deleted', `"${prod?.title || 'Item'}" permanently removed.`, 'info');
    notifyOtherTabs();

    // Permanently remove from server storage
    await apiDeleteProduct(productId);
    notifyOtherTabs();
  };

  // ================= CLAIM OPERATIONS =================
  // SUBMIT CLAIM: sends claim to server immediately so admin sees it in real time
  const handleSubmitClaim = async (claimData: Omit<Claim, 'id' | 'submittedAt' | 'status'>) => {
    const tempId = Date.now();
    const optimisticClaim: Claim = {
      ...claimData,
      id: tempId,
      submittedAt: new Date().toISOString(),
      status: 'Pending'
    };

    setClaims((prev) => {
      const next = [optimisticClaim, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(next));
      } catch {}
      return next;
    });

    setCustomerTab('my-claims');
    addToast(
      'Claim Submitted!',
      'Your order screenshots & cashback claim have been sent for verification.',
      'success'
    );
    notifyOtherTabs();

    // Send to backend server
    const serverClaim = await apiCreateClaim(claimData);
    if (serverClaim) {
      setClaims((prev) => {
        const next = prev.map((c) => (c.id === tempId ? serverClaim : c));
        try {
          localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(next));
        } catch {}
        return next;
      });
      notifyOtherTabs();
    }
  };

  // UPDATE CLAIM STATUS
  const handleUpdateClaimStatus = async (
    claimId: string | number,
    newStatus: ClaimStatus,
    adminNote?: string,
    isRefunded?: boolean
  ) => {
    const isPaid = newStatus === 'Paid' || isRefunded === true;
    const nowIso = new Date().toISOString();

    setClaims((prev) => {
      const next = prev.map((c) => {
        if (String(c.id) === String(claimId)) {
          return {
            ...c,
            status: newStatus,
            adminNote: adminNote !== undefined ? adminNote : c.adminNote,
            isRefunded: isPaid ? true : (isRefunded !== undefined ? isRefunded : c.isRefunded),
            refundedAt: isPaid ? (c.refundedAt || nowIso) : (isRefunded === false ? undefined : c.refundedAt),
            paidAt: isPaid ? (c.paidAt || nowIso) : (isRefunded === false ? undefined : c.paidAt),
            processedAt: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          };
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (newStatus === 'Paid' || isRefunded === true) {
      addToast('Refund Confirmed (YES)', `Claim #${claimId}: Payment refund has been marked as PAID!`, 'success');
    } else if (newStatus === 'Approved') {
      addToast('Claim Approved', `Claim #${claimId} approved. You can click YES when refund is sent.`, 'success');
    } else if (isRefunded === false) {
      addToast('Refund Status Changed', `Claim #${claimId}: Marked as refund unpaid.`, 'info');
    } else {
      addToast('Claim Rejected', `Claim #${claimId} was marked as rejected.`, 'error');
    }
    notifyOtherTabs();

    // Persist to server
    await apiUpdateClaimStatus(claimId, newStatus, adminNote, {
      isRefunded: isPaid ? true : (isRefunded === false ? false : undefined),
      refundedAt: isPaid ? nowIso : undefined
    });
    notifyOtherTabs();
  };

  const handleViewProof = (claim: Claim, type: 'order' | 'payment' | 'rating') => {
    setInspectingClaim(claim);
    setInspectingType(type);
  };

  const handleResetData = async () => {
    if (window.confirm('Clear all products and submitted claims records?')) {
      const result = await apiResetData();
      if (result) {
        setProducts(result.products || []);
        setClaims(result.claims || []);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(result.products || []));
          localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(result.claims || []));
        } catch {}
      } else {
        setProducts([]);
        setClaims([]);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
          localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify([]));
        } catch {}
      }
      addToast('Data Cleared', 'All products and records have been cleared.', 'info');
      notifyOtherTabs();
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

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
