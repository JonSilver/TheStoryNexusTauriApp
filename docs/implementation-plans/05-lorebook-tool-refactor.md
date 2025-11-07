# Implementation Plan #05: Lorebook Tool Refactor

**Model:** Haiku
**Dependencies:** #01 (workspace infrastructure must exist)
**Estimated Complexity:** Medium

---

## Objective

Refactor Lorebook page as workspace tool. Split view using `react-resizable-panels`: category filter + entry list + entry editor. Remove old lorebook navigation chrome.

---

## Key Features

- Desktop: Three-column split (category tabs, entry list, entry editor)
- Mobile: Two-stage (list → editor)
- Split view resizable (react-resizable-panels)
- State preserved (selected category, selected entry)

---

## Files to Create

### `src/components/workspace/tools/LorebookTool.tsx`

```tsx
import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLorebookQuery } from '@/features/lorebook/hooks/useLorebookQuery';
import { LorebookCategoryFilter } from '@/features/lorebook/components/LorebookCategoryFilter';
import { LorebookEntryList } from '@/features/lorebook/components/LorebookEntryList';
import { LorebookEntryEditor } from '@/features/lorebook/components/LorebookEntryEditor';
import type { LorebookCategory, LorebookEntry } from '@/types/lorebook';

interface LorebookToolProps {
  storyId: string;
}

export const LorebookTool = ({ storyId }: LorebookToolProps) => {
  const [selectedCategory, setSelectedCategory] = useState<LorebookCategory | 'all'>('all');
  const [selectedEntry, setSelectedEntry] = useState<LorebookEntry | null>(null);

  const { data: entries, isLoading } = useLorebookQuery(storyId);

  const filteredEntries =
    selectedCategory === 'all'
      ? entries || []
      : entries?.filter((e) => e.category === selectedCategory) || [];

  // Mobile: two-stage view
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    if (selectedEntry) {
      return (
        <div className="h-full">
          <LorebookEntryEditor
            entry={selectedEntry}
            onBack={() => setSelectedEntry(null)}
            storyId={storyId}
          />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <LorebookCategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <LorebookEntryList
          entries={filteredEntries}
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Desktop: split view
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={20} minSize={15} maxSize={30}>
        <LorebookCategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </Panel>

      <PanelResizeHandle className="w-px bg-border" />

      <Panel defaultSize={30} minSize={20}>
        <LorebookEntryList
          entries={filteredEntries}
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
          isLoading={isLoading}
        />
      </Panel>

      <PanelResizeHandle className="w-px bg-border" />

      <Panel defaultSize={50} minSize={30}>
        {selectedEntry ? (
          <LorebookEntryEditor
            entry={selectedEntry}
            onBack={null} // No back button on desktop
            storyId={storyId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an entry to edit
          </div>
        )}
      </Panel>
    </PanelGroup>
  );
};
```

---

## Files to Extract/Refactor

The existing Lorebook page likely has these concerns mixed together. Extract them into separate components:

### `src/features/lorebook/components/LorebookCategoryFilter.tsx`

Category tabs/filter (vertical list or horizontal tabs):

```tsx
import { Button } from '@/components/ui/button';
import type { LorebookCategory } from '@/types/lorebook';

const categories: Array<{ id: LorebookCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'Characters' },
  { id: 'location', label: 'Locations' },
  { id: 'item', label: 'Items' },
  { id: 'event', label: 'Events' },
  { id: 'note', label: 'Notes' },
  { id: 'synopsis', label: 'Synopsis' },
  { id: 'starting_scenario', label: 'Starting Scenario' },
  { id: 'timeline', label: 'Timelines' },
];

interface LorebookCategoryFilterProps {
  selectedCategory: LorebookCategory | 'all';
  onCategoryChange: (category: LorebookCategory | 'all') => void;
}

export const LorebookCategoryFilter = ({
  selectedCategory,
  onCategoryChange,
}: LorebookCategoryFilterProps) => {
  return (
    <div className="h-full border-r p-4 space-y-2 overflow-y-auto">
      <h3 className="font-semibold mb-4">Categories</h3>
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onCategoryChange(cat.id)}
        >
          {cat.label}
        </Button>
      ))}
    </div>
  );
};
```

