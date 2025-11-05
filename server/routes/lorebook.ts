import { schema, db } from '../db/client';
import { createCrudRouter } from '../lib/crud';
import { eq, and } from 'drizzle-orm';

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const transform = (entry: any) => ({
  ...entry,
  tags: parseJson(entry.tags),
  metadata: parseJson(entry.metadata),
});

export default createCrudRouter({
  table: schema.lorebookEntries,
  name: 'Lorebook entry',
  parentKey: 'storyId',
  transforms: { afterRead: transform },
  customRoutes: (router, { asyncHandler, table }) => {
    router.get('/story/:storyId/category/:category', asyncHandler(async (req, res) => {
      const rows = await db.select().from(table).where(and(
        eq(table.storyId, req.params.storyId),
        eq(table.category, req.params.category)
      ));
      res.json(rows.map(transform));
    }));

    router.get('/story/:storyId/tag/:tag', asyncHandler(async (req, res) => {
      const rows = await db.select().from(table).where(eq(table.storyId, req.params.storyId));
      const filtered = rows.map(transform).filter((entry: any) =>
        (entry.tags as string[]).includes(req.params.tag)
      );
      res.json(filtered);
    }));
  },
});
