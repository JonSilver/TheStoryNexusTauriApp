# Lorebook Hierarchy Plan: Global, Series & Story Scopes

## Overview

Extend lorebook architecture to support three-tier hierarchy:
- **Global** - Available to all stories
- **Series** - Available to all stories in a series
- **Story** - Available to single story only

Enables reusable character casts, locations, and lore across multiple stories.

## Architecture Context

This plan uses the current application stack:
- **Backend**: Express.js + Drizzle ORM + SQLite
- **Frontend**: React + TanStack Query
- **Patterns**: REST API with CRUD factory, query hooks with cache invalidation

Previous Tauri/Dexie/Zustand architecture has been migrated to web app architecture.

---

## Database Schema Changes (Drizzle ORM)

### New `series` table
```typescript
export const series = sqliteTable('series', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    isDemo: integer('isDemo', { mode: 'boolean' }),
}, (table) => ({
    nameIdx: index('series_name_idx').on(table.name),
    createdAtIdx: index('series_created_at_idx').on(table.createdAt),
}));
```

### Modified `stories` table
Add optional series relationship with cascade rules:
```typescript
export const stories = sqliteTable('stories', {
    // ... existing fields
    seriesId: text('seriesId').references(() => series.id, { onDelete: 'set null' }),
    // ... rest unchanged
}, (table) => ({
    // ... existing indices
    seriesIdIdx: index('story_series_id_idx').on(table.seriesId),
}));
```

**New field:**
- `seriesId?: string` - References series.id, sets to null when series deleted

### Modified `lorebookEntries` table
Change from story-only to level-based with unified scope reference:

**Current schema:**
```typescript
export const lorebookEntries = sqliteTable('lorebookEntries', {
    id: text('id').primaryKey(),
    storyId: text('storyId').notNull().references(() => stories.id, { onDelete: 'cascade' }),
    // ... other fields
}, (table) => ({
    storyIdIdx: index('lorebook_story_id_idx').on(table.storyId),
    // ... other indices
}));
```

**New schema:**
```typescript
export const lorebookEntries = sqliteTable('lorebookEntries', {
    id: text('id').primaryKey(),
    level: text('level').notNull(), // 'global' | 'series' | 'story'
    scopeId: text('scopeId'), // seriesId or storyId depending on level
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    tags: text('tags', { mode: 'json' }).notNull(), // JSON: string[]
    metadata: text('metadata', { mode: 'json' }),
    isDisabled: integer('isDisabled', { mode: 'boolean' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    isDemo: integer('isDemo', { mode: 'boolean' }),
}, (table) => ({
    levelIdx: index('lorebook_level_idx').on(table.level),
    scopeIdIdx: index('lorebook_scope_id_idx').on(table.scopeId),
    levelScopeIdx: index('lorebook_level_scope_idx').on(table.level, table.scopeId),
    categoryIdx: index('lorebook_category_idx').on(table.category),
    nameIdx: index('lorebook_name_idx').on(table.name),
}));
```

**Key changes:**
- Remove `storyId` foreign key constraint (now handled by application logic)
- Add `level` field: `'global' | 'series' | 'story'`
- Add `scopeId` field: contains seriesId or storyId based on level
- Add composite index on `level + scopeId` for efficient queries

**Benefits:**
- Single field for scope reference (cleaner schema)
- Enables promotion/demotion: just change `level` and update `scopeId`
- Simpler validation logic
- No cascade constraints needed (application handles deletion logic)

### Migration
Use Drizzle Kit to generate migration SQL. See "Implementation Notes" section below for migration details.

---

## Type Definitions

### New Types

**Series:**
```typescript
export interface Series extends BaseEntity {
    name: string;
    description?: string;
}
```

### Modified Types

**LorebookEntry:**
```typescript
export interface LorebookEntry extends BaseEntity {
    level: 'global' | 'series' | 'story';
    scopeId?: string;  // seriesId when level='series', storyId when level='story', undefined when level='global'
    name: string;
    description: string;
    category: 'character' | 'location' | 'item' | 'event' | 'note' | 'synopsis' | 'starting scenario' | 'timeline';
    tags: string[];
    metadata?: { /* unchanged */ };
    isDisabled?: boolean;
}
```

**Story:**
```typescript
export interface Story extends BaseEntity {
    title: string;
    author: string;
    language: string;
    synopsis?: string;
    seriesId?: string;  // NEW
}
```

