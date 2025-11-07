# Implementation Plan #02: Story List Entry Point

**Model:** Haiku
**Dependencies:** #01 (workspace route must exist)
**Estimated Complexity:** Low

---

## Objective

Update story list to enter workspace directly. Remove story dashboard concept. Clean up old navigation references.

---

## Files to Modify

### `src/features/stories/components/StoryCard.tsx`

**Current behaviour:** Clicking story card navigates to `/dashboard/:storyId/chapters`

**New behaviour:** Clicking story card navigates to `/story/:storyId`

**Find:**
```tsx
const handleClick = () => {
  navigate(`/dashboard/${story.id}/chapters`);
};
```

**Replace with:**
```tsx
const handleClick = () => {
  navigate(`/story/${story.id}`);
};
```

---

### `src/pages/Stories.tsx`

No changes required if this just renders story cards. Verify it doesn't reference `/dashboard` anywhere.

---

### `src/pages/Dashboard.tsx`

**Action:** Mark for deletion (do NOT delete yet - verify no other dependencies first)

Check if any components import from `Dashboard.tsx`. If found, note them in comments but don't break them yet. This will be cleaned up progressively in plans #03-#08 as each tool is refactored.

**Add comment at top of file:**
```tsx
// DEPRECATED: This file will be removed once all tools are refactored to workspace (plans #03-#08)
// Do not add new features here.
```

---

### `src/App.tsx`

Verify the route change from plan #01 is in place:

**Should have:**
```tsx
<Route path="/story/:storyId" element={<Workspace />} />
```

**Old route (keep for now, will 404 gracefully):**
```tsx
<Route path="/dashboard/:storyId/*" element={<Dashboard />} />
```

**Reason to keep:** Some links in existing tool pages might still reference `/dashboard`. They'll break but won't crash the app. Progressive cleanup in #03-#08.

---

## Files to Search for References

Use grep to find all references to `/dashboard` in the codebase:

```bash
grep -r "/dashboard" src/
```

**Expected findings:**
- Navigation links in tool pages (Chapters, Lorebook, Brainstorm, etc.)
- Breadcrumbs or back buttons
- Redirect logic

**Action:** Document findings in a comment block at the bottom of this file, but do NOT fix them yet. Each tool refactor (#03-#08) will clean up its own references.

---

## Implementation Steps

1. **Update StoryCard navigation** (`src/features/stories/components/StoryCard.tsx`)
   - Change `/dashboard/${story.id}/chapters` to `/story/${story.id}`

2. **Deprecate Dashboard** (`src/pages/Dashboard.tsx`)
   - Add deprecation comment at top
   - Do NOT delete file yet

3. **Audit `/dashboard` references:**
   ```bash
   grep -r "/dashboard" src/ > dashboard-references.txt
   ```
   - Review findings
   - Add comment block at end of this plan documenting what needs cleanup

4. **Test in browser:**
   - Go to `/stories`
   - Click story card
   - Verify navigation to `/story/:storyId`
   - Verify workspace loads correctly

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
- Story cards navigate to `/story/:storyId`
- Workspace loads successfully

---

## Testing Checklist

- [ ] Go to `/stories` route
- [ ] Click story card
- [ ] Verify navigation to `/story/:storyId` (check URL bar)
- [ ] Verify workspace loads with story title in top bar
- [ ] Verify sidebar shows all tools
- [ ] No console errors
- [ ] Old `/dashboard/:storyId/chapters` URL returns 404 or redirects gracefully (acceptable for now)

---

## Cleanup Audit Results

After running `grep -r "/dashboard" src/`, document findings here:

```
# Dashboard References Audit
# (Agent: populate this after running grep)

Example format:
- src/features/chapters/pages/ChapterEditor.tsx:42 - Back button to dashboard
- src/features/lorebook/pages/LorebookPage.tsx:18 - Navigation link
- etc.

These will be cleaned up in plans #03-#08 as each tool is refactored.
```

---

## Notes for Agent

- Do NOT delete Dashboard.tsx yet. It may still be referenced by old routes or components.
- Do NOT fix all `/dashboard` references in this plan. That's for #03-#08.
- Focus only on the story list entry point.
- If story card navigation already points to `/story/:storyId`, that's fine - just verify and note it.
