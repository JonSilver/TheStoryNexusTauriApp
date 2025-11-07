# Implementation Plan #14: Visual Polish

**Model:** Haiku
**Dependencies:** #01-#08 (workspace + all tools must exist)
**Estimated Complexity:** Low

---

## Objective

Visual cohesion and polish. Tool-specific background colour shifts, smooth transitions, workspace entry/exit animations, active tool highlighting consistency.

---

## Visual Design Goals

1. **Workspace feel:** Persistent chrome, stable sidebars, content area transitions smoothly
2. **Tool differentiation:** Subtle background colours per tool (optional, can be neutral)
3. **Active state clarity:** Always obvious which tool is active
4. **Smooth transitions:** No jarring jumps, instant but smooth feel
5. **Professional aesthetic:** Clean, minimal, focused on content

---

## Design Decisions

### Tool Background Colours (Optional)

**Approach 1 - Neutral (recommended):**
- All tools: Same neutral background
- Rely on sidebar active state for differentiation
- Simpler, cleaner

**Approach 2 - Subtle Shifts:**
- Editor: Neutral (bg-background)
- Chapters: Warm tint (bg-orange-50/10 dark:bg-orange-950/10)
- Lorebook: Blue tint (bg-blue-50/10 dark:bg-blue-950/10)
- Brainstorm: Purple tint (bg-purple-50/10 dark:bg-purple-950/10)
- Prompts: Green tint (bg-green-50/10 dark:bg-green-950/10)
- Notes: Yellow tint (bg-yellow-50/10 dark:bg-yellow-950/10)

**Recommendation:** Start with Approach 1 (neutral). Add subtle tints only if user feedback requests more differentiation.

---

## Files to Modify

### `src/pages/Workspace.tsx`

Add transition classes to main content area:

**Find:**
```tsx
<main className="flex-1 overflow-auto">
```

**Replace with:**
```tsx
<main className="flex-1 overflow-auto transition-colors duration-200">
  {/* Tool-specific background (optional) */}
  <div className={cn(
    "h-full",
    currentTool === 'editor' && "bg-background",
    currentTool === 'chapters' && "bg-background",
    currentTool === 'lorebook' && "bg-background",
    currentTool === 'brainstorm' && "bg-background",
    currentTool === 'prompts' && "bg-background",
    currentTool === 'notes' && "bg-background"
  )}>
    {/* Existing tool content */}
  </div>
</main>
```

**Note:** All bg-background for now (neutral). Can change to subtle tints if desired.

---

### `src/components/workspace/AppSidebar.tsx`

Ensure active tool is clearly highlighted:

**Verify SidebarMenuButton `isActive` prop is used:**
```tsx
<SidebarMenuButton
  onClick={() => setCurrentTool(tool.id as any)}
  isActive={currentTool === tool.id}
>
  <tool.icon />
  <span>{tool.label}</span>
</SidebarMenuButton>
```

**Shadcn Sidebar should handle active styling automatically.** If not, add custom styles:

```tsx
<SidebarMenuButton
  onClick={() => setCurrentTool(tool.id as any)}
  className={cn(
    currentTool === tool.id && "bg-accent font-semibold"
  )}
>
  {/* ... */}
</SidebarMenuButton>
```

---

### Workspace Entry/Exit Animations

**Entry animation:** Fade in on mount

**src/pages/Workspace.tsx:**

```tsx
import { motion } from 'framer-motion'; // If not installed: npm install framer-motion

return (
  <WorkspaceProvider>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <WorkspaceContent />
    </motion.div>
  </WorkspaceProvider>
);
```

**Note:** Only add framer-motion if smooth animations are desired. Otherwise, skip this (instant is fine).

---

### Tool Switching Transitions

**Approach:** Instant swap (no slide animations)

Main content area already has `transition-colors duration-200` for background colour fade. Tool content swaps instantly (no fade in/out between tools).

**Verify this feels right.** If too abrupt, can add subtle fade:

**src/pages/Workspace.tsx:**

```tsx
<main className="flex-1 overflow-auto">
  <div className="h-full transition-opacity duration-150">
    {currentTool === 'editor' && currentChapterId && (
      <EditorTool storyId={storyId!} chapterId={currentChapterId} />
    )}
    {/* ... other tools */}
  </div>
</main>
```

**Recommendation:** Test without fade first. Instant feels snappier.

---

### TopBar Visual Consistency

**Ensure TopBar doesn't shift/jump when switching tools:**

**src/components/workspace/WorkspaceTopBar.tsx:**

Verify fixed height:

```tsx
<div className="flex items-center gap-4 border-b px-4 py-2 h-14">
  {/* ... */}
</div>
```

---

### Loading States

**Add skeleton loading for tools:**

**Example in ChaptersTool:**

```tsx
if (isLoading) {
  return (
    <div className="p-4 space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
```

**Apply to all tools:** Chapters, Lorebook, Prompts, Notes, Brainstorm

---

## Implementation Steps

1. **Review sidebar active state styling**
   - Verify SidebarMenuButton highlights active tool
   - Add custom styles if needed

2. **Add transition classes to main content area**
   - Background colour transition (duration-200)
   - Optional: opacity transition for tool swap

3. **Optional: Add workspace entry animation**
   - Install framer-motion if desired
   - Fade in on mount

4. **Add loading skeletons to all tools**
   - Chapters, Lorebook, Brainstorm, Prompts, Notes
   - Use Tailwind animate-pulse

5. **Verify TopBar consistency**
   - Fixed height
   - No shifting when switching tools

6. **Test visual cohesion:**
   - Switch between tools, verify smooth feel
   - No jarring jumps or flashes
   - Active tool always clear
   - Loading states look polished

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Smooth tool switching
- Clear active state
- Professional loading states

---

## Testing Checklist

- [ ] Open workspace
- [ ] Switch between all tools (Editor, Chapters, Lorebook, Brainstorm, Prompts, Notes)
- [ ] Verify active tool highlighted in sidebar
- [ ] Verify no visual jumps or shifts
- [ ] Verify smooth transitions (if added)
- [ ] Refresh page, verify workspace fades in smoothly (if animation added)
- [ ] Test loading states (may need to throttle network in DevTools)
- [ ] Verify all tools have consistent visual style
- [ ] Test light/dark mode (if supported)
- [ ] No console errors

---

## Optional Enhancements (Not Required)

- Tool-specific accent colours (subtle background tints)
- Micro-interactions (hover effects, button presses)
- Page transitions (fade between workspace and story list)
- Custom scrollbar styling
- Focus states for accessibility
- Reduced motion support (prefers-reduced-motion media query)

---

## Notes for Agent

- **Keep it simple:** Don't over-engineer animations
- **Instant is fine:** Tool switching should feel snappy, not slow
- **Framer-motion is optional:** Only add if smooth animations are desired
- **Consistency over flair:** Focus on professional, clean aesthetic
- **Accessibility:** Ensure active states have sufficient contrast
- **Test both light and dark mode** if theme switching is supported
- **Loading skeletons should match actual content layout** (grid, list, etc.)