**StoryExport:**
```typescript
export interface StoryExport {
    // ... existing fields
    series?: Series;  // Include if story belongs to series
}
```

---

## Server Routes (Express + Drizzle)

### New Series Routes (`server/routes/series.ts`)

Use CRUD factory pattern:
```typescript
import { createCrudRouter } from '../lib/crud.js';
import { db, schema } from '../db/client.js';

export default createCrudRouter({
  table: schema.series,
  name: 'Series',
  customRoutes: (router, { asyncHandler }) => {
    // GET /series/:id/stories - Get all stories in series
    router.get('/:id/stories', asyncHandler(async (req, res) => {
      const stories = await db.select()
        .from(schema.stories)
        .where(eq(schema.stories.seriesId, req.params.id));
      res.json(stories);
    }));

    // GET /series/:id/lorebook - Get series-level lorebook entries
    router.get('/:id/lorebook', asyncHandler(async (req, res) => {
      const entries = await db.select()
        .from(schema.lorebookEntries)
        .where(and(
          eq(schema.lorebookEntries.level, 'series'),
          eq(schema.lorebookEntries.scopeId, req.params.id)
        ));
      res.json(entries);
    }));

    // DELETE /series/:id - Delete series with cleanup
    router.delete('/:id', asyncHandler(async (req, res) => {
      const seriesId = req.params.id;

      // Orphan stories (set seriesId to null)
      await db.update(schema.stories)
        .set({ seriesId: null })
        .where(eq(schema.stories.seriesId, seriesId));

      // Delete series-level lorebook entries
      await db.delete(schema.lorebookEntries)
        .where(and(
          eq(schema.lorebookEntries.level, 'series'),
          eq(schema.lorebookEntries.scopeId, seriesId)
        ));

      // Delete series
      await db.delete(schema.series)
        .where(eq(schema.series.id, seriesId));

      res.json({ success: true });
    }));
  }
});
```

Standard CRUD routes provided by factory:
- `GET /series` - Get all series
- `GET /series/:id` - Get single series
- `POST /series` - Create series
- `PUT /series/:id` - Update series

### Modified Lorebook Routes (`server/routes/lorebook.ts`)

Add level-based queries:
```typescript
import { createCrudRouter } from '../lib/crud.js';
import { db, schema } from '../db/client.js';
import { eq, and, or } from 'drizzle-orm';

export default createCrudRouter({
  table: schema.lorebookEntries,
  name: 'Lorebook Entry',
  customRoutes: (router, { asyncHandler }) => {
    // GET /lorebook/global - Get all global entries
    router.get('/global', asyncHandler(async (req, res) => {
      const entries = await db.select()
        .from(schema.lorebookEntries)
        .where(eq(schema.lorebookEntries.level, 'global'));
      res.json(entries);
    }));

    // GET /lorebook/series/:seriesId - Get series-level entries
    router.get('/series/:seriesId', asyncHandler(async (req, res) => {
      const entries = await db.select()
        .from(schema.lorebookEntries)
        .where(and(
          eq(schema.lorebookEntries.level, 'series'),
          eq(schema.lorebookEntries.scopeId, req.params.seriesId)
        ));
      res.json(entries);
    }));

    // GET /lorebook/story/:storyId - Get story-level entries
    router.get('/story/:storyId', asyncHandler(async (req, res) => {
      const entries = await db.select()
        .from(schema.lorebookEntries)
        .where(and(
          eq(schema.lorebookEntries.level, 'story'),
          eq(schema.lorebookEntries.scopeId, req.params.storyId)
        ));
      res.json(entries);
    }));

    // GET /lorebook/story/:storyId/hierarchical - Get all inherited entries
    router.get('/story/:storyId/hierarchical', asyncHandler(async (req, res) => {
      const storyId = req.params.storyId;

      // Get story to check series membership
      const [story] = await db.select()
        .from(schema.stories)
        .where(eq(schema.stories.id, storyId));

      if (!story) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      // Build query for global + series (if applicable) + story entries
      const conditions = [
        eq(schema.lorebookEntries.level, 'global'),
        and(
          eq(schema.lorebookEntries.level, 'story'),
          eq(schema.lorebookEntries.scopeId, storyId)
        )
      ];

      if (story.seriesId) {
        conditions.push(
          and(
            eq(schema.lorebookEntries.level, 'series'),
            eq(schema.lorebookEntries.scopeId, story.seriesId)
          )
        );
      }

      const entries = await db.select()
        .from(schema.lorebookEntries)
        .where(or(...conditions));

      res.json(entries);
    }));

    // PUT /lorebook/:id/promote - Promote entry to higher level
    router.put('/:id/promote', asyncHandler(async (req, res) => {
      const { targetLevel, targetScopeId } = req.body;

      const updated = await db.update(schema.lorebookEntries)
        .set({ level: targetLevel, scopeId: targetScopeId })
        .where(eq(schema.lorebookEntries.id, req.params.id))
        .returning();

      res.json(updated[0]);
    }));
  }
});
```

