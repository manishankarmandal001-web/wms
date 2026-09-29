import { Product, Claim, ClaimStatus } from '../types';

const BASE_URL = '';

export async function apiFetchProducts(): Promise<Product[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('apiFetchProducts error (fallback to local):', err);
    return null;
  }
}

export async function apiCreateProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.product || null;
  } catch (err) {
    console.error('apiCreateProduct error:', err);
    return null;
  }
}

export async function apiUpdateProduct(product: Product): Promise<Product | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.product || null;
  } catch (err) {
    console.error('apiUpdateProduct error:', err);
    return null;
  }
}

export async function apiToggleProduct(id: string | number): Promise<Product | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/products/${id}/toggle`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.product || null;
  } catch (err) {
    console.error('apiToggleProduct error:', err);
    return null;
  }
}

export async function apiDeleteProduct(id: string | number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/products/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('apiDeleteProduct error:', err);
    return false;
  }
}

export async function apiFetchClaims(): Promise<Claim[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/claims`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('apiFetchClaims error (fallback to local):', err);
    return null;
  }
}

export async function apiCreateClaim(claim: Omit<Claim, 'id' | 'submittedAt' | 'status'>): Promise<Claim | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claim)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.claim || null;
  } catch (err) {
    console.error('apiCreateClaim error:', err);
    return null;
  }
}

export async function apiUpdateClaimStatus(
  id: string | number,
  status: ClaimStatus,
  rejectionReason?: string,
  extra?: { isRefunded?: boolean; refundedAt?: string }
): Promise<Claim | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason, ...extra })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.claim || null;
  } catch (err) {
    console.error('apiUpdateClaimStatus error:', err);
    return null;
  }
}

export async function apiDeleteClaim(id: string | number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/claims/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('apiDeleteClaim error:', err);
    return false;
  }
}

export async function apiResetData(): Promise<{ products: Product[]; claims: Claim[] } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('apiResetData error:', err);
    return null;
  }
}
