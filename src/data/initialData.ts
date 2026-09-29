import { Product, Claim } from '../types';

// All demo products removed as requested: catalog starts completely empty until Admin adds real products!
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CLAIMS: Claim[] = [];

// Incremented storage keys so that any client browser with cached demo products purges them immediately
export const STORAGE_KEYS = {
  PRODUCTS: 'wms_products_live_v2',
  CLAIMS: 'wms_claims_live_v2',
  USER: 'wms_user_live_v2',
  OLD_PRODUCTS: 'wms_products_live_v1',
  OLD_CLAIMS: 'wms_claims_live_v1'
};