### Modified Story Routes

No changes needed - CRUD factory handles series assignment via `PUT /stories/:id` with `seriesId` field.

---

## Frontend State Management (TanStack Query)

### New: Series Query Hooks (`src/features/series/hooks/useSeriesQuery.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seriesApi } from '@/services/api/client';

// Query keys
const seriesKeys = {
    all: ['series'] as const,
    detail: (id: string) => ['series', id] as const,
    stories: (id: string) => ['series', id, 'stories'] as const,
    lorebook: (id: string) => ['series', id, 'lorebook'] as const,
};

// Fetch all series
export const useSeriesQuery = () => {
    return useQuery({
        queryKey: seriesKeys.all,
        queryFn: seriesApi.getAll,
    });
};

// Fetch single series
export const useSingleSeriesQuery = (id: string) => {
    return useQuery({
        queryKey: seriesKeys.detail(id),
        queryFn: () => seriesApi.getById(id),
        enabled: !!id,
    });
};

// Fetch stories in series
export const useSeriesStoriesQuery = (seriesId: string) => {
    return useQuery({
        queryKey: seriesKeys.stories(seriesId),
        queryFn: () => seriesApi.getStories(seriesId),
        enabled: !!seriesId,
    });
};

// Create series mutation
export const useCreateSeriesMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: seriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: seriesKeys.all });
            toast.success('Series created successfully');
        },
    });
};

// Update series mutation
export const useUpdateSeriesMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Series> }) =>
            seriesApi.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: seriesKeys.all });
            queryClient.invalidateQueries({ queryKey: seriesKeys.detail(variables.id) });
            toast.success('Series updated successfully');
        },
    });
};

// Delete series mutation
export const useDeleteSeriesMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: seriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: seriesKeys.all });
            queryClient.invalidateQueries({ queryKey: ['stories'] }); // Stories may have changed
            toast.success('Series deleted successfully');
        },
    });
};
```

### Modified: Lorebook Query Hooks (`src/features/lorebook/hooks/useLorebookQuery.ts`)

Add level-based queries:
```typescript
// Query keys
const lorebookKeys = {
    all: ['lorebook'] as const,
    global: ['lorebook', 'global'] as const,
    series: (seriesId: string) => ['lorebook', 'series', seriesId] as const,
    story: (storyId: string) => ['lorebook', 'story', storyId] as const,
    hierarchical: (storyId: string) => ['lorebook', 'hierarchical', storyId] as const,
    detail: (id: string) => ['lorebook', id] as const,
};

// Fetch global lorebook entries
export const useGlobalLorebookQuery = () => {
    return useQuery({
        queryKey: lorebookKeys.global,
        queryFn: () => lorebookApi.getGlobal(),
    });
};

// Fetch series-level lorebook entries
export const useSeriesLorebookQuery = (seriesId: string) => {
    return useQuery({
        queryKey: lorebookKeys.series(seriesId),
        queryFn: () => lorebookApi.getBySeries(seriesId),
        enabled: !!seriesId,
    });
};

// Fetch story-level lorebook entries
export const useStoryLorebookQuery = (storyId: string) => {
    return useQuery({
        queryKey: lorebookKeys.story(storyId),
        queryFn: () => lorebookApi.getByStory(storyId),
        enabled: !!storyId,
    });
};

// Fetch hierarchical (global + series + story) entries
export const useHierarchicalLorebookQuery = (storyId: string) => {
    return useQuery({
        queryKey: lorebookKeys.hierarchical(storyId),
        queryFn: () => lorebookApi.getHierarchical(storyId),
        enabled: !!storyId,
    });
};

