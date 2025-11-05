import { eq } from 'drizzle-orm';
import { attemptPromise } from '@jfdi/attempt';
import multer from 'multer';
import { db, schema } from '../db/client.js';
import { createCrudRouter } from '../lib/crud.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export default createCrudRouter({
  table: schema.stories,
  name: 'Story',
  customRoutes: (router, { asyncHandler }) => {
    // Export a single story with all related data
    router.get('/:id/export', asyncHandler(async (req, res) => {
      const storyId = req.params.id;

      const [error, data] = await attemptPromise(async () => {
        const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, storyId));
        if (!story) {
          throw new Error('Story not found');
        }

        const [chapters, lorebookEntries, sceneBeats, aiChats] = await Promise.all([
          db.select().from(schema.chapters).where(eq(schema.chapters.storyId, storyId)),
          db.select().from(schema.lorebookEntries).where(eq(schema.lorebookEntries.storyId, storyId)),
          db.select().from(schema.sceneBeats).where(eq(schema.sceneBeats.storyId, storyId)),
          db.select().from(schema.aiChats).where(eq(schema.aiChats.storyId, storyId)),
        ]);

        return {
          version: '1.0',
          type: 'story',
          exportDate: new Date().toISOString(),
          story,
          chapters,
          lorebookEntries,
          sceneBeats,
          aiChats
        };
      });

      if (error) {
        console.error('Error exporting story:', error);
        if (error.message === 'Story not found') {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to export story', details: error.message });
        }
        return;
      }

      res.json(data);
    }));

    // Import a story from JSON
    router.post('/import', upload.single('file'), asyncHandler(async (req, res) => {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const [parseError, storyData] = await attemptPromise(() =>
        Promise.resolve(JSON.parse(req.file!.buffer.toString('utf-8')))
      );

      if (parseError) {
        res.status(400).json({ error: 'Invalid JSON file', details: parseError.message });
        return;
      }

      if (!storyData.type || storyData.type !== 'story' || !storyData.story) {
        res.status(400).json({ error: 'Invalid story data format' });
        return;
      }

      const [error, newStoryId] = await attemptPromise(async () => {
        const newStoryId = crypto.randomUUID();
        const idMap = new Map<string, string>();
        idMap.set(storyData.story.id, newStoryId);

        const newStory = {
          ...storyData.story,
          id: newStoryId,
          createdAt: new Date(),
          title: `${storyData.story.title} (Imported)`
        };

        await db.insert(schema.stories).values(newStory);

        if (storyData.chapters?.length) {
          const newChapters = storyData.chapters.map((chapter: any) => {
            const newChapterId = crypto.randomUUID();
            idMap.set(chapter.id, newChapterId);
            return {
              ...chapter,
              id: newChapterId,
              storyId: newStoryId,
              createdAt: new Date()
            };
          });
          await db.insert(schema.chapters).values(newChapters);
        }

        if (storyData.lorebookEntries?.length) {
          const newEntries = storyData.lorebookEntries.map((entry: any) => {
            const newEntryId = crypto.randomUUID();
            idMap.set(entry.id, newEntryId);
            return {
              ...entry,
              id: newEntryId,
              storyId: newStoryId,
              createdAt: new Date()
            };
          });
          await db.insert(schema.lorebookEntries).values(newEntries);
        }

        if (storyData.sceneBeats?.length) {
          const newSceneBeats = storyData.sceneBeats.map((sceneBeat: any) => {
            const newSceneBeatId = crypto.randomUUID();
            return {
              ...sceneBeat,
              id: newSceneBeatId,
              storyId: newStoryId,
              chapterId: idMap.get(sceneBeat.chapterId) || sceneBeat.chapterId,
              createdAt: new Date()
            };
          });
          await db.insert(schema.sceneBeats).values(newSceneBeats);
        }

        if (storyData.aiChats?.length) {
          const newChats = storyData.aiChats.map((chat: any) => {
            const newChatId = crypto.randomUUID();
            return {
              ...chat,
              id: newChatId,
              storyId: newStoryId,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });
          await db.insert(schema.aiChats).values(newChats);
        }

        return newStoryId;
      });

      if (error) {
        console.error('Error importing story:', error);
        res.status(500).json({ error: 'Failed to import story', details: error.message });
        return;
      }

      res.json({
        success: true,
        storyId: newStoryId,
        imported: {
          chapters: storyData.chapters?.length || 0,
          lorebookEntries: storyData.lorebookEntries?.length || 0,
          sceneBeats: storyData.sceneBeats?.length || 0,
          aiChats: storyData.aiChats?.length || 0,
        }
      });
    }));
  }
});
