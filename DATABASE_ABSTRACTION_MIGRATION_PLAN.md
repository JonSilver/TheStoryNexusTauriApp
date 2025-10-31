# Database Migration Plan: Dexie → SQLite

## Summary

Replace Dexie/IndexedDB with SQLite via Tauri SQL plugin + Drizzle ORM.

**Why**: Better performance, easier backup (single file), proper foreign keys, standard SQL tooling.

---

## Current State

8 tables in IndexedDB via Dexie:
- stories, chapters, aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes
- Foreign key relationships managed manually (e.g., `deleteStoryWithRelated`)
- Direct Dexie access from Zustand stores

**Problems**:
- Binary blob storage (hard to backup/inspect)
- No real foreign keys
- Browser-only (limits future options)
- Poor query performance with complex filters

---

## Implementation Steps

### 1. Setup

**Install dependencies**:
```bash
npm install drizzle-orm @tauri-apps/plugin-sql
npm install -D drizzle-kit
```

**Configure Tauri** (`src-tauri/Cargo.toml`):
```toml
[dependencies]
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

**Register plugin** (`src-tauri/src/main.rs`):
```rust
.plugin(tauri_plugin_sql::Builder::default().build())
```

**New structure**:
```
src/db/
  schema.ts       # All table schemas
  client.ts       # Init DB
  queries.ts      # Query functions
  migrate.ts      # One-time IndexedDB→SQLite
```

### 2. Define Schema

**src/db/schema.ts** - single file with all tables:
```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  language: text('language').notNull(),
  synopsis: text('synopsis'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isDemo: integer('is_demo', { mode: 'boolean' }),
});

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  storyId: text('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  order: integer('order').notNull(),
  content: text('content').notNull(),
  outline: text('outline', { mode: 'json' }),
  wordCount: integer('word_count').notNull().default(0),
  povCharacter: text('pov_character'),
  povType: text('pov_type'),
  notes: text('notes', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isDemo: integer('is_demo', { mode: 'boolean' }),
}, (table) => ({
  storyIdIdx: index('chapter_story_id_idx').on(table.storyId),
}));

// ... similar for other 6 tables (aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes)
```

**Key points**:
- Foreign keys with `CASCADE` (auto-delete related records)
- JSON columns for complex data (outline, tags, metadata)
- Indexes on storyId for common queries

### 3. Database Client

**src/db/client.ts**:
```typescript
import { drizzle } from 'drizzle-orm/tauri-plugin-sql';
import Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';

let db: ReturnType<typeof drizzle>;

export const initDb = async () => {
  const sqlite = await Database.load('sqlite:story_nexus.db');
  db = drizzle(sqlite, { schema });

  // Create tables if not exist
  await runMigrations();

  // Seed system prompts if empty
  await seedSystemPrompts();
};

export const getDb = () => db;
```

Run `npx drizzle-kit generate` once to create initial SQL migration, then `initDb()` on app startup.

### 4. Query Functions

**src/db/queries.ts** - simple functions matching existing Dexie API:
```typescript
import { eq, and } from 'drizzle-orm';
import { getDb } from './client';
import { stories, chapters, lorebookEntries, sceneBeats } from './schema';

// Stories
export const getAllStories = () => getDb().select().from(stories);
export const getStory = (id: string) => getDb().select().from(stories).where(eq(stories.id, id));
export const createStory = (data: NewStory) => getDb().insert(stories).values(data);
export const updateStory = (id: string, data: Partial<Story>) =>
  getDb().update(stories).set(data).where(eq(stories.id, id));
export const deleteStory = (id: string) =>
  getDb().delete(stories).where(eq(stories.id, id)); // CASCADE handles related

// Chapters
export const getChaptersByStory = (storyId: string) =>
  getDb().select().from(chapters).where(eq(chapters.storyId, storyId)).orderBy(chapters.order);
export const getChapter = (id: string) => getDb().select().from(chapters).where(eq(chapters.id, id));
export const createChapter = (data: NewChapter) => getDb().insert(chapters).values(data);
export const updateChapter = (id: string, data: Partial<Chapter>) =>
  getDb().update(chapters).set(data).where(eq(chapters.id, id));

// Lorebook
export const getLorebookByStory = (storyId: string) =>
  getDb().select().from(lorebookEntries).where(eq(lorebookEntries.storyId, storyId));
export const getLorebookByCategory = (storyId: string, category: string) =>
  getDb().select().from(lorebookEntries).where(and(
    eq(lorebookEntries.storyId, storyId),
    eq(lorebookEntries.category, category)
  ));

// ... similar for sceneBeats, aiChats, prompts, aiSettings, notes
```

**Benefits**: Simple, functional, type-safe. No classes/inheritance/repositories nonsense.

### 5. Update Stores

Change imports and method calls in each store (useStoryStore, useChapterStore, etc.):

**Before**:
```typescript
import { db } from '@/services/database';
const stories = await db.stories.toArray();
const story = await db.stories.get(id);
await db.stories.add(data);
await db.deleteStoryWithRelated(id);
```

**After**:
```typescript
import { getAllStories, getStory, createStory, deleteStory } from '@/db/queries';
const stories = await getAllStories();
const story = await getStory(id);
await createStory(data);
await deleteStory(id); // CASCADE handles related records
```

Work through stores one at a time, test each.

### 6. Data Migration

**src/db/migrate.ts**:
```typescript
import { db as oldDb } from '@/services/database'; // Dexie
import * as queries from './queries';

export const migrateFromDexie = async () => {
  // Copy all data table by table
  const stories = await oldDb.stories.toArray();
  for (const s of stories) await queries.createStory(s);

  const chapters = await oldDb.chapters.toArray();
  for (const c of chapters) await queries.createChapter(c);

  // ... repeat for remaining 6 tables

  console.log('Migration complete');
};
```

Check on startup if SQLite empty but IndexedDB has data, then prompt user to migrate.

---

## Testing

Manual testing:
1. Create story, add chapters, delete story → verify CASCADE works
2. Add lorebook entries with tags → verify filtering works
3. Create scene beats → verify generation works
4. Try with demo data and real data

Check:
- No data loss
- Features work identically
- Performance acceptable (should be faster)

---

## Backup Strategy

**Before migration**: Tell user to export their stories first (existing export function).

**Post-migration**: SQLite file at `~/.local/share/story-nexus/story_nexus.db` (or platform equivalent). User can copy file for backup.

Future: Add "Export Database" button to copy `.db` file somewhere safe.

---

## Benefits

1. **Single-file backup**: Copy `story_nexus.db`, done
2. **Proper foreign keys**: CASCADE delete, no manual cleanup
3. **Better performance**: Real SQL engine vs IndexedDB
4. **Standard tooling**: Can inspect DB with any SQLite browser
5. **Type safety**: Drizzle excellent TypeScript support
6. **Portable**: Move `.db` file between machines

---

## Risks

**Main risk**: Data loss during migration.

**Mitigation**:
- Prompt user to export stories first
- Test migration script thoroughly with demo data
- Keep Dexie code until confident

---

## Why Not Keep Dexie?

- IndexedDB browser API clunky for complex queries
- Binary storage format (can't easily inspect/recover)
- Tied to browser environment
- Manual foreign key management error-prone
- SQLite is standard, well-tested, portable

---

## Recommendation

Do it. Addresses TODO in CLAUDE.md ("replace with better, portable solution"). Simple migration, big wins.

**Next**: Approve plan, start with schema definition, test incrementally.
