# Implementation Plan #04: Chapters Tool Refactor

**Model:** Haiku
**Dependencies:** #01 (workspace infrastructure), #03 (Editor tool must exist)
**Estimated Complexity:** Low

---

## Objective

Refactor Chapters page as workspace tool. Chapter list view in main content area. Clicking chapter switches to Editor tool with that chapter loaded.

---

## Key Behaviour

- This is NOT a separate page - it's a tool for managing chapters
- Clicking a chapter doesn't navigate; it switches the Editor tool's context + switches to Editor tool
- Quick return to editing without feeling like you went somewhere else

---

## Files to Create

### `src/components/workspace/tools/ChaptersTool.tsx`

```tsx
import { useChaptersQuery } from '@/features/chapters/hooks/useChaptersQuery';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface ChaptersToolProps {
  storyId: string;
}

export const ChaptersTool = ({ storyId }: ChaptersToolProps) => {
  const { data: chapters, isLoading } = useChaptersQuery(storyId);
  const { setCurrentTool, setCurrentChapterId } = useWorkspace();

  const handleChapterClick = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    setCurrentTool('editor');
  };

  if (isLoading) return <div className="p-4">Loading chapters...</div>;

  if (!chapters || chapters.length === 0) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">No chapters yet.</p>
        {/* TODO: Add "Create Chapter" button - implementation depends on existing chapter creation flow */}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Chapters</h2>
        {/* TODO: Add "New Chapter" button */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            onClick={() => handleChapterClick(chapter.id)}
            className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">{chapter.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {chapter.outline || 'No outline'}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{chapter.wordCount || 0} words</span>
              <span>
                {new Date(chapter.updatedAt || chapter.createdAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add ChaptersTool rendering:

**Add import:**
```tsx
import { ChaptersTool } from '@/components/workspace/tools/ChaptersTool';
```

**Update main content area:**
```tsx
<main className="flex-1 overflow-auto">
  {currentTool === 'editor' && currentChapterId && (
    <EditorTool storyId={storyId!} chapterId={currentChapterId} />
  )}
  {currentTool === 'chapters' && (
    <ChaptersTool storyId={storyId!} />
  )}
  {!['editor', 'chapters'].includes(currentTool) && (
    <div className="p-4 text-muted-foreground">
      Current tool: {currentTool}
    </div>
  )}
</main>
```

---

## Implementation Steps

1. **Create ChaptersTool component**
   - Grid of chapter cards
   - Show title, outline snippet, word count, last updated
   - Click card → setCurrentChapterId + setCurrentTool('editor')

2. **Update Workspace page**
   - Import ChaptersTool
   - Render when currentTool === 'chapters'

3. **Test in browser:**
   - Open workspace
   - Click "Chapters" in sidebar
   - Verify chapter list renders
   - Click chapter card
   - Verify switches to Editor tool with that chapter loaded

---

## Verification Steps

```bash
# Lint check
npm run lint

# Build check
npm run build

# Dev server
npm run dev
```

**Expected outcomes:**
- Zero lint errors
- Zero build errors
- Chapters tool renders list of chapters
- Clicking chapter switches to Editor with that chapter

---

## Testing Checklist

- [ ] Open workspace
- [ ] Click "Chapters" in sidebar
- [ ] Verify tool switches to chapters view
- [ ] Verify all chapters listed with title, outline, word count, date
- [ ] Click chapter card
- [ ] Verify switches to Editor tool (sidebar shows "Editor" active)
- [ ] Verify editor loads clicked chapter content
- [ ] No console errors

---

## Future Enhancements (Not in This Plan)

- Create new chapter button
- Drag-to-reorder chapters (use @dnd-kit)
- Delete chapter action
- Export chapter action
- Chapter card hover actions

**Note:** These can be added in a later enhancement plan if desired. This plan focuses on basic chapter list + navigation.

---

## Notes for Agent

- Do NOT implement chapter CRUD actions yet. Just list + click-to-edit.
- Do NOT add drag-and-drop reordering. That's a separate enhancement.
- Focus on simple, clean chapter cards with onClick navigation to editor.
- If no chapters exist, show empty state (already handled in component).
