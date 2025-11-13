# Plan #01: Workspace Infrastructure

**Dependencies:** None (foundational)

## Objective

Create workspace shell with tool-switching capability. No actual tool implementations yet, just the architectural foundation.

## Architectural Changes

### Routing Transformation
**Current:** Nested routes under `/dashboard/:storyId/*` for each feature
**Target:** Single route `/story/:storyId` with tool switching via React state

**Changes needed:**
- New `/story/:storyId` route replaces dashboard route
- No child routes - tools switched via state, not routing
- URL stays constant while switching tools (workspace feel)

### Component Architecture

**Workspace Layout Structure:**
```
WorkspaceProvider (context for tool/chapter state)
  └─ Workspace (route component)
      ├─ Sidebar/Toolbar (tool navigation)
      ├─ TopBar (story title, chapter switcher placeholder, back button)
      └─ MainContent (renders current tool)
```

**State Management:**
- WorkspaceContext holds `currentTool` and `currentChapterId`
- Simple useState, no persistence (session-only)
- Tool switching updates context, triggers MainContent re-render
- No URL changes, no routing navigation

### Tool Navigation Pattern

**Desktop:** Vertical sidebar (left side)
- Tool list with icons + labels
- Active tool highlighted
- Collapsible (toggle button)
- Fixed position, always visible

**Mobile:** Bottom toolbar
- Horizontal tool buttons
- Icon + label (compact)
- Fixed position above keyboard safe area
- 4-5 primary tools + overflow menu

**Implementation decision:** Use responsive breakpoint to switch between layouts (not separate mobile/desktop routes)

## Key Technical Decisions

### Sidebar Library Choice
**Options:**
1. Shadcn sidebar (recommended) - includes responsive, collapse, state persistence
2. Custom sidebar - more control, more maintenance
3. React-resizable-panels - overkill for simple sidebar

**Recommendation:** Shadcn sidebar if it fits requirements, custom if specific behaviour needed

### Tool List Definition
```typescript
type Tool = 'editor' | 'chapters' | 'lorebook' | 'brainstorm' | 'prompts' | 'notes'
```

Tools array with metadata:
- id (Tool type)
- label (display name)
- icon (Lucide icon component)
- description (for tooltips)

### Context Structure

Minimal WorkspaceContext:
```typescript
{
  currentTool: Tool
  setCurrentTool: (tool: Tool) => void
  currentChapterId: string | null
  setCurrentChapterId: (id: string | null) => void
}
```

Start simple, add complexity later if needed (e.g., tool history, unsaved changes tracking)

## Integration Points

### Story Query
- Fetch story data using existing `useStoryQuery(storyId)`
- Display story title in top bar
- Handle loading/error states

### Chapter Query
- Fetch chapters using existing `useChaptersQuery(storyId)`
- Initialize `currentChapterId` to first chapter if none selected
- Don't render chapter switcher yet (placeholder only)

### Existing Routes
- Keep old `/dashboard/:storyId/*` routes temporarily (remove in #02)
- Add new `/story/:storyId` route alongside
- Test new route doesn't break existing functionality

## Implementation Steps

1. Create WorkspaceContext (context file)
2. Create Workspace component (route component with layout)
3. Create Sidebar/Toolbar component (tool navigation)
4. Create TopBar component (story title, back button, chapter switcher placeholder)
5. Add route to App.tsx
6. Implement responsive swap (sidebar ↔ toolbar)
7. Test tool switching (placeholder main content shows current tool name)

## Testing Criteria

### Functional
- [ ] Navigate to `/story/:storyId` loads workspace
- [ ] Story title displays in top bar
- [ ] Tool sidebar shows all 6 tools
- [ ] Clicking tool updates active state
- [ ] Main content shows current tool name (placeholder)
- [ ] Back button returns to story list
- [ ] Mobile breakpoint shows bottom toolbar instead of sidebar
- [ ] Sidebar collapse button works (desktop)

### Technical
- [ ] Zero lint errors
- [ ] Zero build errors
- [ ] No console errors in browser
- [ ] Existing `/dashboard` routes still work
- [ ] Story query succeeds
- [ ] Chapter query succeeds

## Known Limitations

**Resolved in later plans:**
- No actual tool content (just placeholders) → #03-#08
- Chapter switcher not functional → #03
- Old dashboard routes still exist → #02
- No keyboard shortcuts → #13
- No command palette → #10

## Notes for Implementer

**Do:**
- Keep it minimal - just the shell
- Test with existing story data
- Verify responsive behaviour
- Check existing routes unaffected

**Don't:**
- Implement actual tools yet
- Add complex state management
- Build custom components if library version works
- Remove old dashboard routes (wait for #02)
- Break existing functionality

## Dependencies to Install

**If using Shadcn sidebar:**
```bash
npx shadcn@latest add sidebar
```

**If custom sidebar, may need:**
```bash
npm install @radix-ui/react-collapsible  # For collapse behaviour
```

**For command palette (install now, use later):**
```bash
npm install cmdk
```

## Success Criteria

**After this plan:**
- Workspace route exists and loads
- Tool switching works (updates state and placeholder content)
- Layout responsive (sidebar ↔ toolbar)
- No broken existing functionality
- Foundation ready for tool implementation (#03-#08)
