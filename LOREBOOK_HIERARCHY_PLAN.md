# Lorebook Hierarchy Plan: Global, Series & Story Scopes

## Overview

Extend lorebook architecture to support three-tier hierarchy:
- **Global** - Available to all stories
- **Series** - Available to all stories in a series
- **Story** - Available to single story only

Enables reusable character casts, locations, and lore across multiple stories.

---

## Database Schema Changes

### New `series` table
```typescript
series: 'id, name, createdAt, isDemo'
```

Fields:
- `id: string`
- `name: string`
- `description?: string`
- `createdAt: Date`
- `isDemo?: boolean`

### Modified `stories` table
Add optional series relationship:
```typescript
stories: 'id, title, createdAt, language, seriesId, isDemo'
```

New field:
- `seriesId?: string`

### Modified `lorebookEntries` table
Change from story-only to scope-based:

**Old index:**
```typescript
lorebookEntries: 'id, storyId, name, category, *tags, isDemo'
```

**New index:**
```typescript
lorebookEntries: 'id, scope, seriesId, storyId, name, category, *tags, isDemo'
```

**New fields:**
- `scope: 'global' | 'series' | 'story'` (required)
- `seriesId?: string` (required when scope='series')
- `storyId?: string` (required when scope='story', now optional)

### Migration (Version 14)
- Tag all existing entries with `scope: 'story'`
- Existing `storyId` values preserved
- Add new indices

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
    scope: 'global' | 'series' | 'story';
    seriesId?: string;  // Required when scope='series'
    storyId?: string;   // Required when scope='story'
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

## Database Methods (`src/services/database.ts`)

### Add Series Table Declaration
```typescript
export class StoryDatabase extends Dexie {
    series!: Table<Series>;
    // ... existing tables
}
```

### New Series Methods

**CRUD:**
- `async createSeries(data: Omit<Series, 'id' | 'createdAt'>): Promise<string>`
- `async updateSeries(id: string, data: Partial<Series>): Promise<void>`
- `async deleteSeries(id: string): Promise<void>`
- `async getSeries(id: string): Promise<Series | undefined>`
- `async getAllSeries(): Promise<Series[]>`

**Relationships:**
- `async getSeriesWithStories(seriesId: string): Promise<{ series: Series; stories: Story[] }>`
- `async deleteSeriesWithRelated(seriesId: string): Promise<void>`
  - Deletes series
  - Nullifies `story.seriesId` for all stories in series (orphans them)
  - Deletes all lorebook entries with `scope='series'` and matching `seriesId`
  - Preserves global and story-scoped entries

### Modified Story Methods

**Add:**
- `async updateStorySeriesAssignment(storyId: string, seriesId?: string): Promise<void>`

**Modify:**
- `deleteStoryWithRelated()` - only delete story-scoped entries, preserve series/global

### New Lorebook Methods

**Hierarchical retrieval:**
- `async getLorebookEntriesForStory(storyId: string): Promise<LorebookEntry[]>`
  - Returns global entries + series entries (if story has seriesId) + story entries
  - Single denormalized query for prompt context

**Scope-based queries:**
- `async getLorebookEntriesByScope(scope: 'global' | 'series' | 'story', id?: string): Promise<LorebookEntry[]>`
  - `scope='global'` - all global entries
  - `scope='series', id=seriesId` - all entries for series
  - `scope='story', id=storyId` - all entries for story

**Modified:**
- Existing `getLorebookEntriesByStory()`, `getLorebookEntriesByTag()`, `getLorebookEntriesByCategory()` updated to handle optional storyId and scope filtering

---

## State Management

### New Store: `useSeriesStore`

**Location:** `src/features/series/stores/useSeriesStore.ts`

**State:**
```typescript
interface SeriesState {
    series: Series[];
    isLoading: boolean;
    error: string | null;

    loadAllSeries: () => Promise<void>;
    createSeries: (data: Omit<Series, 'id' | 'createdAt'>) => Promise<string>;
    updateSeries: (id: string, data: Partial<Series>) => Promise<void>;
    deleteSeries: (id: string) => Promise<void>;
    getStoriesInSeries: (seriesId: string) => Promise<Story[]>;
}
```

### Modified Store: `useStoryStore`

**Add:**
- `updateSeriesAssignment: (storyId: string, seriesId?: string | null) => Promise<void>`

### Modified Store: `useLorebookStore`

**Changes:**

**Loading:**
```typescript
// Old
loadEntries: (storyId: string) => Promise<void>;

// New
loadEntries: (scope: 'global' | 'series' | 'story', id?: string) => Promise<void>;
loadHierarchicalEntries: (storyId: string) => Promise<void>;  // NEW: loads global + series + story
```

**Creation:**
```typescript
// Old
createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;

// New - must include scope, seriesId, or storyId
createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;
```

**Filtering:**
- Add `getEntriesByScope: (scope: 'global' | 'series' | 'story') => LorebookEntry[]`
- Existing filters remain unchanged (already work with in-memory entries)

---

## Services

### Modified: `LorebookFilterService`

