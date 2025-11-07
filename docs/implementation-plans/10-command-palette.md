# Implementation Plan #10: Command Palette

**Model:** Sonnet
**Dependencies:** #03-#08 (all tools must exist to search across them)
**Estimated Complexity:** High

---

## Objective

Integrate `cmdk` library for command palette. Unified search: chapters, lorebook entries, prompts, notes, actions. Keyboard trigger (Cmd+K) + TopBar search icon. Tool/chapter switching via palette.

---

## Key Features

- Fuzzy search across all resources (chapters, lorebook, prompts, notes)
- Quick actions (create new chapter, new lorebook entry, export story, etc.)
- Tool switching commands
- Keyboard shortcuts (Cmd+K / Ctrl+K)
- Grouped results by type
- Keyboard navigation

---

## Files to Create

### `src/components/workspace/CommandPalette.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useChaptersQuery } from '@/features/chapters/hooks/useChaptersQuery';
import { useLorebookQuery } from '@/features/lorebook/hooks/useLorebookQuery';
import { usePromptsQuery } from '@/features/prompts/hooks/usePromptsQuery';
import { useNotesQuery } from '@/features/notes/hooks/useNotesQuery';
import {
  FileText,
  Book,
  Settings,
  StickyNote,
  Home,
  MessageSquare,
  Search,
} from 'lucide-react';

