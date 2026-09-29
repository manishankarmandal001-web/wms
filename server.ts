import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Catalog starts completely empty: only real products added by Admin exist
const INITIAL_PRODUCTS: any[] = [];

interface DatabaseSchema {
  products: any[];
  claims: any[];
}

function ensureDataFile(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        products: INITIAL_PRODUCTS,
        claims: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims : []
    };
  } catch (err) {
    console.error('Error reading/initializing database file:', err);
    return {
      products: [],
      claims: []
    };
  }
}

function saveDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

async function startServer() {
  const app = express();

  // Connected SSE clients across all devices (phones, tablets, PCs)
  const sseClients: express.Response[] = [];

  const broadcastEvent = (eventType: string, payload: any) => {
    const payloadStr = JSON.stringify({ type: eventType, payload });
    for (let i = sseClients.length - 1; i >= 0; i--) {
      const client = sseClients[i];
      try {
        client.write(`data: ${payloadStr}\n\n`);
      } catch {
        sseClients.splice(i, 1);
      }
    }
  };

  // High payload limit for image data URLs from device camera/gallery uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // In-memory working copy backed by disk
  let db = ensureDataFile();

  // CORS headers for development/preview robustness
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      productsCount: db.products.length,
      claimsCount: db.claims.length,
      connectedClients: sseClients.length,
      timestamp: new Date().toISOString()
    });
  });

  // ================= SERVER-SENT EVENTS (SSE) FOR INSTANT 0ms REALTIME SYNC =================
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', products: db.products, claims: db.claims })}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // ================= PRODUCTS API =================
  // GET all products
  app.get('/api/products', (_req, res) => {
    res.json(db.products);
  });

  // POST create new product
  app.post('/api/products', (req, res) => {
    try {
      const {
        title,
        platform = 'Amazon',
        image,
        link = 'https://amazon.in',
        code,
        cashbackAmount = 150,
        description = '',
        isActive = true
      } = req.body;

      if (!title || !code) {
        return res.status(400).json({ error: 'Product Title and Special Code are required.' });
      }

      const newProduct = {
        id: req.body.id ? String(req.body.id) : String(Date.now()),
        title: String(title).trim(),
        platform: String(platform).trim(),
        image: String(image || '').trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
        link: String(link || '').trim(),
        code: String(code).trim().toUpperCase(),
        cashbackAmount: Number(cashbackAmount) || 150,
        description: String(description || '').trim(),
        createdAt: new Date().toISOString().split('T')[0],
        isActive: isActive !== false
      };

      // Add to front of list
      db.products = [newProduct, ...db.products];
      saveDb(db);

      // Instant push to all connected devices in 0ms
      broadcastEvent('PRODUCTS_UPDATED', db.products);

      res.status(201).json({ success: true, product: newProduct });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create product' });
    }
  });

  // PUT update existing product (title, image, link, code, cashbackAmount, etc.)
  app.put('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const index = db.products.findIndex((p) => String(p.id) === String(id));

      if (index === -1) {
        return res.status(404).json({ error: 'Product not found.' });
      }

      const current = db.products[index];
      const updatedProduct = {
        ...current,
        ...req.body,
        id: current.id, // preserve id
        code: req.body.code ? String(req.body.code).trim().toUpperCase() : current.code,
        image: req.body.image !== undefined ? String(req.body.image).trim() : current.image,
        cashbackAmount: req.body.cashbackAmount !== undefined ? Number(req.body.cashbackAmount) : current.cashbackAmount,
        updatedAt: new Date().toISOString()
      };

      db.products[index] = updatedProduct;
      saveDb(db);

      // Instant push to all connected devices (customer portals) in 0ms
      broadcastEvent('PRODUCTS_UPDATED', db.products);

      res.json({ success: true, product: updatedProduct });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update product' });
    }
  });

  // PATCH toggle product active/paused
  app.patch('/api/products/:id/toggle', (req, res) => {
    try {
      const { id } = req.params;
      const index = db.products.findIndex((p) => String(p.id) === String(id));

      if (index === -1) {
        return res.status(404).json({ error: 'Product not found.' });
      }

      db.products[index].isActive = !db.products[index].isActive;
      saveDb(db);

      broadcastEvent('PRODUCTS_UPDATED', db.products);

      res.json({ success: true, product: db.products[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle product status' });
    }
  });

  // DELETE permanently delete product
  app.delete('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const idUpper = String(id).trim().toUpperCase();
      const initialLen = db.products.length;
      db.products = db.products.filter(
        (p) => String(p.id) !== String(id) && String(p.code).trim().toUpperCase() !== idUpper
      );
      saveDb(db);

      // Instant push permanent deletion to all connected devices in 0ms!
      broadcastEvent('PRODUCTS_UPDATED', db.products);

      const deleted = db.products.length < initialLen;
      res.json({ success: true, deleted, remainingCount: db.products.length, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete product' });
    }
  });

  // ================= CLAIMS API =================
  // GET all claims
  app.get('/api/claims', (_req, res) => {
    res.json(db.claims);
  });

  // POST submit new customer claim
  app.post('/api/claims', (req, res) => {
    try {
      const {
        productId,
        productTitle,
        platform,
        systemCode,
        specialCode,
        customerName,
        customerMobile,
        customerEmail,
        orderImgData,
        paymentImgData,
        ratingImgData,
        upiId,
        cashbackAmount
      } = req.body;

      if (!orderImgData || !paymentImgData || !ratingImgData) {
        return res.status(400).json({ error: 'All 3 screenshot proofs are required.' });
      }

      if (!upiId) {
        return res.status(400).json({ error: 'Valid UPI ID is required for cashback transfer.' });
      }

      const newClaim = {
        id: Date.now(),
        productId: productId || 0,
        productTitle: String(productTitle || 'Product').trim(),
        platform: String(platform || 'Store').trim(),
        systemCode: String(systemCode || '').trim().toUpperCase(),
        specialCode: String(specialCode || '').trim().toUpperCase(),
        customerName: String(customerName || 'Customer').trim(),
        customerMobile: String(customerMobile || '').trim(),
        customerEmail: String(customerEmail || '').trim(),
        orderImgData: String(orderImgData),
        paymentImgData: String(paymentImgData),
        ratingImgData: String(ratingImgData),
        upiId: String(upiId).trim(),
        cashbackAmount: Number(cashbackAmount) || 150,
        submittedAt: new Date().toISOString(),
        status: 'Pending',
        isRefunded: false
      };

      db.claims = [newClaim, ...db.claims];
      saveDb(db);

      // Instant push to admin dashboard in 0ms
      broadcastEvent('CLAIMS_UPDATED', db.claims);

      res.status(201).json({ success: true, claim: newClaim });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit claim' });
    }
  });

  // PATCH update claim status (Approved, Paid, Rejected)
  app.patch('/api/claims/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason, isRefunded, refundedAt } = req.body;

      const index = db.claims.findIndex((c) => String(c.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      if (status !== undefined) {
        db.claims[index].status = status;
      }
      if (rejectionReason !== undefined) {
        db.claims[index].rejectionReason = rejectionReason;
      }
      if (status === 'Approved') {
        db.claims[index].approvedAt = new Date().toISOString();
      } else if (status === 'Paid') {
        db.claims[index].isRefunded = true;
        db.claims[index].paidAt = new Date().toISOString();
        db.claims[index].refundedAt = new Date().toISOString();
      }
      if (isRefunded !== undefined) {
        db.claims[index].isRefunded = Boolean(isRefunded);
        db.claims[index].refundedAt = isRefunded ? (refundedAt || new Date().toISOString()) : undefined;
      }

      saveDb(db);

      // Instant push to all connected devices in 0ms
      broadcastEvent('CLAIMS_UPDATED', db.claims);

      res.json({ success: true, claim: db.claims[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update claim' });
    }
  });

  // DELETE a claim
  app.delete('/api/claims/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.claims = db.claims.filter((c) => String(c.id) !== String(id));
      saveDb(db);

      broadcastEvent('CLAIMS_UPDATED', db.claims);

      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete claim' });
    }
  });

  // POST reset data back to clean empty state (no demo products)
  app.post('/api/reset', (_req, res) => {
    try {
      db = {
        products: [],
        claims: []
      };
      saveDb(db);

      broadcastEvent('PRODUCTS_UPDATED', []);
      broadcastEvent('CLAIMS_UPDATED', []);

      res.json({ success: true, products: [], claims: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset database' });
    }
  });

  // ================= FRONTEND / VITE MIDDLEWARE =================
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
