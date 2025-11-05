import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';

type CrudConfig = {
  table: any;
  name: string;
  parentKey?: string;
  transforms?: {
    afterRead?: (row: any) => any;
  };
  customRoutes?: (router: Router, helpers: RouteHelpers) => void;
};

type RouteHelpers = {
  asyncHandler: (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => void;
  applyTransform: (data: any) => any;
  table: any;
};

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response) =>
    fn(req, res).catch(error => {
      console.error(`Error:`, error);
      res.status(500).json({ error: error.message || 'Server error' });
    });

export const createCrudRouter = (config: CrudConfig): Router => {
  const router = Router();
  const { table, name, parentKey, transforms, customRoutes } = config;

  const applyTransform = (data: any) =>
    transforms?.afterRead ? transforms.afterRead(data) : data;

  const helpers: RouteHelpers = { asyncHandler, applyTransform, table };

  // Custom routes first (so they match before generic patterns)
  if (customRoutes) {
    customRoutes(router, helpers);
  }

  // GET all (optionally filtered by parent)
  if (parentKey) {
    router.get(`/${parentKey}/:parentId`, asyncHandler(async (req, res) => {
      const rows = await db.select().from(table).where(eq(table[parentKey], req.params.parentId));
      res.json(rows.map(applyTransform));
    }));
  } else {
    router.get('/', asyncHandler(async (req, res) => {
      const rows = await db.select().from(table);
      res.json(rows.map(applyTransform));
    }));
  }

  // GET by id
  router.get('/:id', asyncHandler(async (req, res) => {
    const [row] = await db.select().from(table).where(eq(table.id, req.params.id));
    if (!row) return res.status(404).json({ error: `${name} not found` });
    res.json(applyTransform(row));
  }));

  // POST create
  router.post('/', asyncHandler(async (req, res) => {
    const data = {
      id: req.body.id || crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    };
    const [created] = await db.insert(table).values(data).returning();
    res.status(201).json(applyTransform(created));
  }));

  // PUT update
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id, createdAt, ...updates } = req.body;
    const [updated] = await db.update(table).set(updates).where(eq(table.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: `${name} not found` });
    res.json(applyTransform(updated));
  }));

  // DELETE
  router.delete('/:id', asyncHandler(async (req, res) => {
    await db.delete(table).where(eq(table.id, req.params.id));
    res.json({ success: true });
  }));

  return router;
};
