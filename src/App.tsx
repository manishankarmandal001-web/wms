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
import {
  subscribeToProducts,
  subscribeToClaims,
  fsCreateProduct,
  fsUpdateProduct,
  fsToggleProduct,
  fsDeleteProduct,
  fsCreateClaim,
  fsUpdateClaimStatus,
  fsResetAll
} from './firebase';

export const isLegacyDemoProduct = (p: any): boolean => {
  if (!p) return false;
  const idStr = String(p.id);
  const codeStr = String(p.code || '').toUpperCase();
  const titleStr = String(p.title || '').toLowerCase();
  return (
    idStr === '1' ||
    idStr === '2' ||
    idStr === '3' ||
    codeStr === 'AMZ-EAR-250' ||
    codeStr === 'FLP-WAT-350' ||
    codeStr === 'BLK-OIL-150' ||
    titleStr.includes('wireless bluetooth noise') ||
    titleStr.includes('smart amoled fitness') ||
    titleStr.includes('premium cold-pressed extra virgin')
  );
};

function MainApp() {
  const [customerTab, setCustomerTab] = useState<'offers' | 'my-claims'>('offers');
  const [customerView, setCustomerView] = useState<'customer-portal' | 'customer-login'>('customer-portal');

  // Shared Persistent Products State: initial read from localStorage (if exists), filtering demo products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !isLegacyDemoProduct(p));
        }
      }
      return [];
    } catch {
      return [];
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

  // 1. Google Cloud Firestore Real-time Multi-Device Sync (works 100% on Vercel across all phones & PCs)
  useEffect(() => {
    const unsubProducts = subscribeToProducts((liveProducts) => {
      const clean = liveProducts.filter((p) => !isLegacyDemoProduct(p));
      setProducts(clean);
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(clean));
      } catch {}
    });

    const unsubClaims = subscribeToClaims((liveClaims) => {
      setClaims(liveClaims);
      try {
        localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(liveClaims));
      } catch {}
    });

    return () => {
      unsubProducts();
      unsubClaims();
    };
  }, []);

  // 2. Server-Sent Events (SSE) for instant push when running on Node.js
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
                const clean = data.products.filter((p: any) => !isLegacyDemoProduct(p));
                setProducts(clean);
                try {
                  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(clean));
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
                const clean = data.payload.filter((p: any) => !isLegacyDemoProduct(p));
                setProducts(clean);
                try {
                  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(clean));
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
        const clean = serverProducts.filter((p) => !isLegacyDemoProduct(p));
        setProducts(clean);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(clean));
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
  // ADD PRODUCT: sends to Firestore (Vercel) + local server + updates state immediately
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'createdAt'>) => {
    const unifiedId = String(Date.now());
    const optimisticProduct: Product = {
      ...newProdData,
      id: unifiedId,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true
    };

    setProducts((prev) => {
      const next = [optimisticProduct, ...prev.filter((p) => !isLegacyDemoProduct(p))];
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    addToast('Product Added', `"${optimisticProduct.title}" is now live in Customer Portal.`, 'success');
    notifyOtherTabs();

    // 1. Persist to Google Cloud Firestore with unified ID (all devices on Vercel get instant real-time sync)
    try {
      await fsCreateProduct({ ...newProdData, id: unifiedId });
    } catch (err) {
      console.warn('Firestore product create notice:', err);
    }

    // 2. Persist to server API with unified ID
    try {
      await apiCreateProduct({ ...newProdData, id: unifiedId } as any);
    } catch {}
    notifyOtherTabs();
  };

  // EDIT PRODUCT: updates title, image, code, link, cashback immediately + saves to Firestore and server
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

    // 1. Google Cloud Firestore (Vercel)
    try {
      await fsUpdateProduct(updatedProduct);
    } catch (err) {
      console.warn('Firestore product update notice:', err);
    }

    // 2. Local Node server
    try {
      await apiUpdateProduct(updatedProduct);
    } catch {}
    notifyOtherTabs();
  };

  // TOGGLE STATUS
  const handleToggleProductStatus = async (productId: string | number) => {
    const targetProduct = products.find((p) => String(p.id) === String(productId));
    const currentActive = targetProduct?.isActive !== false;

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

    // 1. Firestore
    try {
      await fsToggleProduct(productId, currentActive);
    } catch {}

    // 2. Local Node server
    try {
      await apiToggleProduct(productId);
    } catch {}
    notifyOtherTabs();
  };

  // PERMANENT DELETE PRODUCT: permanently removes from Firestore, state, localStorage, and server!
  const handleDeleteProduct = async (productId: string | number) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    const prodCode = prod?.code;
    const prodTitle = prod?.title;

    setProducts((prev) => {
      const next = prev.filter(
        (p) => String(p.id) !== String(productId) && (!prodCode || p.code !== prodCode)
      );
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    addToast('Product Permanently Deleted', `"${prodTitle || 'Item'}" permanently removed.`, 'info');
    notifyOtherTabs();

    // 1. Permanently delete from Google Cloud Firestore (sweeps by doc id and product code so all devices sync instantly)
    try {
      await fsDeleteProduct(productId, prodCode);
    } catch (err) {
      console.warn('Firestore product deletion notice:', err);
    }

    // 2. Permanently remove from server storage
    try {
      await apiDeleteProduct(productId);
    } catch {}
    notifyOtherTabs();
  };

  // ================= CLAIM OPERATIONS =================
  // SUBMIT CLAIM: sends claim to Firestore & server immediately so admin sees it in real time
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

    // 1. Google Cloud Firestore
    try {
      const fsClaim = await fsCreateClaim(claimData);
      setClaims((prev) => {
        const next = prev.map((c) => (c.id === tempId ? fsClaim : c));
        try {
          localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      console.warn('Firestore claim create notice:', err);
    }

    // 2. Send to backend server
    try {
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
    } catch {}
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

    // 1. Persist to Firestore (Vercel)
    try {
      await fsUpdateClaimStatus(claimId, newStatus, adminNote, {
        isRefunded: isPaid ? true : (isRefunded === false ? false : undefined),
        refundedAt: isPaid ? nowIso : undefined
      });
    } catch (err) {
      console.warn('Firestore claim status update notice:', err);
    }

    // 2. Persist to server
    try {
      await apiUpdateClaimStatus(claimId, newStatus, adminNote, {
        isRefunded: isPaid ? true : (isRefunded === false ? false : undefined),
        refundedAt: isPaid ? nowIso : undefined
      });
    } catch {}
    notifyOtherTabs();
  };

  const handleViewProof = (claim: Claim, type: 'order' | 'payment' | 'rating') => {
    setInspectingClaim(claim);
    setInspectingType(type);
  };

  const handleResetData = async () => {
    if (window.confirm('Clear all products and submitted claims records across all devices?')) {
      try {
        await fsResetAll();
      } catch {}

      try {
        await apiResetData();
      } catch {}

      setProducts([]);
      setClaims([]);
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify([]));
      } catch {}
      addToast('Data Cleared', 'All products and records have been cleared from all devices.', 'info');
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
