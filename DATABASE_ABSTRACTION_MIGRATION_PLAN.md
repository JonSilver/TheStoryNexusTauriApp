# Database Migration Plan: Dexie → SQLite + Zustand → Tanstack Query

## Summary

Replace Dexie/IndexedDB with SQLite via Tauri SQL plugin + Drizzle ORM.
Replace Zustand stores with Tanstack Query for proper data fetching/caching.

**Why**:
- **SQLite**: Better performance, easier backup (single file), proper foreign keys, standard SQL tooling
- **Tanstack Query**: Built for server/backend state, handles caching/invalidation/optimistic updates properly

---

## Current State

8 tables in IndexedDB via Dexie:
- stories, chapters, aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes
- Foreign key relationships managed manually (e.g., `deleteStoryWithRelated`)
- Direct Dexie access from Zustand stores

**Problems with Dexie**:
- Binary blob storage (hard to backup/inspect)
- No real foreign keys
- Browser-only (limits future options)
- Poor query performance with complex filters

**Problems with Zustand for data access**:
- Manual cache management
- No automatic refetching
- Manual loading/error states
- No cache invalidation strategy
- Not designed for server/backend state

---

## Implementation Steps

### 1. Setup

**Install dependencies**:
```bash
npm install drizzle-orm @tauri-apps/plugin-sql @tanstack/react-query
npm install -D drizzle-kit
```

**Remove**:
```bash
npm uninstall zustand
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
src/hooks/
  useStories.ts   # Tanstack Query hooks
  useChapters.ts
  useLorebook.ts
  ... etc
```

**Setup QueryClient** (`src/App.tsx` or `src/main.tsx`):
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap app
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
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

### 5. Create Tanstack Query Hooks

Replace Zustand stores with query/mutation hooks. Example **src/hooks/useStories.ts**:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllStories, getStory, createStory, updateStory, deleteStory } from '@/db/queries';
import type { Story } from '@/types/story';

// Query: Get all stories
export const useStories = () => {
  return useQuery({
    queryKey: ['stories'],
    queryFn: getAllStories,
  });
};

// Query: Get single story
export const useStory = (id: string) => {
  return useQuery({
    queryKey: ['stories', id],
    queryFn: () => getStory(id),
    enabled: !!id,
  });
};

// Mutation: Create story
export const useCreateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};

// Mutation: Update story
export const useUpdateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Story> }) =>
      updateStory(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories', id] });
    },
  });
};

// Mutation: Delete story
export const useDeleteStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};
```

**Similar pattern for chapters, lorebook, etc.**

**Usage in components** (replaces old Zustand):

```typescript
// Before (Zustand)
const { stories, loading, fetchStories } = useStoryStore();
useEffect(() => { fetchStories(); }, []);

// After (Tanstack Query)
const { data: stories, isLoading } = useStories();
const createMutation = useCreateStory();

// Create story
createMutation.mutate(newStory);
```

**Benefits**:
- Auto caching, no manual state sync
- Built-in loading/error states
- Auto invalidation on mutations
- Optimistic updates easy to add
- Deduplication of requests

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

**SQLite + Drizzle**:
1. **Single-file backup**: Copy `story_nexus.db`, done
2. **Proper foreign keys**: CASCADE delete, no manual cleanup
3. **Better performance**: Real SQL engine vs IndexedDB
4. **Standard tooling**: Can inspect DB with any SQLite browser
5. **Type safety**: Drizzle excellent TypeScript support
6. **Portable**: Move `.db` file between machines

**Tanstack Query**:
7. **Automatic caching**: No manual cache management, smart refetching
8. **Built-in states**: Loading, error, success states out of box
9. **Cache invalidation**: Proper mutation → query invalidation
10. **Optimistic updates**: Easy to implement for snappy UI
11. **Request deduplication**: Multiple components can use same query
12. **Designed for data**: Built specifically for server/backend state

---

## Risks

**Main risk**: Data loss during migration.

**Mitigation**:
- Prompt user to export stories first
- Test migration script thoroughly with demo data
- Keep Dexie code until confident

---

## Why Not Keep Dexie + Zustand?

**Dexie**:
- IndexedDB browser API clunky for complex queries
- Binary storage format (can't easily inspect/recover)
- Tied to browser environment
- Manual foreign key management error-prone
- SQLite is standard, well-tested, portable

**Zustand for data**:
- Manual loading/error state management
- No cache invalidation strategy
- Manual refetch orchestration
- Not designed for server/backend state
- Zustand good for UI state, not data fetching

---

## Recommendation

Do both migrations together:
- **Dexie → SQLite + Drizzle**: Better database, proper SQL, portable
- **Zustand → Tanstack Query**: Proper data fetching/caching layer

Addresses TODO in CLAUDE.md ("replace with better, portable solution"). Clean slate, modern stack.

**Next**: Approve plan, implement incrementally, test as you go.