interface CommandPaletteProps {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette = ({ storyId, open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { setCurrentTool, setCurrentChapterId, setRightPanelOpen } = useWorkspace();

  const { data: chapters } = useChaptersQuery(storyId);
  const { data: lorebookEntries } = useLorebookQuery(storyId);
  const { data: prompts } = usePromptsQuery(storyId);
  const { data: notes } = useNotesQuery(storyId);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelectChapter = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    setCurrentTool('editor');
    onOpenChange(false);
  };

  const handleSelectLorebookEntry = (entryId: string) => {
    setCurrentTool('lorebook');
    // TODO: Set selected lorebook entry in Lorebook tool state
    onOpenChange(false);
  };

  const handleSelectPrompt = (promptId: string) => {
    setCurrentTool('prompts');
    // TODO: Set selected prompt in Prompts tool state
    onOpenChange(false);
  };

  const handleSelectNote = (noteId: string) => {
    setCurrentTool('notes');
    // TODO: Set selected note in Notes tool state
    onOpenChange(false);
  };

  const handleToolSwitch = (tool: 'editor' | 'chapters' | 'lorebook' | 'brainstorm' | 'prompts' | 'notes') => {
    setCurrentTool(tool);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search or jump to..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Tool Switching */}
        <CommandGroup heading="Tools">
          <CommandItem onSelect={() => handleToolSwitch('editor')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Editor</span>
          </CommandItem>
          <CommandItem onSelect={() => handleToolSwitch('chapters')}>
            <Home className="mr-2 h-4 w-4" />
            <span>Chapters</span>
          </CommandItem>
          <CommandItem onSelect={() => handleToolSwitch('lorebook')}>
            <Book className="mr-2 h-4 w-4" />
            <span>Lorebook</span>
          </CommandItem>
          <CommandItem onSelect={() => handleToolSwitch('brainstorm')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Brainstorm</span>
          </CommandItem>
          <CommandItem onSelect={() => handleToolSwitch('prompts')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Prompts</span>
          </CommandItem>
          <CommandItem onSelect={() => handleToolSwitch('notes')}>
            <StickyNote className="mr-2 h-4 w-4" />
            <span>Notes</span>
          </CommandItem>
        </CommandGroup>

        {/* Chapters */}
        {chapters && chapters.length > 0 && (
          <CommandGroup heading="Chapters">
            {chapters.slice(0, 5).map((chapter) => (
              <CommandItem key={chapter.id} onSelect={() => handleSelectChapter(chapter.id)}>
                <FileText className="mr-2 h-4 w-4" />
                <span>{chapter.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Lorebook Entries */}
        {lorebookEntries && lorebookEntries.length > 0 && (
          <CommandGroup heading="Lorebook">
            {lorebookEntries.slice(0, 5).map((entry) => (
              <CommandItem key={entry.id} onSelect={() => handleSelectLorebookEntry(entry.id)}>
                <Book className="mr-2 h-4 w-4" />
                <span>{entry.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Prompts */}
        {prompts && prompts.length > 0 && (
          <CommandGroup heading="Prompts">
            {prompts.slice(0, 5).map((prompt) => (
              <CommandItem key={prompt.id} onSelect={() => handleSelectPrompt(prompt.id)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{prompt.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Notes */}
        {notes && notes.length > 0 && (
          <CommandGroup heading="Notes">
            {notes.slice(0, 5).map((note) => (
              <CommandItem key={note.id} onSelect={() => handleSelectNote(note.id)}>
                <StickyNote className="mr-2 h-4 w-4" />
                <span>{note.title || 'Untitled'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { setRightPanelOpen(true); onOpenChange(false); }}>
            <span>Show Right Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => { setRightPanelOpen(false); onOpenChange(false); }}>
            <span>Hide Right Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => { navigate('/stories'); onOpenChange(false); }}>
            <span>Back to Stories</span>
          </CommandItem>
          {/* TODO: Add more actions (export story, create chapter, etc.) */}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add command palette state and trigger:

**Add imports:**
```tsx
import { useState } from 'react'; // May already exist
import { CommandPalette } from '@/components/workspace/CommandPalette';
```

**Add state:**
```tsx
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
```

**Add before return:**
```tsx
// Keyboard shortcut already handled in CommandPalette, but can add manual trigger
```

**Add after main content:**
```tsx
<CommandPalette
  storyId={storyId!}
  open={commandPaletteOpen}
  onOpenChange={setCommandPaletteOpen}
/>
```

---

### `src/components/workspace/WorkspaceTopBar.tsx`

Add search icon trigger:

**Add imports:**
```tsx
import { Search } from 'lucide-react';
```

**Add prop:**
```tsx
interface WorkspaceTopBarProps {
  storyTitle: string;
  storyId: string;
  onOpenCommandPalette: () => void;
}
```

**Add search button before chapter switcher:**
```tsx
<Button variant="ghost" size="sm" onClick={onOpenCommandPalette}>
  <Search className="h-4 w-4" />
</Button>
```

**Update Workspace.tsx call:**
```tsx
<WorkspaceTopBar
  storyTitle={story.title}
  storyId={storyId!}
  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
/>
```

---

## Dependencies Already Installed

The `cmdk` library should already be installed from plan #01. Verify:

```bash
npm list cmdk
```

If not installed:
```bash
npm install cmdk
```

---

## Implementation Steps

1. **Verify cmdk installed** (should be from plan #01)

2. **Create CommandPalette component:**
   - Use Shadcn Command components (Dialog, Input, List, etc.)
   - Fetch all resources (chapters, lorebook, prompts, notes)
   - Group results by type
   - Handle keyboard shortcut (Cmd+K)
   - Handle item selection (switch tool, select resource)

3. **Add to Workspace page:**
   - State for open/close
   - Render CommandPalette
   - Pass story ID

4. **Add trigger to TopBar:**
   - Search icon button
   - onClick opens palette

5. **Test fuzzy search:**
   - Type chapter name, verify matches
   - Type lorebook entry, verify matches
   - Type partial match, verify fuzzy search works

6. **Test navigation:**
   - Select chapter → switches to Editor with that chapter
   - Select lorebook entry → switches to Lorebook (ideally with entry selected)
   - Select tool → switches to that tool

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Command palette opens on Cmd+K
- Search works across all resource types
- Navigation works correctly

---

## Testing Checklist

- [ ] Open workspace
- [ ] Press Cmd+K (or Ctrl+K on Windows)
- [ ] Command palette opens
- [ ] Type chapter name, verify chapter appears in results
- [ ] Select chapter, verify switches to Editor with that chapter
- [ ] Press Cmd+K again
- [ ] Type lorebook entry name, verify entry appears
- [ ] Select entry, verify switches to Lorebook tool
- [ ] Click search icon in top bar, palette opens
- [ ] Type tool name (e.g., "prompts"), verify tool switching works
- [ ] Type partial match (fuzzy search), verify results
- [ ] Press Escape, palette closes
- [ ] No console errors

---

## Future Enhancements (Not in This Plan)

- Fuzzy search algorithm (cmdk has built-in, but can improve)
- Recent items / MRU ordering
- Create actions (new chapter, new entry) directly from palette
- Search preview (show content snippet)
- Keyboard shortcuts shown in palette
- Search filters (e.g., "chapter:", "tag:", etc.)

---

## Notes for Agent

- cmdk library handles fuzzy matching automatically
- Limit results to top 5 per group for performance
- Tool selection state for Lorebook/Prompts/Notes needs to be added to their respective tool components (or use shared state)
- For now, selecting a lorebook entry just opens Lorebook tool; detailed selection can be enhanced later
- Focus on basic search and navigation, not advanced features
