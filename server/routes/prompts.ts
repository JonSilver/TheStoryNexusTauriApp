import { schema, db } from '../db/client.js';
import { createCrudRouter } from '../lib/crud.js';
import { parseJson } from '../lib/json.js';
import { eq, or, isNull } from 'drizzle-orm';

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

      const query = storyId
        ? db.select().from(table).where(or(eq(table.storyId, storyId as string), isNull(table.storyId)))
        : db.select().from(table);

      const allRows = await query;

      const filtered = allRows
        .filter(p => !promptType || p.promptType === promptType)
        .filter(p => includeSystem === 'true' || !p.isSystem);

      res.json(filtered.map(transform));
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
