import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createGrSession,
  findMasterItemByBarcode,
  listGrSessions,
  searchMasterItems,
  upsertMasterItems,
  type MasterItemInput,
} from './src/db/grRepository.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { normalizeBarcode } from './src/utils/grLogic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      return res.status(400).json({ error: 'Authenticated token missing uid or email.' });
    }
    const user = await getOrCreateUser(uid, email, req.user?.name ?? null);
    res.json({ user });
  } catch (error) {
    console.error('Auth sync error:', error);
    res.status(500).json({ error: 'Failed to sync operator account.' });
  }
});

app.get('/api/master-items/lookup', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawBarcode = String(req.query.barcode ?? '');
    const barcode = normalizeBarcode(rawBarcode);
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode parameter is required.' });
    }

    const item = await findMasterItemByBarcode(barcode);
    if (!item) {
      return res.status(404).json({ error: 'Barcode not registered in master catalog.', barcode });
    }

    res.json({ item });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ error: 'Failed to look up barcode.' });
  }
});

app.get('/api/master-items/search', requireAuth, async (req: AuthRequest, res) => {
  try {
    const query = String(req.query.q ?? '');
    const items = await searchMasterItems(query, 40);
    res.json({ items });
  } catch (error) {
    console.error('Master item search error:', error);
    res.status(500).json({ error: 'Failed to search master catalog.' });
  }
});

app.post('/api/master-items/import', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'No valid catalog rows provided.' });
    }

    const sanitized: MasterItemInput[] = [];
    for (const row of rawItems) {
      const barcode = normalizeBarcode(String(row?.barcode ?? ''));
      const itemCode = String(row?.itemCode ?? '').trim();
      const description = String(row?.description ?? '').trim();
      const category = String(row?.category ?? 'General Merchandise').trim() || 'General Merchandise';
      const uom = String(row?.uom ?? 'PCS').trim().toUpperCase() || 'PCS';
      const unitCost = Number(row?.unitCost ?? 0);

      if (barcode && itemCode && description) {
        sanitized.push({
          barcode,
          itemCode,
          description,
          category,
          uom,
          unitCost: Number.isFinite(unitCost) ? Math.max(0, Math.round(unitCost)) : 0,
        });
      }
    }

    if (sanitized.length === 0) {
      return res.status(400).json({
        error: 'Each catalog row must include itemCode, barcode, and description.',
      });
    }

    const result = await upsertMasterItems(sanitized);
    res.json(result);
  } catch (error) {
    console.error('Master item import error:', error);
    res.status(500).json({ error: 'Failed to import catalog items.' });
  }
});

app.get('/api/gr-sessions', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const sessions = await listGrSessions(30);
    res.json({ sessions });
  } catch (error) {
    console.error('List GR sessions error:', error);
    res.status(500).json({ error: 'Failed to load receiving history.' });
  }
});

app.post('/api/gr-sessions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email ?? '';
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized operator.' });
    }

    await getOrCreateUser(uid, email, req.user?.name ?? null);

    const body = req.body ?? {};
    const supplierName = String(body.supplierName ?? '').trim();
    const poNumber = String(body.poNumber ?? '').trim();
    const operatorName = String(body.operatorName ?? '').trim() || req.user?.name || email;
    const dockBay = String(body.dockBay ?? 'Dock A1').trim() || 'Dock A1';
    const notes = String(body.notes ?? '').trim();
    const sessionCode = String(body.sessionCode ?? '').trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!supplierName || !poNumber || !sessionCode || items.length === 0) {
      return res.status(400).json({
        error: 'Supplier name, PO number, session code, and at least one scanned item are required.',
      });
    }

    const normalizedItems = items.map((item: Record<string, unknown>) => ({
      masterItemId: typeof item.masterItemId === 'string' ? item.masterItemId : null,
      itemCode: String(item.itemCode ?? '').trim(),
      barcode: normalizeBarcode(String(item.barcode ?? '')),
      description: String(item.description ?? '').trim(),
      category: String(item.category ?? 'General').trim(),
      uom: String(item.uom ?? 'PCS').trim(),
      quantity: Math.max(1, Math.round(Number(item.quantity ?? 1))),
      qcPackagingIntact: Boolean(item.qcPackagingIntact),
      qcExpiredOrNear: Boolean(item.qcExpiredOrNear),
      qcPhysicalGood: Boolean(item.qcPhysicalGood),
      qcNotes: String(item.qcNotes ?? '').trim(),
    }));

    const session = await createGrSession({
      sessionCode,
      operatorUid: uid,
      operatorName,
      supplierName,
      poNumber,
      dockBay,
      notes,
      items: normalizedItems,
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create GR session error:', error);
    res.status(500).json({ error: 'Failed to submit Goods Receiving session.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amanmart GR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
