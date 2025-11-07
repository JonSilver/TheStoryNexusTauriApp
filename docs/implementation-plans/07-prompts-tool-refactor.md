# Implementation Plan #07: Prompts Tool Refactor

**Model:** Haiku
**Dependencies:** #01 (workspace infrastructure must exist)
**Estimated Complexity:** Low

---

## Objective

Refactor Prompts page as workspace tool. Split view using `react-resizable-panels`: prompt list + editor. Remove old prompts navigation chrome.

---

## Key Features

- Desktop: Two-column split (prompt list, prompt editor)
- Mobile: Two-stage (list → editor)
- Split view resizable (react-resizable-panels)
- Reuse existing prompt components if available

---

## Files to Create

### `src/components/workspace/tools/PromptsTool.tsx`

```tsx
import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { usePromptsQuery } from '@/features/prompts/hooks/usePromptsQuery';
import { PromptList } from '@/features/prompts/components/PromptList';
import { PromptEditor } from '@/features/prompts/components/PromptEditor';
import type { Prompt } from '@/types/prompts';

interface PromptsToolProps {
  storyId: string;
}

export const PromptsTool = ({ storyId }: PromptsToolProps) => {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const { data: prompts, isLoading } = usePromptsQuery(storyId);

  // Mobile: two-stage view
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    if (selectedPrompt) {
      return (
        <div className="h-full">
          <PromptEditor
            prompt={selectedPrompt}
            onBack={() => setSelectedPrompt(null)}
            storyId={storyId}
          />
        </div>
      );
    }

    return (
      <div className="h-full">
        <PromptList
          prompts={prompts || []}
          selectedPrompt={selectedPrompt}
          onSelectPrompt={setSelectedPrompt}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Desktop: split view
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={40} minSize={30} maxSize={60}>
        <PromptList
          prompts={prompts || []}
          selectedPrompt={selectedPrompt}
          onSelectPrompt={setSelectedPrompt}
          isLoading={isLoading}
        />
      </Panel>

      <PanelResizeHandle className="w-px bg-border" />

      <Panel defaultSize={60} minSize={40}>
        {selectedPrompt ? (
          <PromptEditor
            prompt={selectedPrompt}
            onBack={null} // No back button on desktop
            storyId={storyId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a prompt to edit
          </div>
        )}
      </Panel>
    </PanelGroup>
  );
};
```

---

## Files to Extract/Create

### `src/features/prompts/components/PromptList.tsx`

Prompt list (if doesn't already exist):

```tsx
import { Button } from '@/components/ui/button';
import type { Prompt } from '@/types/prompts';

interface PromptListProps {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  onSelectPrompt: (prompt: Prompt) => void;
  isLoading: boolean;
}

export const PromptList = ({
  prompts,
  selectedPrompt,
  onSelectPrompt,
  isLoading,
}: PromptListProps) => {
  if (isLoading) return <div className="p-4">Loading...</div>;

  if (prompts.length === 0) {
    return <div className="p-4 text-muted-foreground">No prompts</div>;
  }

  return (
    <div className="h-full border-r overflow-y-auto">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Prompts</h3>
          {/* TODO: Import/Export buttons */}
        </div>
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onSelectPrompt(prompt)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedPrompt?.id === prompt.id ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <div className="font-medium">{prompt.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {prompt.isSystemPrompt ? 'System Prompt' : 'User Prompt'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### `src/features/prompts/components/PromptEditor.tsx`

Prompt editor form (reuse if exists):

```tsx
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Prompt } from '@/types/prompts';

interface PromptEditorProps {
  prompt: Prompt;
  onBack: (() => void) | null;
  storyId: string;
}

export const PromptEditor = ({ prompt, onBack, storyId }: PromptEditorProps) => {
  // TODO: Implement actual prompt editor form
  // Reuse existing prompt editor if available

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
        <h2 className="text-2xl font-bold mb-4">{prompt.name}</h2>
        {/* TODO: Render actual prompt editor form */}
        <p className="text-muted-foreground">Prompt editor form goes here</p>
        {prompt.isSystemPrompt && (
          <p className="text-xs text-muted-foreground mt-2">
            (System prompts are read-only)
          </p>
        )}
      </div>
    </div>
  );
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add PromptsTool rendering:

**Add import:**
```tsx
import { PromptsTool } from '@/components/workspace/tools/PromptsTool';
```

**Update main content area:**
```tsx
{currentTool === 'prompts' && (
  <PromptsTool storyId={storyId!} />
)}
```

---

## Implementation Steps

1. **Extract/create PromptList component**
2. **Extract/create PromptEditor component**
3. **Create PromptsTool** (orchestrates with PanelGroup)
4. **Update Workspace.tsx** to render PromptsTool
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

- [ ] Open workspace, click "Prompts" in sidebar
- [ ] Desktop (>768px):
  - [ ] Two columns visible (list, editor)
  - [ ] Drag resize handle, verify panels resize
  - [ ] Click prompt, verify editor shows prompt
  - [ ] System prompts marked as read-only
- [ ] Mobile (<768px):
  - [ ] Stage 1: Prompt list
  - [ ] Click prompt → Stage 2: Prompt editor
  - [ ] Back button returns to list
- [ ] No console errors

---

## Notes for Agent

- Reuse existing prompt components if available
- Do NOT implement full CRUD yet - just viewing/selection
- Editor can be placeholder if existing editor is complex
- System prompts should be marked read-only
- Import/Export functionality preserved in later enhancement if needed