// Promote/demote lorebook entry
export const usePromoteLorebookMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, targetLevel, targetScopeId }: {
            id: string;
            targetLevel: 'global' | 'series' | 'story';
            targetScopeId?: string;
        }) => lorebookApi.promote(id, targetLevel, targetScopeId),
        onSuccess: () => {
            // Invalidate all lorebook queries as entry may have moved
            queryClient.invalidateQueries({ queryKey: lorebookKeys.all });
            toast.success('Entry promoted successfully');
        },
    });
};
```

### API Client Updates (`src/services/api/client.ts`)

Add series and updated lorebook API methods:
```typescript
export const seriesApi = {
    getAll: () => api.get<Series[]>('/series'),
    getById: (id: string) => api.get<Series>(`/series/${id}`),
    getStories: (seriesId: string) => api.get<Story[]>(`/series/${seriesId}/stories`),
    getLorebook: (seriesId: string) => api.get<LorebookEntry[]>(`/series/${seriesId}/lorebook`),
    create: (data: Omit<Series, 'id' | 'createdAt'>) => api.post<Series>('/series', data),
    update: (id: string, data: Partial<Series>) => api.put<Series>(`/series/${id}`, data),
    delete: (id: string) => api.delete(`/series/${id}`),
};

export const lorebookApi = {
    // ... existing methods
    getGlobal: () => api.get<LorebookEntry[]>('/lorebook/global'),
    getBySeries: (seriesId: string) => api.get<LorebookEntry[]>(`/lorebook/series/${seriesId}`),
    getByStory: (storyId: string) => api.get<LorebookEntry[]>(`/lorebook/story/${storyId}`),
    getHierarchical: (storyId: string) => api.get<LorebookEntry[]>(`/lorebook/story/${storyId}/hierarchical`),
    promote: (id: string, targetLevel: string, targetScopeId?: string) =>
        api.put<LorebookEntry>(`/lorebook/${id}/promote`, { targetLevel, targetScopeId }),
};
```

---

## Services

### Modified: `LorebookFilterService`

**Add:**
```typescript
filterByLevel(entries: LorebookEntry[], level: 'global' | 'series' | 'story'): LorebookEntry[]
getInheritedEntries(entries: LorebookEntry[], level: 'global' | 'series'): LorebookEntry[]
```

### Modified: `LorebookImportExportService`

**Import:**
- Validate `level` field present
- Validate `scopeId` present when level='series' or level='story'
- Validate `scopeId` absent when level='global'
- Reject entries with invalid level/scopeId combinations

**Export:**
- Include `level` field in JSON
- Include `scopeId` when applicable

### Modified: `PromptParser` / `ContextBuilder`

**Context building:**
- When resolving variables for story context, use hierarchical lorebook API endpoint (`/lorebook/story/:storyId/hierarchical`)
- Automatically includes global + series + story entries in matching
- No changes to variable resolver signatures

**Affected variables:**
- `{{matched_entries_chapter}}`
- `{{lorebook_chapter_matched_entries}}`
- `{{lorebook_scenebeat_matched_entries}}`
- `{{all_characters}}`, `{{all_locations}}`, etc.

All now implicitly include inherited entries.

**Implementation note:**
Prompt parsing happens server-side during AI generation. Server routes should fetch hierarchical entries and pass to prompt parser.

---

## Routing

### New Routes

**Series management:**
- `/series` - Series list page
- `/series/:seriesId` - Series dashboard (stories + lorebook tabs)

**Global lorebook:**
- `/lorebook-global` - Global lorebook management

### Modified Routes

**Story routes:**
- `/dashboard/:storyId/lorebook` - Now shows inherited entries (read-only) + story entries (editable)

---

## UI Components

### New Components

**Series:**
- `SeriesListPage` - Series list with create/delete (reuse `StoryListPage` patterns)
- `SeriesDashboard` - Tabs: Stories, Lorebook (reuse `StoryDashboard` layout)
- `SeriesForm` - Name, description fields

**Global:**
- `GlobalLorebookPage` - Manage global entries (wrapper around existing lorebook UI)

**Shared:**
- `LevelSelector` - Radio buttons: Global / Series / Story
- `LevelBadge` - Visual indicator of entry level (colour-coded pill)
- `InheritedEntriesSection` - Read-only list of global/series entries

### Modified Components

**`LorebookPage`:**
- Add level context (global/series/story)
- Show inherited entries in separate read-only section
- OR: single list with level badges, disable edit for non-matching level

**`LorebookEntryForm`:**
- Add `level` prop
- Conditionally show series/story selector based on level
- Validation: require scopeId when level='series' or level='story'

**`LorebookEntryCard`:**
- Add `LevelBadge` display
- Add `readOnly` prop (disable edit button for inherited entries)
- Add promotion/demotion action buttons

**`StoryForm`:**
- Add series dropdown (optional)
- "Assign to Series" select with "None" option

**Category-specific forms:**
- Character, Location, Item, Event, etc. - **no changes** (already generic)

### Component Reuse Strategy

**100% reusable (no changes):**
- All category-specific forms/cards
- Tag autocomplete logic
- Matching/filtering logic
- Import/export UI (just passes level/scopeId data)

**Reusable with props:**
- `LorebookList` - accept `level` filter, `readOnly` flag
- `LorebookEntryCard` - accept `readOnly`, show level badge, promotion/demotion buttons
- `LorebookEntryForm` - accept `level`, conditional selectors

**New thin wrappers:**
```typescript
// Global
<LorebookList level="global" editable={true} />

