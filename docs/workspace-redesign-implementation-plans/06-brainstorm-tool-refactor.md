# Implementation Plan #06: Brainstorm Tool Refactor

**Model:** Haiku
**Dependencies:** #01 (workspace infrastructure must exist)
**Estimated Complexity:** Low

---

## Objective

Refactor Brainstorm page as workspace tool. Full-height chat interface in main content area. Remove old brainstorm navigation chrome.

---

## Key Behaviour

- Full-screen chat (needs space for conversation)
- Reuse existing Brainstorm chat components
- Remove any navigation/layout chrome from existing page
- Render in workspace main content area

---

## Files to Create

### `src/components/workspace/tools/BrainstormTool.tsx`

Wrapper for existing brainstorm chat:

```tsx
import { BrainstormChat } from '@/features/brainstorm/components/BrainstormChat';

interface BrainstormToolProps {
  storyId: string;
}

export const BrainstormTool = ({ storyId }: BrainstormToolProps) => {
  return (
    <div className="h-full flex flex-col">
      <BrainstormChat storyId={storyId} />
    </div>
  );
};
```

---

## Files to Verify/Modify

### `src/features/brainstorm/components/BrainstormChat.tsx`

**Check:** Does this component already exist?

**If yes:**
- Verify it's self-contained (no layout/navigation chrome)
- Verify it accepts `storyId` prop
- Verify it handles full-height layout (flex-1, overflow)

**If it includes layout chrome (headers, back buttons, etc.):**
- Extract pure chat interface to `BrainstormChatInterface.tsx`
- Remove navigation/layout chrome
- Keep only message list + input + AI controls

**Expected structure:**
```tsx
interface BrainstormChatProps {
  storyId: string;
}

export const BrainstormChat = ({ storyId }: BrainstormChatProps) => {
  // Fetch chat messages via useBrainstormQuery
  // Render message list (scrollable)
  // Render input field at bottom
  // System prompt selector at top
  // No layout chrome, no navigation
};
```

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add BrainstormTool rendering:

**Add import:**
```tsx
import { BrainstormTool } from '@/components/workspace/tools/BrainstormTool';
```

**Update main content area:**
```tsx
{currentTool === 'brainstorm' && (
  <BrainstormTool storyId={storyId!} />
)}
```

---

## Implementation Steps

1. **Verify existing BrainstormChat component**
   - Check if it's self-contained
   - Check if it has layout chrome to remove

2. **Create BrainstormTool wrapper**
   - Simple wrapper around BrainstormChat
   - Full-height container

3. **Update Workspace.tsx**
   - Import BrainstormTool
   - Render when currentTool === 'brainstorm'

4. **Test in browser:**
   - Click "Brainstorm" in sidebar
   - Verify chat interface renders
   - Verify message list scrollable
   - Verify input field works
   - Send message, verify AI response

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Brainstorm chat renders full-height
- Chat functionality works (send/receive messages)

---

## Testing Checklist

- [ ] Open workspace
- [ ] Click "Brainstorm" in sidebar
- [ ] Verify chat interface renders
- [ ] Verify message history loads (if any exist)
- [ ] Type message, send
- [ ] Verify AI response appears
- [ ] Verify scrolling works for long conversations
- [ ] No console errors

---

## Notes for Agent

- Do NOT rewrite existing brainstorm chat logic
- Do NOT modify AI service integration
- Focus only on removing navigation chrome and rendering in workspace
- If existing chat has complex features (system prompt selector, message actions), preserve them
- Brainstorm-to-Lorebook workflow is implemented in plan #11, ignore for now
