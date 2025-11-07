# Implementation Plan #09: Right Panel System

**Model:** Haiku
**Dependencies:** #03 (Editor must be a tool first)
**Estimated Complexity:** Medium

---

## Objective

Create Right Panel using `react-resizable-panels` (desktop only). Contextual tools when Editor active: Matched Tags, Outline, POV, Notes. Toggle mechanism from Editor toolbar. State persistence via react-resizable-panels API.

---

## Key Features

- Desktop only (hidden on mobile)
- Visible only when Editor tool is active
- Resizable (react-resizable-panels)
- Multiple tabs: Matched Tags, Outline, POV, Chapter Notes
- Toggle from Editor toolbar
- Collapsed by default (personal preference - can be changed)

---

## Files to Create

### `src/components/workspace/RightPanel.tsx`

```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatchedTagsPanel } from '@/features/editor/components/MatchedTagsPanel';
import { OutlinePanel } from '@/features/editor/components/OutlinePanel';
import { POVPanel } from '@/features/editor/components/POVPanel';
import { ChapterNotesPanel } from '@/features/editor/components/ChapterNotesPanel';

interface RightPanelProps {
  storyId: string;
  chapterId: string;
}

export const RightPanel = ({ storyId, chapterId }: RightPanelProps) => {
  const [activeTab, setActiveTab] = useState('matched-tags');

  return (
    <div className="h-full border-l bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="matched-tags">Tags</TabsTrigger>
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="pov">POV</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="matched-tags" className="m-0">
            <MatchedTagsPanel storyId={storyId} chapterId={chapterId} />
          </TabsContent>

          <TabsContent value="outline" className="m-0">
            <OutlinePanel chapterId={chapterId} />
          </TabsContent>

          <TabsContent value="pov" className="m-0">
            <POVPanel chapterId={chapterId} />
          </TabsContent>

          <TabsContent value="notes" className="m-0">
            <ChapterNotesPanel chapterId={chapterId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
```

### Panel Components (Placeholders)

Create these as simple placeholders - detailed implementation can be done later:

**`src/features/editor/components/MatchedTagsPanel.tsx`:**
```tsx
export const MatchedTagsPanel = ({ storyId, chapterId }: { storyId: string; chapterId: string }) => {
  // TODO: Fetch matched lorebook entries for current chapter
  // TODO: Display entry cards, click to view full entry (switches to Lorebook tool)
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        Matched lorebook entries will appear here
      </p>
    </div>
  );
};
```

**`src/features/editor/components/OutlinePanel.tsx`:**
```tsx
import { useChapterQuery } from '@/features/chapters/hooks/useChapterQuery';

export const OutlinePanel = ({ chapterId }: { chapterId: string }) => {
  const { data: chapter } = useChapterQuery(chapterId);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Outline</h3>
      <p className="text-sm whitespace-pre-wrap">{chapter?.outline || 'No outline set'}</p>
    </div>
  );
};
```

**`src/features/editor/components/POVPanel.tsx`:**
```tsx
import { useChapterQuery } from '@/features/chapters/hooks/useChapterQuery';

export const POVPanel = ({ chapterId }: { chapterId: string }) => {
  const { data: chapter } = useChapterQuery(chapterId);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Point of View</h3>
      <p className="text-sm">Character: {chapter?.povCharacter || 'Not set'}</p>
      <p className="text-sm">Type: {chapter?.povType || 'Not set'}</p>
      {/* TODO: Add edit controls */}
    </div>
  );
};
```

**`src/features/editor/components/ChapterNotesPanel.tsx`:**
```tsx
import { useChapterQuery } from '@/features/chapters/hooks/useChapterQuery';

export const ChapterNotesPanel = ({ chapterId }: { chapterId: string }) => {
  const { data: chapter } = useChapterQuery(chapterId);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Chapter Notes</h3>
      <p className="text-sm whitespace-pre-wrap">{chapter?.notes || 'No notes'}</p>
      {/* TODO: Add edit controls */}
    </div>
  );
};
```

---

## Files to Modify

### `src/contexts/WorkspaceContext.tsx`