### `src/features/lorebook/components/LorebookEntryList.tsx`

Entry list (scrollable):

```tsx
import { Button } from '@/components/ui/button';
import type { LorebookEntry } from '@/types/lorebook';

interface LorebookEntryListProps {
  entries: LorebookEntry[];
  selectedEntry: LorebookEntry | null;
  onSelectEntry: (entry: LorebookEntry) => void;
  isLoading: boolean;
}

export const LorebookEntryList = ({
  entries,
  selectedEntry,
  onSelectEntry,
  isLoading,
}: LorebookEntryListProps) => {
  if (isLoading) return <div className="p-4">Loading...</div>;

  if (entries.length === 0) {
    return <div className="p-4 text-muted-foreground">No entries</div>;
  }

  return (
    <div className="h-full border-r overflow-y-auto">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Entries</h3>
          {/* TODO: Add "New Entry" button */}
        </div>
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelectEntry(entry)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedEntry?.id === entry.id ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <div className="font-medium">{entry.title}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {entry.tags?.join(', ') || 'No tags'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### `src/features/lorebook/components/LorebookEntryEditor.tsx`

Entry editor form (reuse existing editor if it exists, or create simple form):

```tsx
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { LorebookEntry } from '@/types/lorebook';

interface LorebookEntryEditorProps {
  entry: LorebookEntry;
  onBack: (() => void) | null; // null on desktop (no back button)
  storyId: string;
}

export const LorebookEntryEditor = ({ entry, onBack, storyId }: LorebookEntryEditorProps) => {
  // TODO: Implement actual form with title, content, tags, category, disabled toggle
  // Reuse existing lorebook entry form if available

  return (
    <div className="h-full flex flex-col">
      {onBack && (
        <div className="border-b p-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-2xl font-bold mb-4">{entry.title}</h2>
        {/* TODO: Render actual entry editor form */}
        <p className="text-muted-foreground">Entry editor form goes here</p>
        <pre className="mt-4 text-xs">{JSON.stringify(entry, null, 2)}</pre>
      </div>
    </div>
  );
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add LorebookTool rendering:

**Add import:**
```tsx
import { LorebookTool } from '@/components/workspace/tools/LorebookTool';
```

**Update main content area:**
```tsx
{currentTool === 'lorebook' && (
  <LorebookTool storyId={storyId!} />
)}
```

---

## Implementation Steps

1. **Extract/create LorebookCategoryFilter** (vertical button list)
2. **Extract/create LorebookEntryList** (scrollable entry cards)
3. **Extract/create LorebookEntryEditor** (form for editing entry)
4. **Create LorebookTool** (orchestrates all three with PanelGroup)
5. **Update Workspace.tsx** to render LorebookTool
6. **Test desktop**: Verify three-column split, resizable panels
7. **Test mobile**: Verify two-stage list → editor

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Desktop: Three-column split view
- Panels resizable
- Mobile: Two-stage view

---

## Testing Checklist

- [ ] Open workspace, click "Lorebook" in sidebar
- [ ] Desktop (>768px):
  - [ ] Three columns visible (categories, entries, editor)
  - [ ] Drag resize handles, verify panels resize
  - [ ] Click category, verify entry list filters
  - [ ] Click entry, verify editor shows entry
- [ ] Mobile (<768px):
  - [ ] Stage 1: Category filter + entry list
  - [ ] Click entry → Stage 2: Entry editor full-screen
  - [ ] Back button returns to list
- [ ] No console errors

---

## Notes for Agent

- If existing Lorebook page already has clean components, reuse them
- If existing page is monolithic, extract components as specified
- Do NOT implement full CRUD yet (create/delete/update) - just viewing/selection
- Entry editor can be placeholder for now (just shows entry data)
- Focus on layout and navigation, not full functionality
