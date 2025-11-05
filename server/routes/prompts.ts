import { schema, db } from '../db/client';
import { createCrudRouter } from '../lib/crud';
import { eq, or, isNull } from 'drizzle-orm';

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const transform = (p: any) => ({
  ...p,
  messages: parseJson(p.messages),
  allowedModels: parseJson(p.allowedModels),
});

export default createCrudRouter({
  table: schema.prompts,
  name: 'Prompt',
  transforms: { afterRead: transform },
  customRoutes: (router, { asyncHandler, table }) => {
    // Custom GET with query filters
    router.get('/', asyncHandler(async (req, res) => {
      const { storyId, promptType, includeSystem } = req.query;

      let query = db.select().from(table);

      if (storyId) {
        query = query.where(or(eq(table.storyId, storyId as string), isNull(table.storyId))) as typeof query;
      }

      let rows = await query;

      if (promptType) {
        rows = rows.filter(p => p.promptType === promptType);
      }

      if (includeSystem !== 'true') {
        rows = rows.filter(p => !p.isSystem);
      }

      res.json(rows.map(transform));
    }));

    // Custom DELETE - prevent deleting system prompts
    router.delete('/:id', asyncHandler(async (req, res) => {
      const [prompt] = await db.select().from(table).where(eq(table.id, req.params.id));
      if (prompt?.isSystem) {
        return res.status(403).json({ error: 'Cannot delete system prompts' });
      }
      await db.delete(table).where(eq(table.id, req.params.id));
      res.json({ success: true });
    }));
  },
});
