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
Change from story-only to level-based with unified scope reference:

**Old index:**
```typescript
lorebookEntries: 'id, storyId, name, category, *tags, isDemo'
```

**New index:**
```typescript
lorebookEntries: 'id, level, scopeId, name, category, *tags, isDemo'
```

**New fields:**
- `level: 'global' | 'series' | 'story'` (required)
- `scopeId?: string` (optional - contains seriesId when level='series', storyId when level='story', null when level='global')

**Benefits:**
- Single field for scope reference (cleaner schema)
- Enables promotion/demotion: just change `level` and update `scopeId`
- Simpler validation logic

### Migration (Version 14)
- Tag all existing entries with `level: 'story'`
- Rename `storyId` to `scopeId`
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
  - Deletes all lorebook entries with `level='series'` and matching `scopeId`
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

**Level-based queries:**
- `async getLorebookEntriesByLevel(level: 'global' | 'series' | 'story', scopeId?: string): Promise<LorebookEntry[]>`
  - `level='global'` - all global entries (scopeId ignored)
  - `level='series', scopeId=seriesId` - all entries for series
  - `level='story', scopeId=storyId` - all entries for story

**Modified:**
- Existing `getLorebookEntriesByStory()`, `getLorebookEntriesByTag()`, `getLorebookEntriesByCategory()` updated to handle level filtering

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
loadEntries: (level: 'global' | 'series' | 'story', scopeId?: string) => Promise<void>;
loadHierarchicalEntries: (storyId: string) => Promise<void>;  // NEW: loads global + series + story
```

**Creation:**
```typescript
// Old
createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;

// New - must include level and scopeId
createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;
```

**Filtering:**
- Add `getEntriesByLevel: (level: 'global' | 'series' | 'story') => LorebookEntry[]`
- Existing filters remain unchanged (already work with in-memory entries)

**Promotion/Demotion:**
- Add `promoteToSeries: (entryId: string, targetSeriesId: string) => Promise<void>`
- Add `promoteToGlobal: (entryId: string) => Promise<void>`
- Add `demoteToSeries: (entryId: string, targetSeriesId: string) => Promise<void>`
- Add `demoteToStory: (entryId: string, targetStoryId: string) => Promise<void>`

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

### Migration Strategy

**Database version 14 upgrade:**
```typescript
this.version(14).stores({
    series: 'id, name, createdAt, isDemo',
    stories: 'id, title, createdAt, language, seriesId, isDemo',
    lorebookEntries: 'id, level, scopeId, name, category, *tags, isDemo',
    // ... other tables unchanged
}).upgrade(async (tx) => {
    // Migrate existing entries: set level='story', rename storyId to scopeId
    const entries = await tx.table('lorebookEntries').toArray();
    for (const entry of entries) {
        await tx.table('lorebookEntries').update(entry.id, {
            level: 'story',
            scopeId: entry.storyId
        });
    }
});
```

### Cascade Deletion

**Story deletion:**
- Delete only `level='story'` entries with matching `scopeId`
- Preserve global and series entries

**Series deletion:**
- Delete only `level='series'` entries with matching `scopeId`
- Set `seriesId=null` for all stories in series
- Preserve global and story entries

### Promotion/Demotion Operations

**Promote story entry to series:**
```typescript
async promoteToSeries(entryId: string, targetSeriesId: string): Promise<void> {
    await db.lorebookEntries.update(entryId, {
        level: 'series',
        scopeId: targetSeriesId
    });
}
```

**Promote series entry to global:**
```typescript
async promoteToGlobal(entryId: string): Promise<void> {
    await db.lorebookEntries.update(entryId, {
        level: 'global',
        scopeId: undefined
    });
}
```

**Demote global entry to series:**
```typescript
async demoteToSeries(entryId: string, targetSeriesId: string): Promise<void> {
    await db.lorebookEntries.update(entryId, {
        level: 'series',
        scopeId: targetSeriesId
    });
}
```

**Demote series entry to story:**
```typescript
async demoteToStory(entryId: string, targetStoryId: string): Promise<void> {
    await db.lorebookEntries.update(entryId, {
        level: 'story',
        scopeId: targetStoryId
    });
}
```

**Benefits:**
- Single operation changes level and scope
- No complex field juggling
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
│   │   ├── LorebookPage.tsx (MODIFIED: level-aware)
│   │   └── GlobalLorebookPage.tsx (NEW)
│   ├── components/
│   │   ├── LorebookEntryCard.tsx (MODIFIED: level badge, readOnly, promote/demote)
│   │   ├── LorebookEntryForm.tsx (MODIFIED: level selector)
│   │   ├── LevelSelector.tsx (NEW)
│   │   ├── LevelBadge.tsx (NEW)
│   │   └── InheritedEntriesSection.tsx (NEW)
│   └── stores/
│       └── useLorebookStore.ts (MODIFIED: level methods, promote/demote)
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