// Series
<LorebookList level="series" scopeId={seriesId} editable={true} />

// Story (with inheritance)
<>
  <InheritedEntriesSection entries={globalEntries} level="global" />
  <InheritedEntriesSection entries={seriesEntries} level="series" />
  <LorebookList level="story" scopeId={storyId} editable={true} />
</>
```

---

## Inheritance & Editing Rules

### Display in Story Lorebook View

**Option A: Sectioned layout**
```
┌─────────────────────────────────┐
│ Global Entries (read-only)      │
│ [badge] Character: John         │
│ [badge] Location: London        │
├─────────────────────────────────┤
│ Series Entries (read-only)      │
│ [badge] Character: Detective X  │
├─────────────────────────────────┤
│ Story Entries (editable)        │
│ Character: Villain Y  [Edit]    │
└─────────────────────────────────┘
```

**Option B: Unified list with badges**
```
┌─────────────────────────────────┐
│ All Lorebook Entries            │
│ [Global] Character: John        │
│ [Series] Character: Detective X │
│ [Story]  Character: Villain Y [Edit] │
└─────────────────────────────────┘
```

### Editing Permissions

**Global entries:**
- Editable **only** from `/lorebook-global`
- Read-only everywhere else

**Series entries:**
- Editable **only** from `/series/:seriesId`
- Read-only in story views

**Story entries:**
- Editable from `/dashboard/:storyId/lorebook`

### Tag Matching Behaviour

- When matching `@tags` in chapter or scene beat, search across **all** inherited entries
- Global entries matched first, then series, then story (order doesn't matter functionally)
- Disabled entries excluded regardless of level

---

## Implementation Notes

### Validation Rules

**LorebookEntry validation:**
```typescript
if (level === 'global') {
    assert(!scopeId);
}
if (level === 'series') {
    assert(scopeId);  // Must reference a series
}
if (level === 'story') {
    assert(scopeId);  // Must reference a story
}
```

### Migration Strategy (Drizzle)

**Step 1: Update schema in `server/db/schema.ts`**
Add series table and modify stories/lorebookEntries tables as shown in "Database Schema Changes" section.

**Step 2: Generate migration**
```bash
npm run db:generate  # or: drizzle-kit generate:sqlite
```

This creates a new migration file in `server/db/migrations/`.

**Step 3: Write data migration SQL**
Edit the generated migration file to include data transformation:
```sql
-- Add series table (auto-generated by Drizzle)
CREATE TABLE series (...);

-- Add seriesId column to stories
ALTER TABLE stories ADD COLUMN seriesId TEXT;
CREATE INDEX story_series_id_idx ON stories(seriesId);

-- Migrate lorebookEntries
-- 1. Add new columns
ALTER TABLE lorebookEntries ADD COLUMN level TEXT NOT NULL DEFAULT 'story';
ALTER TABLE lorebookEntries ADD COLUMN scopeId TEXT;

-- 2. Copy storyId to scopeId for existing entries
UPDATE lorebookEntries SET scopeId = storyId WHERE storyId IS NOT NULL;

-- 3. Drop old storyId column (after verification)
ALTER TABLE lorebookEntries DROP COLUMN storyId;

-- 4. Create new indices
CREATE INDEX lorebook_level_idx ON lorebookEntries(level);
CREATE INDEX lorebook_scope_id_idx ON lorebookEntries(scopeId);
CREATE INDEX lorebook_level_scope_idx ON lorebookEntries(level, scopeId);
```

**Step 4: Run migration**
```bash
npm run db:migrate  # or: drizzle-kit push:sqlite
```

**Step 5: Verify**
```bash
npm run db:studio  # Open Drizzle Studio to inspect migrated data
```

### Cascade Deletion (Application Logic)

No database cascade constraints on lorebook entries (to allow flexible level/scope management). Deletion logic handled in custom routes:

**Story deletion:**
```typescript
// In custom DELETE route override
await db.delete(schema.lorebookEntries)
  .where(and(
    eq(schema.lorebookEntries.level, 'story'),
    eq(schema.lorebookEntries.scopeId, storyId)
  ));
