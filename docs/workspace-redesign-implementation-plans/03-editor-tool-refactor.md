# Implementation Plan #03: Editor Tool Refactor

**Model:** Sonnet
**Dependencies:** #01 (workspace infrastructure must exist)
**Estimated Complexity:** High

---

## Objective

Refactor Editor page as workspace tool. Implement chapter switching dropdown in TopBar. Preserve editor state (scroll position, cursor) per chapter. Remove old editor navigation chrome.

---

## Key Challenges

1. **State preservation:** Editor scroll position and cursor must be saved per chapter
2. **Chapter switching:** Dropdown in TopBar must update editor content without navigation
3. **Lexical state management:** Chapter content stored as Lexical JSON, must load/save correctly
4. **No breaking existing editor:** SaveChapterContent/LoadChapterContent plugins must continue working

---

## Files to Create

### 1. `src/components/workspace/ChapterSwitcher.tsx`

Chapter dropdown for TopBar:

```tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChaptersQuery } from '@/features/chapters/hooks/useChaptersQuery';

interface ChapterSwitcherProps {
  storyId: string;
  currentChapterId: string | null;
  onChapterChange: (chapterId: string) => void;
}

export const ChapterSwitcher = ({
  storyId,
  currentChapterId,
  onChapterChange,
}: ChapterSwitcherProps) => {
  const { data: chapters, isLoading } = useChaptersQuery(storyId);

  if (isLoading || !chapters || chapters.length === 0) {
    return <div className="text-sm text-muted-foreground">No chapters</div>;
  }

  const currentChapter = chapters.find((c) => c.id === currentChapterId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {currentChapter?.title || 'Select chapter'}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        {chapters.map((chapter) => (
          <DropdownMenuItem
            key={chapter.id}
            onClick={() => onChapterChange(chapter.id)}
            className={currentChapterId === chapter.id ? 'bg-accent' : ''}
          >
            {chapter.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 2. `src/hooks/useEditorState.ts`

State preservation hook:

```tsx
import { useRef, useCallback } from 'react';

interface EditorState {
  scrollTop: number;
  // Cursor position tracking could be added here if needed
}

export const useEditorState = () => {
  const stateRef = useRef<Map<string, EditorState>>(new Map());

  const saveState = useCallback((chapterId: string, state: EditorState) => {
    stateRef.current.set(chapterId, state);
  }, []);

  const getState = useCallback((chapterId: string): EditorState | undefined => {
    return stateRef.current.get(chapterId);
  }, []);

  return { saveState, getState };
};
```

---

## Files to Modify

### `src/contexts/WorkspaceContext.tsx`

Add chapter state to workspace context:

**Add to interface:**
```tsx
interface WorkspaceContextType {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  currentChapterId: string | null;
  setCurrentChapterId: (chapterId: string | null) => void;
}
```

**Add to provider:**
```tsx
const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
```

**Update return value:**
```tsx
return (
  <WorkspaceContext.Provider
    value={{ currentTool, setCurrentTool, currentChapterId, setCurrentChapterId }}
  >
    {children}
  </WorkspaceContext.Provider>
);
```

---

### `src/components/workspace/WorkspaceTopBar.tsx`

Add ChapterSwitcher to top bar:

**Add import:**
```tsx
import { ChapterSwitcher } from './ChapterSwitcher';
import { useWorkspace } from '@/contexts/WorkspaceContext';
```

**Add props:**
```tsx
interface WorkspaceTopBarProps {
  storyTitle: string;
  storyId: string;
}
```

**Add inside component:**
```tsx
const { currentChapterId, setCurrentChapterId } = useWorkspace();
```

**Replace chapter dropdown placeholder with:**
```tsx
<div className="flex-1 flex items-center justify-center">
  <ChapterSwitcher
    storyId={storyId}
    currentChapterId={currentChapterId}
    onChapterChange={setCurrentChapterId}
  />
</div>
```

---

### `src/pages/Workspace.tsx`

Add editor tool rendering and chapter initialization:

**Add imports:**
```tsx
import { useEffect } from 'react';
import { EditorTool } from '@/components/workspace/tools/EditorTool';
import { useChaptersQuery } from '@/features/chapters/hooks/useChaptersQuery';
```

**Inside WorkspaceContent, after story query:**
```tsx
const { currentTool, currentChapterId, setCurrentChapterId } = useWorkspace();
const { data: chapters } = useChaptersQuery(storyId!);

// Initialize to first chapter if none selected
useEffect(() => {
  if (!currentChapterId && chapters && chapters.length > 0) {
    setCurrentChapterId(chapters[0].id);
  }
}, [currentChapterId, chapters, setCurrentChapterId]);
```

**Update WorkspaceTopBar call:**
```tsx
<WorkspaceTopBar storyTitle={story.title} storyId={storyId!} />
```

**Replace placeholder main content with:**
```tsx
<main className="flex-1 overflow-auto">
  {currentTool === 'editor' && currentChapterId && (
    <EditorTool storyId={storyId!} chapterId={currentChapterId} />
  )}
  {currentTool !== 'editor' && (
    <div className="p-4 text-muted-foreground">
      Current tool: {currentTool}
    </div>
  )}
