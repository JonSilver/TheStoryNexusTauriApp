# Implementation Plan #08: Notes Tool Refactor

**Model:** Haiku
**Dependencies:** #01 (workspace infrastructure must exist)
**Estimated Complexity:** Low

---

## Objective

Refactor Notes page as workspace tool. Split view using `react-resizable-panels`: note list + editor. Remove old notes navigation chrome.

---

## Key Features

- Desktop: Two-column split (note list, note editor)
- Mobile: Two-stage (list → editor)
- Split view resizable (react-resizable-panels)
- Markdown editor for note content

---

## Files to Create

### `src/components/workspace/tools/NotesTool.tsx`

```tsx
import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useNotesQuery } from '@/features/notes/hooks/useNotesQuery';
import { NoteList } from '@/features/notes/components/NoteList';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import type { Note } from '@/types/notes';

interface NotesToolProps {
  storyId: string;
}

export const NotesTool = ({ storyId }: NotesToolProps) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const { data: notes, isLoading } = useNotesQuery(storyId);

  // Mobile: two-stage view
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    if (selectedNote) {
      return (
        <div className="h-full">
          <NoteEditor
            note={selectedNote}
            onBack={() => setSelectedNote(null)}
            storyId={storyId}
          />
        </div>
      );
    }

    return (
      <div className="h-full">
        <NoteList
          notes={notes || []}
          selectedNote={selectedNote}
          onSelectNote={setSelectedNote}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Desktop: split view
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={35} minSize={25} maxSize={50}>
        <NoteList
          notes={notes || []}
          selectedNote={selectedNote}
          onSelectNote={setSelectedNote}
          isLoading={isLoading}
        />
      </Panel>

      <PanelResizeHandle className="w-px bg-border" />

      <Panel defaultSize={65} minSize={50}>
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onBack={null} // No back button on desktop
            storyId={storyId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a note to edit
          </div>
        )}
      </Panel>
    </PanelGroup>
  );
};
```

---

## Files to Extract/Create

### `src/features/notes/components/NoteList.tsx`

Note list (if doesn't already exist):

```tsx
import { Button } from '@/components/ui/button';
import type { Note } from '@/types/notes';

interface NoteListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  isLoading: boolean;
}

export const NoteList = ({
  notes,
  selectedNote,
  onSelectNote,
  isLoading,
}: NoteListProps) => {
  if (isLoading) return <div className="p-4">Loading...</div>;

  if (notes.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        No notes yet.
        {/* TODO: Add "New Note" button */}
      </div>
    );
  }

  return (
    <div className="h-full border-r overflow-y-auto">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Notes</h3>
          {/* TODO: Add "New Note" button */}
        </div>
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => onSelectNote(note)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedNote?.id === note.id ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <div className="font-medium">{note.title || 'Untitled'}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {note.content?.substring(0, 100) || 'No content'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### `src/features/notes/components/NoteEditor.tsx`

Note editor (markdown or plain text):

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import type { Note } from '@/types/notes';

interface NoteEditorProps {
  note: Note;
  onBack: (() => void) | null;
  storyId: string;
}

export const NoteEditor = ({ note, onBack, storyId }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');

  // TODO: Implement save/update mutation
  // TODO: Debounce auto-save

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="text-2xl font-bold border-none px-0"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here... (Markdown supported)"
          className="flex-1 min-h-[400px] border-none px-0 resize-none"
        />
        {/* TODO: Markdown preview toggle */}
      </div>
    </div>
  );
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add NotesTool rendering:

**Add import:**
```tsx
import { NotesTool } from '@/components/workspace/tools/NotesTool';
```

**Update main content area:**
```tsx
{currentTool === 'notes' && (
  <NotesTool storyId={storyId!} />
)}
```

---

## Implementation Steps

1. **Extract/create NoteList component**
2. **Extract/create NoteEditor component** (simple textarea for now, markdown preview optional)
3. **Create NotesTool** (orchestrates with PanelGroup)
4. **Update Workspace.tsx** to render NotesTool
5. **Test desktop**: Verify split view, resizable panels
6. **Test mobile**: Verify two-stage list → editor

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Desktop: Two-column split view
- Mobile: Two-stage view

---

## Testing Checklist

- [ ] Open workspace, click "Notes" in sidebar
- [ ] Desktop (>768px):
  - [ ] Two columns visible (list, editor)
  - [ ] Drag resize handle, verify panels resize
  - [ ] Click note, verify editor shows note
  - [ ] Edit note title/content (auto-save can be placeholder)
- [ ] Mobile (<768px):
  - [ ] Stage 1: Note list
  - [ ] Click note → Stage 2: Note editor
  - [ ] Back button returns to list
- [ ] No console errors

---

## Notes for Agent

- Reuse existing note components if available
- Markdown preview is optional enhancement (not required for this plan)
- Auto-save can be placeholder (just update local state)
- Create/delete note actions added in later enhancement if needed
- Focus on layout and basic editing, not full functionality
