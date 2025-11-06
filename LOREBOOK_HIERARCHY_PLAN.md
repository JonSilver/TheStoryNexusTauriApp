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
Change from story-only to level-based with unified scope reference.

**Target schema (Phase 2 final state):**
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

**Note:** Two-phase migration used to reach this schema. Phase 1 keeps `storyId` alongside new fields for safety. See Migration Strategy section.

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

Use CRUD factory with custom routes in `customRoutes` callback:

**Standard CRUD (provided by factory):**
- `GET /series`, `GET /series/:id`, `POST /series`, `PUT /series/:id`

**Custom routes to add:**
- `GET /series/:id/stories` - Fetch stories where `seriesId = :id`
- `GET /series/:id/lorebook` - Fetch entries where `level='series'` and `scopeId = :id`
- `DELETE /series/:id` - Override to:
  1. Orphan stories (set `seriesId = null`)
  2. Delete series-level lorebook entries
  3. Delete series itself

### Modified Lorebook Routes (`server/routes/lorebook.ts`)

Add custom routes for level-based queries:
- `GET /lorebook/global` - Where `level='global'`
- `GET /lorebook/series/:seriesId` - Where `level='series'` and `scopeId = seriesId`
- `GET /lorebook/story/:storyId` - Where `level='story'` and `scopeId = storyId`
- `GET /lorebook/story/:storyId/hierarchical` - Fetch story, check `seriesId`, return global + series (if applicable) + story entries using `or()` conditions
- `PUT /lorebook/:id/promote` - Update `level` and `scopeId` fields

**CRITICAL:** Default `GET /lorebook` returns ALL entries (massive dump). Either override or document not to use.

**CRITICAL:** Promote endpoint must validate `targetScopeId` references exist:
- If `targetLevel='series'`, verify series exists
- If `targetLevel='story'`, verify story exists
- Otherwise creates orphaned entries

### Modified Story Routes (`server/routes/stories.ts`)

**CRITICAL:** Override DELETE to clean up lorebook entries:
- Query and delete entries where `level='story'` and `scopeId = storyId`
- THEN delete story (which cascades chapters, aiChats, etc via FK)
- Without this, story deletion orphans lorebook entries (no FK cascade on lorebook)

---

## Frontend State Management (TanStack Query)

### New: Series Query Hooks (`src/features/series/hooks/useSeriesQuery.ts`)

Follow existing pattern from `useStoriesQuery.ts`:
- Query keys: `all`, `detail(id)`, `stories(id)`, `lorebook(id)`
- Queries: `useSeriesQuery`, `useSingleSeriesQuery`, `useSeriesStoriesQuery`
- Mutations: `useCreateSeriesMutation`, `useUpdateSeriesMutation`, `useDeleteSeriesMutation`
- Cache invalidation: series mutations invalidate series + stories queries

### Modified: Lorebook Query Hooks (`src/features/lorebook/hooks/useLorebookQuery.ts`)

Add level-based queries following existing pattern:
- New query keys: `global`, `series(id)`, `story(id)`, `hierarchical(id)`
- New queries: `useGlobalLorebookQuery`, `useSeriesLorebookQuery`, `useStoryLorebookQuery`, `useHierarchicalLorebookQuery`
- New mutation: `usePromoteLorebookMutation` (invalidates all lorebook queries on success)

**CRITICAL:** `useHierarchicalLorebookQuery` is what prompt context should use - gets global + series + story in one call.

### API Client Updates (`src/services/api/client.ts`)

Add `seriesApi` object (pattern: `getAll`, `getById`, `getStories`, `getLorebook`, `create`, `update`, `delete`)

Extend `lorebookApi` with:
- `getGlobal()`, `getBySeries(seriesId)`, `getByStory(storyId)`, `getHierarchical(storyId)`
- `promote(id, targetLevel, targetScopeId?)`

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

### Migration Strategy (Two-Phase)

Using two-phase migration to avoid SQLite `DROP COLUMN` complexity and allow verification between phases.

---

#### **Phase 1: Add New Fields (Keep storyId)**

**Schema changes (`server/db/schema.ts`):**

```typescript
// New series table
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

// Modified stories - add seriesId
export const stories = sqliteTable('stories', {
    // ... existing fields
    seriesId: text('seriesId').references(() => series.id, { onDelete: 'set null' }),
    // ...
}, (table) => ({
    // ... existing indices
    seriesIdIdx: index('story_series_id_idx').on(table.seriesId),
}));

// Modified lorebookEntries - add level/scopeId, KEEP storyId temporarily
export const lorebookEntries = sqliteTable('lorebookEntries', {
    id: text('id').primaryKey(),
    storyId: text('storyId').notNull(),  // KEEP for now
    level: text('level').notNull().default('story'),  // NEW
    scopeId: text('scopeId'),  // NEW
    // ... rest of fields unchanged
}, (table) => ({
    storyIdIdx: index('lorebook_story_id_idx').on(table.storyId),  // Keep existing
    levelIdx: index('lorebook_level_idx').on(table.level),  // NEW
    scopeIdIdx: index('lorebook_scope_id_idx').on(table.scopeId),  // NEW
    levelScopeIdx: index('lorebook_level_scope_idx').on(table.level, table.scopeId),  // NEW
    // ... other indices
}));
```

