import { Product, Claim } from '../types';

// Production Clean: No pre-loaded demo products
export const INITIAL_PRODUCTS: Product[] = [];

// Production Clean: No pre-loaded demo claims
export const INITIAL_CLAIMS: Claim[] = [];

export const STORAGE_KEYS = {
  PRODUCTS: 'wms_products_live_v1',
  CLAIMS: 'wms_claims_live_v1',
  USER: 'wms_user_live_v1'
};