</main>
```

---

### `src/components/workspace/tools/EditorTool.tsx` (NEW FILE)

Wrapper for Lexical editor with state preservation:

```tsx
import { useRef, useEffect } from 'react';
import { Editor } from '@/Lexical/lexical-playground/src/Editor';
import { useEditorState } from '@/hooks/useEditorState';

interface EditorToolProps {
  storyId: string;
  chapterId: string;
}

export const EditorTool = ({ storyId, chapterId }: EditorToolProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveState, getState } = useEditorState();

  // Save scroll position when chapter changes
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        saveState(chapterId, {
          scrollTop: containerRef.current.scrollTop,
        });
      }
    };
  }, [chapterId, saveState]);

  // Restore scroll position when chapter loads
  useEffect(() => {
    const state = getState(chapterId);
    if (state && containerRef.current) {
      containerRef.current.scrollTop = state.scrollTop;
    }
  }, [chapterId, getState]);

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <Editor chapterId={chapterId} storyId={storyId} />
    </div>
  );
};
```

---

### `src/Lexical/lexical-playground/src/Editor.tsx`

**Check if it already accepts `chapterId` and `storyId` props.** If not, add them:

**Add to props:**
```tsx
interface EditorProps {
  chapterId: string;
  storyId: string;
}

export const Editor = ({ chapterId, storyId }: EditorProps) => {
  // Existing editor implementation
  // LoadChapterContent plugin should already use chapterId
  // SaveChapterContent plugin should already use chapterId
}
```

**Verify LoadChapterContent and SaveChapterContent plugins use the chapterId prop correctly.** No changes needed if already working.

---

## Implementation Steps

1. **Add chapter state to WorkspaceContext**
   - `currentChapterId` state
   - `setCurrentChapterId` setter

2. **Create ChapterSwitcher component**
   - Dropdown using Shadcn DropdownMenu
   - Fetches chapters via useChaptersQuery
   - onClick calls onChapterChange callback

3. **Create useEditorState hook**
   - Map of chapter IDs to editor states (scroll position)
   - saveState and getState functions

4. **Update WorkspaceTopBar**
   - Add storyId prop
   - Render ChapterSwitcher
   - Wire up to workspace context

5. **Create EditorTool wrapper**
   - Renders existing Lexical Editor
   - Saves/restores scroll position using useEditorState
   - Re-renders when chapterId changes

6. **Update Workspace page**
   - Initialize currentChapterId to first chapter
   - Render EditorTool when tool is 'editor'
   - Pass storyId to TopBar

7. **Verify Editor.tsx accepts chapterId prop**
   - Check LoadChapterContent plugin uses it
   - Check SaveChapterContent plugin uses it

8. **Test in browser:**
   - Open workspace
   - Verify first chapter loads in editor
   - Switch chapters via dropdown
   - Verify editor content updates
   - Scroll in editor, switch chapters, switch back → verify scroll restored

---

## Verification Steps

```bash
# Lint check
npm run lint

# Build check
npm run build

# Dev server (manual testing)
npm run dev
```

**Expected outcomes:**
- Zero lint errors
- Zero build errors
- Editor loads first chapter by default
- Chapter dropdown shows all chapters
- Switching chapters updates editor content
- Scroll position preserved per chapter

---

## Testing Checklist

- [ ] Open workspace (`/story/:storyId`)
- [ ] Verify editor loads with first chapter content
- [ ] Top bar shows chapter dropdown with current chapter name
- [ ] Click chapter dropdown, verify all chapters listed
- [ ] Select different chapter, verify editor content updates
- [ ] Scroll down in editor
- [ ] Switch to different chapter
- [ ] Switch back to first chapter
- [ ] Verify scroll position restored to where you left it
- [ ] Verify auto-save still works (SaveChapterContent plugin)
- [ ] Make edit, wait for debounce, check database updated
- [ ] No console errors

---

## Edge Cases

1. **No chapters exist:** Show "No chapters" in dropdown, editor shows empty state
2. **Chapter deleted while open:** Handle gracefully (switch to first available chapter or show empty state)
3. **Rapid chapter switching:** Debounce if necessary, ensure SaveChapterContent completes before switching

---

## Notes for Agent

- Do NOT modify Lexical editor internals unless necessary
- Do NOT break existing SaveChapterContent/LoadChapterContent plugins
- Scroll position restoration is a nice-to-have; if complex, note it for later enhancement
- Chapter switching should feel instant (< 100ms)
- If Editor.tsx already handles chapter switching correctly, you may only need the wrapper for scroll state
