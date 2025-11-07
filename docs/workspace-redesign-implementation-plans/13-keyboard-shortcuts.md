# Implementation Plan #13: Keyboard Shortcuts

**Model:** Haiku
**Dependencies:** #03-#08 (all tools must exist)
**Estimated Complexity:** Low

---

## Objective

Implement keyboard shortcuts for tool switching, chapter picker, command palette, and right panel toggle.

---

## Keyboard Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| Cmd/Ctrl+K | Open command palette | Already implemented in #10 |
| Cmd/Ctrl+1 | Switch to Editor tool | |
| Cmd/Ctrl+2 | Switch to Chapters tool | |
| Cmd/Ctrl+3 | Switch to Lorebook tool | |
| Cmd/Ctrl+4 | Switch to Brainstorm tool | |
| Cmd/Ctrl+5 | Switch to Prompts tool | |
| Cmd/Ctrl+6 | Switch to Notes tool | |
| Cmd/Ctrl+J | Open chapter picker | |
| Cmd/Ctrl+Shift+K | Toggle right panel | Desktop only |
| Alt/Option+S | Insert scene beat | May already exist in editor |

---

## Files to Create

### `src/hooks/useKeyboardShortcuts.ts`

```tsx
import { useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export const useKeyboardShortcuts = () => {
  const { setCurrentTool, rightPanelOpen, setRightPanelOpen } = useWorkspace();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Tool switching: Cmd/Ctrl + 1-6
      if (modifier && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setCurrentTool('editor');
            break;
          case '2':
            e.preventDefault();
            setCurrentTool('chapters');
            break;
          case '3':
            e.preventDefault();
            setCurrentTool('lorebook');
            break;
          case '4':
            e.preventDefault();
            setCurrentTool('brainstorm');
            break;
          case '5':
            e.preventDefault();
            setCurrentTool('prompts');
            break;
          case '6':
            e.preventDefault();
            setCurrentTool('notes');
            break;
          case 'j':
            e.preventDefault();
            // TODO: Open chapter picker (trigger via event or state)
            break;
        }
      }

      // Right panel toggle: Cmd/Ctrl + Shift + K
      if (modifier && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setRightPanelOpen(!rightPanelOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTool, rightPanelOpen, setRightPanelOpen]);
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add keyboard shortcuts hook:

**Add import:**
```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
```

**Add inside WorkspaceContent component:**
```tsx
useKeyboardShortcuts();
```

---

### Chapter Picker Shortcut (Cmd+J)

**Challenge:** ChapterSwitcher is in TopBar. How to trigger dropdown programmatically?

**Solutions:**

1. **Use state to trigger dropdown** (recommended):
   - Add `chapterPickerOpen` state to WorkspaceContext
   - ChapterSwitcher reads state and opens dropdown
   - Keyboard shortcut sets state to true

2. **Use ref + imperative API** (alternative):
   - Pass ref to ChapterSwitcher
   - Call open() method from shortcut

**Implementation (Option 1):**

### `src/contexts/WorkspaceContext.tsx`

Add chapter picker state:

```tsx
interface WorkspaceContextType {
  // ... existing fields
  chapterPickerOpen: boolean;
  setChapterPickerOpen: (open: boolean) => void;
}

// In provider:
const [chapterPickerOpen, setChapterPickerOpen] = useState(false);

// In return value:
value={{
  // ... existing fields
  chapterPickerOpen,
  setChapterPickerOpen,
}}
```

### `src/components/workspace/ChapterSwitcher.tsx`

Read state from context:

```tsx
import { useWorkspace } from '@/contexts/WorkspaceContext';

export const ChapterSwitcher = ({ ... }: ChapterSwitcherProps) => {
  const { chapterPickerOpen, setChapterPickerOpen } = useWorkspace();

  // ... rest of component

  return (
    <DropdownMenu open={chapterPickerOpen} onOpenChange={setChapterPickerOpen}>
      {/* ... existing content */}
    </DropdownMenu>
  );
};
```

### Update `useKeyboardShortcuts.ts`:

```tsx
const { chapterPickerOpen, setChapterPickerOpen } = useWorkspace();

// In handleKeyDown:
case 'j':
  e.preventDefault();
  setChapterPickerOpen(true);
  break;
```

---

## Implementation Steps

1. **Create useKeyboardShortcuts hook:**
   - Listen for Cmd/Ctrl + 1-6 (tool switching)
   - Listen for Cmd/Ctrl + J (chapter picker)
   - Listen for Cmd/Ctrl + Shift + K (right panel toggle)
   - Ignore shortcuts when typing in inputs/textareas

2. **Add chapterPickerOpen to WorkspaceContext**
   - State + setter
   - Add to context type

3. **Update ChapterSwitcher:**
   - Read chapterPickerOpen from context
   - Pass to DropdownMenu open prop

4. **Add hook to Workspace page:**
   - Call useKeyboardShortcuts()

5. **Test all shortcuts:**
   - Tool switching (1-6)
   - Chapter picker (J)
   - Right panel toggle (Shift+K)
   - Command palette (K) - already implemented

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- All keyboard shortcuts work
- Shortcuts ignored when typing

---

## Testing Checklist

- [ ] Open workspace
- [ ] Press Cmd+1 (or Ctrl+1 on Windows)
- [ ] Verify switches to Editor tool
- [ ] Press Cmd+2, verify Chapters tool
- [ ] Press Cmd+3, verify Lorebook tool
- [ ] Press Cmd+4, verify Brainstorm tool
- [ ] Press Cmd+5, verify Prompts tool
- [ ] Press Cmd+6, verify Notes tool
- [ ] Press Cmd+J, verify chapter picker opens
- [ ] Press Cmd+Shift+K (desktop), verify right panel toggles
- [ ] Type in editor (or any input), verify shortcuts ignored
- [ ] Press Cmd+K, verify command palette opens (from #10)
- [ ] No console errors

---

## Future Enhancements (Not in This Plan)

- Keyboard shortcut help modal (Cmd+?)
- Customizable shortcuts (user preferences)
- Show shortcuts in tooltips/menus
- Vim mode for editor
- More granular editor shortcuts

---

## Notes for Agent

- Mac uses Cmd (metaKey), Windows/Linux use Ctrl (ctrlKey)
- Shortcuts should be ignored when user is typing (check e.target)
- ChapterSwitcher uses DropdownMenu from Shadcn which supports open/onOpenChange props
- Right panel toggle only on desktop (mobile doesn't have right panel)
- Cmd+K already implemented in #10 (command palette), don't duplicate
- Alt+S for scene beat may already exist in Lexical editor - verify before implementing
