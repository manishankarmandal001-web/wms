import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, Claim, ClaimStatus } from './types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore using the configured database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validate connection on boot as mandated by Firebase skill
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice:', error.message);
    }
  }
}
testFirestoreConnection();

// Collection references
export const productsCol = collection(db, 'products');
export const claimsCol = collection(db, 'claims');

// Real-time synchronization helper for products
export function subscribeToProducts(callback: (products: Product[]) => void) {
  try {
    const q = query(productsCol);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          // Filter out any legacy demo products if lingering
          if (
            d.id === '1' ||
            d.id === '2' ||
            d.id === '3' ||
            data.code === 'AMZ-EAR-250' ||
            data.code === 'FLP-WAT-350' ||
            data.code === 'BLK-OIL-150'
          ) {
            // Silently skip legacy demo products
            return;
          }
          items.push({
            id: d.id,
            title: data.title || '',
            platform: data.platform || 'Amazon',
            code: data.code || '',
            cashbackAmount: Number(data.cashbackAmount) || 150,
            image: data.image || '',
            link: data.link || '',
            description: data.description || '',
            createdAt: data.createdAt || new Date().toISOString().split('T')[0],
            isActive: data.isActive !== false
          });
        });
        callback(items);
      },
      (err) => {
        console.warn('Firestore products subscribe error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to products:', err);
    return () => {};
  }
}

// Real-time synchronization helper for claims
export function subscribeToClaims(callback: (claims: Claim[]) => void) {
  try {
    const q = query(claimsCol);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Claim[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            productId: data.productId,
            productTitle: data.productTitle || '',
            platform: data.platform || '',
            systemCode: data.systemCode || '',
            specialCode: data.specialCode || '',
            customerName: data.customerName || '',
            customerMobile: data.customerMobile || '',
            customerEmail: data.customerEmail || '',
            orderImgData: data.orderImgData || '',
            paymentImgData: data.paymentImgData || '',
            ratingImgData: data.ratingImgData || '',
            upiId: data.upiId || '',
            cashbackAmount: Number(data.cashbackAmount) || 150,
            submittedAt: data.submittedAt || '',
            status: (data.status as ClaimStatus) || 'Pending',
            isRefunded: Boolean(data.isRefunded),
            refundedAt: data.refundedAt || undefined,
            paidAt: data.paidAt || undefined,
            adminNote: data.adminNote || data.rejectionReason || undefined
          });
        });
        callback(items);
      },
      (err) => {
        console.warn('Firestore claims subscribe error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to claims:', err);
    return () => {};
  }
}

// Firestore operations for Product
export async function fsCreateProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const id = String(Date.now());
  const createdAt = new Date().toISOString().split('T')[0];
  const newProduct: Product = {
    ...product,
    id,
    createdAt,
    isActive: product.isActive !== false
  };
  await setDoc(doc(db, 'products', id), newProduct);
  return newProduct;
}

export async function fsUpdateProduct(product: Product): Promise<void> {
  const id = String(product.id);
  await setDoc(doc(db, 'products', id), {
    ...product,
    id
  }, { merge: true });
}

export async function fsToggleProduct(id: string | number, currentActive: boolean): Promise<void> {
  const docRef = doc(db, 'products', String(id));
  await updateDoc(docRef, {
    isActive: !currentActive
  });
}

export async function fsDeleteProduct(id: string | number): Promise<void> {
  await deleteDoc(doc(db, 'products', String(id)));
}

// Firestore operations for Claims
export async function fsCreateClaim(claim: Omit<Claim, 'id' | 'submittedAt' | 'status'>): Promise<Claim> {
  const id = String(Date.now());
  const submittedAt = new Date().toISOString();
  const newClaim: Claim = {
    ...claim,
    id,
    submittedAt,
    status: 'Pending',
    isRefunded: false
  };
  await setDoc(doc(db, 'claims', id), newClaim);
  return newClaim;
}

export async function fsUpdateClaimStatus(
  claimId: string | number,
  status: ClaimStatus,
  adminNote?: string,
  extra?: { isRefunded?: boolean; refundedAt?: string }
): Promise<void> {
  const docRef = doc(db, 'claims', String(claimId));
  const updateData: any = { status };
  if (adminNote !== undefined) updateData.adminNote = adminNote;
  if (status === 'Approved') updateData.approvedAt = new Date().toISOString();
  if (status === 'Paid' || extra?.isRefunded === true) {
    updateData.isRefunded = true;
    updateData.refundedAt = extra?.refundedAt || new Date().toISOString();
    updateData.paidAt = new Date().toISOString();
  } else if (extra?.isRefunded === false) {
    updateData.isRefunded = false;
    updateData.refundedAt = null;
    updateData.paidAt = null;
  }
  await updateDoc(docRef, updateData);
}

export async function fsDeleteClaim(claimId: string | number): Promise<void> {
  await deleteDoc(doc(db, 'claims', String(claimId)));
}

// Reset data in Firestore: removes all products and all claims
export async function fsResetAll(): Promise<void> {
  const prodSnap = await getDocs(productsCol);
  const deleteProdPromises = prodSnap.docs.map((d) => deleteDoc(d.ref));
  const claimSnap = await getDocs(claimsCol);
  const deleteClaimPromises = claimSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all([...deleteProdPromises, ...deleteClaimPromises]);
}