// Then delete story itself
await db.delete(schema.stories).where(eq(schema.stories.id, storyId));
```

**Series deletion:**
```typescript
// Orphan stories
await db.update(schema.stories)
  .set({ seriesId: null })
  .where(eq(schema.stories.seriesId, seriesId));

// Delete series-level lorebook entries
await db.delete(schema.lorebookEntries)
  .where(and(
    eq(schema.lorebookEntries.level, 'series'),
    eq(schema.lorebookEntries.scopeId, seriesId)
  ));

// Delete series
await db.delete(schema.series).where(eq(schema.series.id, seriesId));
```

### Promotion/Demotion Operations

Handled via dedicated API endpoint (`PUT /lorebook/:id/promote`):

**Server-side:**
```typescript
router.put('/:id/promote', asyncHandler(async (req, res) => {
  const { targetLevel, targetScopeId } = req.body;

  const updated = await db.update(schema.lorebookEntries)
    .set({ level: targetLevel, scopeId: targetScopeId })
    .where(eq(schema.lorebookEntries.id, req.params.id))
    .returning();

  res.json(updated[0]);
}));
```

**Frontend usage:**
```typescript
const promoteMutation = usePromoteLorebookMutation();

// Promote to series
promoteMutation.mutate({
  id: entryId,
  targetLevel: 'series',
  targetScopeId: seriesId
});

// Promote to global
promoteMutation.mutate({
  id: entryId,
  targetLevel: 'global',
  targetScopeId: undefined
});
```

**Benefits:**
- Single API call changes level and scope
- TanStack Query handles cache invalidation automatically
- Easy to add UI buttons: "Promote to Series", "Make Global", etc.

### Import/Export

**Story export:**
- Include series metadata if `story.seriesId` present
- Include all story-scoped lorebook entries
- **Do not** include series or global entries (user must export series/global separately)

**Series export (new format):**
```json
{
    "version": "1.0",
    "type": "series",
    "exportDate": "...",
    "series": { /* series data */ },
    "lorebookEntries": [ /* series-scoped entries */ ],
    "stories": [ /* array of full story exports */ ]
}
```

**Global export (new format):**
```json
{
    "version": "1.0",
    "type": "global-lorebook",
    "exportDate": "...",
    "lorebookEntries": [ /* global entries */ ]
}
```

---

## Component Architecture Summary

```
Features:
├── series/
│   ├── pages/
│   │   ├── SeriesListPage.tsx (NEW)
│   │   └── SeriesDashboard.tsx (NEW)
│   ├── components/
│   │   ├── SeriesForm.tsx (NEW)
│   │   └── SeriesCard.tsx (NEW)
│   └── hooks/
│       └── useSeriesQuery.ts (NEW: TanStack Query hooks)
│
├── lorebook/
│   ├── pages/
│   │   ├── LorebookPage.tsx (MODIFIED: level-aware)
│   │   └── GlobalLorebookPage.tsx (NEW)
│   ├── components/
│   │   ├── LorebookEntryCard.tsx (MODIFIED: level badge, readOnly, promote/demote)
│   │   ├── LorebookEntryForm.tsx (MODIFIED: level selector)
│   │   ├── LevelSelector.tsx (NEW)
│   │   ├── LevelBadge.tsx (NEW)
│   │   └── InheritedEntriesSection.tsx (NEW)
│   ├── hooks/
│   │   └── useLorebookQuery.ts (MODIFIED: level-based queries, promote/demote)
│   └── utils/
│       └── lorebookFilters.ts (MODIFIED: level filtering)
│
└── stories/
    ├── components/
    │   └── StoryForm.tsx (MODIFIED: series dropdown)
    └── hooks/
        └── useStoriesQuery.ts (EXISTING: no changes needed)
```

---

## Key Benefits

1. **Character reuse** - Define protagonist once, use across trilogy
2. **Shared worldbuilding** - Locations, items, lore shared across series
3. **Global templates** - Common character archetypes available everywhere
4. **Clean separation** - Story-specific details isolated, shared lore inherited
5. **Minimal disruption** - Existing components largely reused, existing stories unaffected