**Add:**
```typescript
filterByScope(entries: LorebookEntry[], scope: 'global' | 'series' | 'story'): LorebookEntry[]
getInheritedEntries(entries: LorebookEntry[], scope: 'global' | 'series'): LorebookEntry[]
```

### Modified: `LorebookImportExportService`

**Import:**
- Validate `scope` field present
- Validate `seriesId` present when scope='series'
- Validate `storyId` present when scope='story'
- Reject entries with invalid scope/id combinations

**Export:**
- Include `scope` field in JSON
- Include `seriesId` when scope='series'

### Modified: `PromptParser` / `ContextBuilder`

**Context building:**
- When resolving variables for story context, use `db.getLorebookEntriesForStory(storyId)` instead of story-only query
- Automatically includes global + series + story entries in matching
- No changes to variable resolver signatures

**Affected variables:**
- `{{matched_entries_chapter}}`
- `{{lorebook_chapter_matched_entries}}`
- `{{lorebook_scenebeat_matched_entries}}`
- `{{all_characters}}`, `{{all_locations}}`, etc.

All now implicitly include inherited entries.

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
- `ScopeSelector` - Radio buttons: Global / Series / Story
- `ScopeBadge` - Visual indicator of entry scope (colour-coded pill)
- `InheritedEntriesSection` - Read-only list of global/series entries

### Modified Components

**`LorebookPage`:**
- Add scope context (global/series/story)
- Show inherited entries in separate read-only section
- OR: single list with scope badges, disable edit for non-matching scope

**`LorebookEntryForm`:**
- Add `scope` prop
- Conditionally show series/story selector based on scope
- Validation: require seriesId when scope='series', storyId when scope='story'

**`LorebookEntryCard`:**
- Add `ScopeBadge` display
- Add `readOnly` prop (disable edit button for inherited entries)

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
- Import/export UI (just passes scope data)

**Reusable with props:**
- `LorebookList` - accept `scope` filter, `readOnly` flag
- `LorebookEntryCard` - accept `readOnly`, show scope badge
- `LorebookEntryForm` - accept `scope`, conditional selectors

**New thin wrappers:**
```typescript
// Global
<LorebookList scope="global" editable={true} />

// Series
<LorebookList scope="series" seriesId={seriesId} editable={true} />

// Story (with inheritance)
<>
  <InheritedEntriesSection entries={globalEntries} scope="global" />
  <InheritedEntriesSection entries={seriesEntries} scope="series" />
  <LorebookList scope="story" storyId={storyId} editable={true} />
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
- Disabled entries excluded regardless of scope

---

## Implementation Notes

### Validation Rules

**LorebookEntry validation:**
```typescript
if (scope === 'global') {
    assert(!seriesId && !storyId);
}
if (scope === 'series') {
    assert(seriesId && !storyId);
}
if (scope === 'story') {
    assert(storyId && !seriesId);
}
```

### Migration Strategy

**Database version 14 upgrade:**
```typescript
this.version(14).stores({
    series: 'id, name, createdAt, isDemo',
    stories: 'id, title, createdAt, language, seriesId, isDemo',
    lorebookEntries: 'id, scope, seriesId, storyId, name, category, *tags, isDemo',
    // ... other tables unchanged
}).upgrade(async (tx) => {
    // Tag all existing entries as story-scoped
    const entries = await tx.table('lorebookEntries').toArray();
    for (const entry of entries) {
        await tx.table('lorebookEntries').update(entry.id, {
            scope: 'story'
        });
    }
});
```

### Cascade Deletion

**Story deletion:**
- Delete only `scope='story'` entries with matching `storyId`
- Preserve global and series entries

**Series deletion:**
- Delete only `scope='series'` entries with matching `seriesId`
- Set `seriesId=null` for all stories in series
- Preserve global and story entries

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
│   │   ├── SeriesListPage.tsx
│   │   └── SeriesDashboard.tsx
│   ├── components/
│   │   ├── SeriesForm.tsx
│   │   └── SeriesCard.tsx
│   └── stores/
│       └── useSeriesStore.ts
│
├── lorebook/
│   ├── pages/
│   │   ├── LorebookPage.tsx (MODIFIED: scope-aware)
│   │   └── GlobalLorebookPage.tsx (NEW)
│   ├── components/
│   │   ├── LorebookEntryCard.tsx (MODIFIED: scope badge, readOnly)
│   │   ├── LorebookEntryForm.tsx (MODIFIED: scope selector)
│   │   ├── ScopeSelector.tsx (NEW)
│   │   ├── ScopeBadge.tsx (NEW)
│   │   └── InheritedEntriesSection.tsx (NEW)
│   └── stores/
│       └── useLorebookStore.ts (MODIFIED: scope methods)
│
└── stories/
    ├── components/
    │   └── StoryForm.tsx (MODIFIED: series dropdown)
    └── stores/
        └── useStoryStore.ts (MODIFIED: series assignment)
```

---

## Key Benefits

1. **Character reuse** - Define protagonist once, use across trilogy
2. **Shared worldbuilding** - Locations, items, lore shared across series
3. **Global templates** - Common character archetypes available everywhere
4. **Clean separation** - Story-specific details isolated, shared lore inherited
5. **Minimal disruption** - Existing components largely reused, existing stories unaffected