**Generate migration:**
```bash
npm run db:generate
```

**Edit generated migration SQL to add data transformation:**
```sql
-- Series table (auto-generated) ✓
CREATE TABLE series (...);

-- Stories seriesId (auto-generated) ✓
ALTER TABLE stories ADD COLUMN seriesId TEXT;
CREATE INDEX story_series_id_idx ON stories(seriesId);

-- Lorebook new columns (auto-generated) ✓
ALTER TABLE lorebookEntries ADD COLUMN level TEXT NOT NULL DEFAULT 'story';
ALTER TABLE lorebookEntries ADD COLUMN scopeId TEXT;
CREATE INDEX lorebook_level_idx ON lorebookEntries(level);
CREATE INDEX lorebook_scope_id_idx ON lorebookEntries(scopeId);
CREATE INDEX lorebook_level_scope_idx ON lorebookEntries(level, scopeId);

-- Data transformation (MANUALLY ADD) ✓
UPDATE lorebookEntries SET scopeId = storyId, level = 'story' WHERE storyId IS NOT NULL;
```

**Run migration:**
```bash
npm run db:migrate
```

**Deploy Phase 1:**
- Application works with both storyId (for old code) and level/scopeId (for new code)
- Verify all entries have correct level='story' and scopeId populated
- Test all features work with new fields

---

#### **Phase 2: Remove storyId (Later Release)**

Once Phase 1 verified and all code updated to use `level`/`scopeId`:

**Schema changes:**
```typescript
// lorebookEntries - remove storyId
export const lorebookEntries = sqliteTable('lorebookEntries', {
    id: text('id').primaryKey(),
    // storyId removed
    level: text('level').notNull(),
    scopeId: text('scopeId'),
    // ... rest unchanged
}, (table) => ({
    // storyIdIdx removed
    levelIdx: index('lorebook_level_idx').on(table.level),
    scopeIdIdx: index('lorebook_scope_id_idx').on(table.scopeId),
    levelScopeIdx: index('lorebook_level_scope_idx').on(table.level, table.scopeId),
    // ... other indices
}));
```

**Generate migration:**
```bash
npm run db:generate
```

Drizzle generates table recreation SQL (SQLite's way of dropping columns).

**Run migration:**
```bash
npm run db:migrate
```

**Benefits of two-phase:**
- Safe rollback if issues found in Phase 1
- Verify data transformation before committing
- Drizzle handles versioning automatically
- Users get migrations in sequence regardless of when they update

### Cascade Deletion (Covered in Routes Section)

No database FK cascade constraints on lorebook entries. Deletion handled in custom DELETE routes (see Server Routes section above).

### Promotion/Demotion

Single endpoint `PUT /lorebook/:id/promote` updates `level` and `scopeId` in one operation.
- TanStack Query mutation invalidates all lorebook caches on success
- UI shows buttons: "Promote to Series", "Promote to Global", "Demote to Story"

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

## Critical Implementation Issues

### 1. Zod Validation Schemas Missing

Plan doesn't define validation schemas for:
- `Series` type (name, description validation)
- Modified `LorebookEntry` (level/scopeId constraint validation)
- Promote request body (`targetLevel`, `targetScopeId`)

Current codebase uses Zod extensively (`src/schemas/entities.ts`). Add schemas following existing patterns.

### 2. Prompt Parsing Integration Unclear

PromptParser currently runs server-side during AI generation. Plan says "use hierarchical endpoint" but doesn't clarify integration point.

**Resolution needed:**
- Which server route fetches hierarchical entries for prompt context?
- Does generation endpoint call hierarchical API or query DB directly?
- Scene beat generation, continue writing, brainstorm - all need updating

### 3. Existing Lorebook Code Assumes `storyId`

Multiple features assume required `storyId` field on lorebook entries:
- Lexical LorebookTagPlugin (tag autocomplete)
- Tag matching logic in chapter/scene beat context
- Scene beat custom context selection
- Export/import code

Plan changes `storyId` to optional `scopeId`. **Must comprehensively update all lorebook references.**

### 4. Race Conditions & Transactions

Promotion endpoint has no transaction wrapping. Possible race: promote to series → series deleted mid-operation → orphaned entry.

Consider wrapping multi-step operations (series deletion, promotion) in transactions.

---

## Key Benefits

1. **Character reuse** - Define protagonist once, use across trilogy
2. **Shared worldbuilding** - Locations, items, lore shared across series
3. **Global templates** - Common character archetypes available everywhere
4. **Clean separation** - Story-specific details isolated, shared lore inherited
5. **Minimal disruption** - Existing components largely reused, existing stories unaffected
