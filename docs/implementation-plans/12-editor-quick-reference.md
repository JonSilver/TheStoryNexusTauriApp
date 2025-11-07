# Implementation Plan #12: Editor Quick Reference

**Model:** Haiku
**Dependencies:** #03 (Editor tool), #05 (Lorebook tool), #09 (Right Panel must exist)
**Estimated Complexity:** Low

---

## Objective

Populate Matched Tags view in Right Panel with actual lorebook entries matched to chapter content. Lorebook entry preview (read-only). "View Full Entry" button switches to Lorebook tool with entry selected.

---

## Key Behaviour

- Right Panel "Tags" tab shows lorebook entries matched in current chapter
- Entry cards: title, tags, content snippet
- Click "View Full Entry" → switches to Lorebook tool with that entry selected
- Mobile: Not applicable (right panel desktop-only)

---

## Files to Modify

### `src/features/editor/components/MatchedTagsPanel.tsx`

Replace placeholder with actual implementation:

```tsx
import { useChapterQuery } from '@/features/chapters/hooks/useChapterQuery';
import { useLorebookQuery } from '@/features/lorebook/hooks/useLorebookQuery';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Book } from 'lucide-react';

export const MatchedTagsPanel = ({
  storyId,
  chapterId,
}: {
  storyId: string;
  chapterId: string;
}) => {
  const { setCurrentTool } = useWorkspace();
  const { data: chapter } = useChapterQuery(chapterId);
  const { data: lorebookEntries } = useLorebookQuery(storyId);

  // Simple matching: check if entry tags appear in chapter content
  const matchedEntries = lorebookEntries?.filter((entry) => {
    if (!chapter?.content || !entry.tags || entry.tags.length === 0) return false;
    if (entry.disabled) return false;

    // Parse Lexical JSON to extract text content
    let chapterText = '';
    try {
      const editorState = JSON.parse(chapter.content);
      // Basic text extraction from Lexical state
      // TODO: Improve this to handle all Lexical node types
      const extractText = (node: any): string => {
        if (!node) return '';
        if (node.text) return node.text;
        if (node.children) {
          return node.children.map(extractText).join(' ');
        }
        return '';
      };
      chapterText = extractText(editorState.root).toLowerCase();
    } catch (e) {
      // Fallback: treat content as plain text
      chapterText = chapter.content.toLowerCase();
    }

    // Check if any tag appears in chapter text
    return entry.tags.some((tag) => chapterText.includes(tag.toLowerCase()));
  });

  if (!matchedEntries || matchedEntries.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-2">Matched Tags</h3>
        <p className="text-sm text-muted-foreground">
          No lorebook entries matched in this chapter
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">Matched Tags</h3>

      <div className="space-y-3">
        {matchedEntries.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-sm">{entry.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {entry.tags?.join(', ')}
                </p>
              </div>
              <Book className="h-4 w-4 text-muted-foreground" />
            </div>

            <p className="text-xs line-clamp-3">{entry.content}</p>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setCurrentTool('lorebook');
                // TODO: Set selected entry in Lorebook tool
                // This requires shared state or URL param
              }}
            >
              View Full Entry
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Files to Verify

### Lorebook Tool Entry Selection

**Challenge:** When user clicks "View Full Entry", Lorebook tool needs to know which entry to select.

**Solutions:**

1. **Shared state in WorkspaceContext** (recommended):
   - Add `selectedLorebookEntryId` to WorkspaceContext
   - MatchedTagsPanel sets it before switching tool
   - LorebookTool reads it and selects entry

2. **URL parameter** (alternative):
   - Add `?entryId=xxx` to URL
   - LorebookTool reads from URL param

**Implementation (Option 1):**

### `src/contexts/WorkspaceContext.tsx`

Add lorebook entry selection state:

```tsx
interface WorkspaceContextType {
  // ... existing fields
  selectedLorebookEntryId: string | null;
  setSelectedLorebookEntryId: (id: string | null) => void;
}

// In provider:
const [selectedLorebookEntryId, setSelectedLorebookEntryId] = useState<string | null>(null);

// In return value:
value={{
  // ... existing fields
  selectedLorebookEntryId,
  setSelectedLorebookEntryId,
}}
```

### `src/components/workspace/tools/LorebookTool.tsx`

Read selected entry from context:

```tsx
const { selectedLorebookEntryId, setSelectedLorebookEntryId } = useWorkspace();

// On mount, if selectedLorebookEntryId is set, select that entry
useEffect(() => {
  if (selectedLorebookEntryId && entries) {
    const entry = entries.find((e) => e.id === selectedLorebookEntryId);
    if (entry) {
      setSelectedEntry(entry);
      // Clear the selected ID so it doesn't persist on next tool switch
      setSelectedLorebookEntryId(null);
    }
  }
}, [selectedLorebookEntryId, entries, setSelectedLorebookEntryId]);
```

### Update MatchedTagsPanel "View Full Entry" button:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="w-full"
  onClick={() => {
    setSelectedLorebookEntryId(entry.id);
    setCurrentTool('lorebook');
  }}
>
  View Full Entry
</Button>
```

---

## Implementation Steps

1. **Add selectedLorebookEntryId to WorkspaceContext**
   - State + setter
   - Add to context type

2. **Update MatchedTagsPanel:**
   - Fetch chapter and lorebook entries
   - Implement tag matching logic (check if tags appear in chapter text)
   - Render matched entry cards
   - "View Full Entry" button sets selected entry ID + switches tool

3. **Update LorebookTool:**
   - Read selectedLorebookEntryId from context
   - On mount, if set, select that entry
   - Clear selected ID after use

4. **Test workflow:**
   - Open chapter in editor
   - Open right panel → Tags tab
   - Verify matched entries appear
   - Click "View Full Entry"
   - Verify switches to Lorebook with entry selected

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Matched tags show in right panel
- "View Full Entry" switches to Lorebook with entry selected

---

## Testing Checklist

- [ ] Open workspace, switch to Editor tool
- [ ] Ensure chapter content contains lorebook tags (e.g., character names)
- [ ] Open right panel → "Tags" tab
- [ ] Verify matched entries appear
- [ ] Verify entry cards show title, tags, content snippet
- [ ] Click "View Full Entry" on an entry
- [ ] Verify switches to Lorebook tool
- [ ] Verify that entry is selected in Lorebook
- [ ] Switch back to Editor
- [ ] Right panel still shows matched tags
- [ ] No console errors

---

## Known Limitations

- **Basic text extraction:** Lexical JSON parsing is simplified. May not handle all node types.
- **Case-sensitive matching:** Tags matched case-insensitively (should be sufficient).
- **No fuzzy matching:** Exact tag text must appear in chapter (no partial matches).

**Future improvements:**
- Better Lexical text extraction
- Fuzzy/partial tag matching
- Match highlighting in editor
- Entry relevance scoring

---

## Notes for Agent

- Tag matching logic is intentionally simple (exact substring match)
- Lexical JSON parsing can be improved later if needed
- selectedLorebookEntryId is cleared after use (doesn't persist across tool switches)
- If Lorebook tool doesn't support auto-selection, note it for later enhancement
- Focus on basic functionality, not perfect matching algorithm