Add right panel state:

**Add to interface:**
```tsx
interface WorkspaceContextType {
  // ... existing fields
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
}
```

**Add to provider:**
```tsx
const [rightPanelOpen, setRightPanelOpen] = useState(false); // Collapsed by default
```

**Update return value:**
```tsx
value={{
  // ... existing fields
  rightPanelOpen,
  setRightPanelOpen,
}}
```

---

### `src/components/workspace/tools/EditorTool.tsx`

Wrap editor in PanelGroup with RightPanel:

**Add imports:**
```tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { RightPanel } from '@/components/workspace/RightPanel';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { PanelRight } from 'lucide-react';
```

**Replace entire component:**
```tsx
export const EditorTool = ({ storyId, chapterId }: EditorToolProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveState, getState } = useEditorState();
  const { rightPanelOpen, setRightPanelOpen } = useWorkspace();

  // ... existing save/restore state effects

  // Desktop only
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // Mobile: no right panel
    return (
      <div ref={containerRef} className="h-full overflow-auto">
        <Editor chapterId={chapterId} storyId={storyId} />
      </div>
    );
  }

  // Desktop: editor + optional right panel
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={rightPanelOpen ? 70 : 100} minSize={50}>
        <div className="h-full flex flex-col">
          {/* Toggle button for right panel */}
          <div className="border-b px-4 py-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
            >
              <PanelRight className="h-4 w-4 mr-2" />
              {rightPanelOpen ? 'Hide' : 'Show'} Panel
            </Button>
          </div>

          <div ref={containerRef} className="flex-1 overflow-auto">
            <Editor chapterId={chapterId} storyId={storyId} />
          </div>
        </div>
      </Panel>

      {rightPanelOpen && (
        <>
          <PanelResizeHandle className="w-px bg-border" />
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <RightPanel storyId={storyId} chapterId={chapterId} />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
};
```

---

## Implementation Steps

1. **Add right panel state to WorkspaceContext**
   - `rightPanelOpen` boolean
   - Default `false` (collapsed)

2. **Create RightPanel component** with tabs:
   - Matched Tags, Outline, POV, Notes
   - Tabs using Shadcn Tabs

3. **Create panel placeholder components:**
   - MatchedTagsPanel (placeholder)
   - OutlinePanel (shows chapter outline)
   - POVPanel (shows POV settings)
   - ChapterNotesPanel (shows chapter notes)

4. **Modify EditorTool:**
   - Wrap in PanelGroup
   - Add toggle button in toolbar
   - Conditionally render RightPanel
   - Mobile check: hide panel on mobile

5. **Test desktop:**
   - Toggle button shows/hides panel
   - Panel resizable
   - Tabs switch between panels
   - State preserved across chapter switches

6. **Test mobile:**
   - Panel hidden
   - Toggle button hidden or disabled

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Desktop: Right panel toggleable
- Mobile: Panel hidden
- Panel resizable on desktop

---

## Testing Checklist

- [ ] Open workspace, switch to Editor tool
- [ ] Desktop (>1024px):
  - [ ] "Show Panel" button visible in editor toolbar
  - [ ] Click button, right panel slides in
  - [ ] Panel shows tabs: Tags, Outline, POV, Notes
  - [ ] Switch tabs, verify content changes
  - [ ] Drag resize handle, verify panel width changes
  - [ ] Click "Hide Panel", panel closes
  - [ ] Switch chapters, toggle panel again (state preserved)
- [ ] Mobile (<768px):
  - [ ] Right panel not visible
  - [ ] Toggle button hidden or disabled
- [ ] No console errors

---

## Future Enhancements (Not in This Plan)

- Matched Tags panel: actual lorebook matching logic
- POV panel: edit controls to update POV settings
- Chapter Notes panel: edit controls for inline notes
- Right edge swipe gesture on mobile (opens drawer)

---

## Notes for Agent

- Panel components are placeholders - detailed implementation later
- Focus on layout and toggle mechanism
- Desktop only - mobile shows full-screen editor
- Default closed (users can open if needed)
- State persistence via WorkspaceContext (not localStorage for now)
