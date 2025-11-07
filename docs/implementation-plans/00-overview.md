# Workspace Redesign - Implementation Overview

This directory contains sequential implementation plans for the workspace redesign described in `docs/workspace-design-plan.md`.

## Execution Approach

Each plan is a self-contained implementation task designed for agent execution. Plans are numbered to indicate the strict dependency order.

### Agent Assignment

- **Sonnet**: Complex architectural changes, new patterns, intricate state management
- **Haiku**: Straightforward refactors, UI updates, simple feature additions

### Verification

Each plan includes lint/build steps for agents to verify their changes. Human testing follows each implementation.

---

## Implementation Plans

### Foundation Layer (Sequential)

**01-workspace-infrastructure.md** (Haiku)
- Install dependencies: `npx shadcn@latest add sidebar`, `react-resizable-panels`, `cmdk`
- Minimal workspace context: current tool state (`editor` | `chapters` | `lorebook` | `brainstorm` | `prompts` | `notes`)
- Workspace route: `/story/:storyId` (replaces old dashboard route)
- Layout: SidebarProvider wrapping Sidebar + main content area
- Tool navigation: SidebarMenu with MenuItem per tool, MenuButton with onClick to switch tool state
- Top bar: Story title, chapter dropdown placeholder, back to stories
- Mobile: Shadcn Sidebar's collapsible variants handle responsive automatically
- **Dependencies**: None (foundational)
- **Key principle**: Shadcn Sidebar handles collapse, responsive, state persistence. Zero custom nav components.

**02-story-list-entry-point.md** (Haiku)
- Remove story dashboard concept
- Update story cards to enter workspace directly at `/story/:storyId`
- Remove landing page default behaviour
- **Dependencies**: #01 (workspace route must exist)

---

### Core Tools Layer (Sequential - Editor first, rest can follow)

**03-editor-tool-refactor.md** (Sonnet)
- Refactor Editor page as workspace tool
- Implement chapter switching dropdown in TopBar
- State preservation (scroll position, cursor position per chapter)
- Remove old editor navigation chrome
- **Dependencies**: #01 (workspace infrastructure must exist)

**04-chapters-tool-refactor.md** (Haiku)
- Refactor Chapters page as workspace tool
- Chapter list view in main content area
- Click chapter → switches to Editor tool with that chapter loaded
- **Dependencies**: #01, #03 (workspace + Editor tool must exist)

**05-lorebook-tool-refactor.md** (Haiku)
- Refactor Lorebook page as workspace tool
- Split view using `react-resizable-panels`: category filter + entry list + entry editor
- Remove old lorebook navigation chrome
- Responsive mobile: two-stage list → editor
- **Dependencies**: #01 (workspace infrastructure must exist)

**06-brainstorm-tool-refactor.md** (Haiku)
- Refactor Brainstorm page as workspace tool
- Full-height chat interface in main content area
- Remove old brainstorm navigation chrome
- **Dependencies**: #01 (workspace infrastructure must exist)

**07-prompts-tool-refactor.md** (Haiku)
- Refactor Prompts page as workspace tool
- Split view using `react-resizable-panels`: prompt list + editor
- Remove old prompts navigation chrome
- **Dependencies**: #01 (workspace infrastructure must exist)

**08-notes-tool-refactor.md** (Haiku)
- Refactor Notes page as workspace tool
- Split view using `react-resizable-panels`: note list + editor
- Remove old notes navigation chrome
- **Dependencies**: #01 (workspace infrastructure must exist)

---

### Enhancement Layer (After tools exist)

**09-right-panel-system.md** (Haiku)
- Right Panel using `react-resizable-panels` (desktop only)
- Contextual tools when Editor active: Matched Tags, Outline, POV, Notes
- Toggle mechanism from Editor toolbar
- State persistence (collapsed/expanded, panel width) via react-resizable-panels API
- **Dependencies**: #03 (Editor must be a tool first)

**10-command-palette.md** (Sonnet)
- Integrate `cmdk` library
- Unified search: chapters, lorebook entries, prompts, notes, actions
- Keyboard trigger (Cmd+K) + TopBar search icon
- Tool/chapter switching via palette
- **Dependencies**: #03-#08 (all tools must exist to search across them)

**11-brainstorm-lorebook-workflow.md** (Haiku)
- "Create Lorebook Entry" action from brainstorm message
- Modal: prefill content, select category, add tags, save
- Background entry creation (no tool switch)
- Toast notification
- **Dependencies**: #05, #06 (Lorebook and Brainstorm tools must exist)

**12-editor-quick-reference.md** (Haiku)
- Matched Tags view in Right Panel
- Lorebook entry preview (read-only)
- "View Full Entry" → switches to Lorebook tool with entry selected
- Mobile: right edge swipe → drawer
- **Dependencies**: #03, #05, #09 (Editor, Lorebook, Right Panel must exist)

**13-keyboard-shortcuts.md** (Haiku)
- Tool switching: Cmd+1-6 (Editor, Chapters, Lorebook, Brainstorm, Prompts, Notes)
- Chapter picker: Cmd+J
- Command palette: Cmd+K (if not in #10)
- Right panel toggle: Cmd+Shift+K
- Scene beat: Alt+S (may already exist)
- **Dependencies**: #03-#08 (all tools must exist)

---

### Polish Layer (Final)

**14-visual-polish.md** (Haiku)
- Tool-specific background colour shifts
- Smooth transitions between tools (fade/instant, no slide)
- Workspace entry/exit animations
- Visual cohesion audit
- Active tool highlighting consistency
- **Dependencies**: #01-#08 (workspace + all tools must exist)

---

## Execution Order

### Dependency Chain Visualization

```
#01 (Workspace Infrastructure)
 ├─→ #02 (Story List Entry)
 ├─→ #03 (Editor Tool)
 │    ├─→ #04 (Chapters Tool)
 │    ├─→ #09 (Right Panel)
 │    │    └─→ #12 (Editor Quick Reference)
 │    └─→ #13 (Keyboard Shortcuts)*
 ├─→ #05 (Lorebook Tool)
 │    ├─→ #11 (Brainstorm→Lorebook)*
 │    ├─→ #12 (Editor Quick Reference)
 │    └─→ #13 (Keyboard Shortcuts)*
 ├─→ #06 (Brainstorm Tool)
 │    ├─→ #11 (Brainstorm→Lorebook)*
 │    └─→ #13 (Keyboard Shortcuts)*
 ├─→ #07 (Prompts Tool)
 │    └─→ #13 (Keyboard Shortcuts)*
 ├─→ #08 (Notes Tool)
 │    └─→ #13 (Keyboard Shortcuts)*
 └─→ #10 (Command Palette)**

#03-#08 complete → #13 (Keyboard Shortcuts)
#03-#08 complete → #10 (Command Palette)
#01-#08 complete → #14 (Visual Polish)

* #13 requires ALL tools #03-#08 complete
** #10 requires ALL tools #03-#08 complete
```

### Execution Phases

**PHASE 1: Foundation (Strictly Sequential)**
```
Execute: #01
  ↓ (test & verify)
Execute: #02
  ↓ (test & verify)
Execute: #03
  ↓ (test & verify)
Execute: #04
  ↓ (test & verify)
```
**No parallelization possible. Must complete in order.**

---

**PHASE 2: Remaining Tools (Can Parallelize)**
```
Execute in parallel (or sequential if preferred):
  - #05 (Lorebook)
  - #06 (Brainstorm)
  - #07 (Prompts)
  - #08 (Notes)

Test each individually before proceeding.
```
**All depend only on #01. Can run simultaneously or in any order.**

---

**PHASE 3: Enhancements Wave 1 (Partial Parallelization)**
```
After #03-#08 complete:

Execute: #09 (Right Panel)
  ↓ (test & verify)

Then execute in parallel:
  - #10 (Command Palette)
  - #11 (Brainstorm→Lorebook)
```
**#10 and #11 can run in parallel. #12 must wait for #09.**

---

**PHASE 4: Enhancements Wave 2 (Parallel)**
```
After #09 complete:

Execute in parallel:
  - #12 (Editor Quick Reference)
  - #13 (Keyboard Shortcuts)
```
**Both can run simultaneously once their dependencies are met.**

---

**PHASE 5: Polish (Final)**
```
After #03-#08 complete:

Execute: #14 (Visual Polish)
```
**Must be last. Requires all tools to exist for cohesion audit.**

---

### Safest Execution Strategy (Fully Sequential)

For simplest orchestration with no parallelization:

```
1.  #01 → test
2.  #02 → test
3.  #03 → test
4.  #04 → test
5.  #05 → test
6.  #06 → test
7.  #07 → test
8.  #08 → test
9.  #09 → test
10. #10 → test
11. #11 → test
12. #12 → test
13. #13 → test
14. #14 → test
```

This is the numbered sequence. Always works. No complexity.

---

### Fastest Execution Strategy (Maximum Parallelization)

For orchestrators that can manage parallel agents:

**Step 1:** Execute #01 → test
**Step 2:** Execute #02 → test
**Step 3:** Execute #03 → test
**Step 4:** Execute #04 → test
**Step 5:** Execute #05, #06, #07, #08 in parallel → test each
**Step 6:** Execute #09 → test
**Step 7:** Execute #10, #11 in parallel → test each
**Step 8:** Execute #12, #13 in parallel → test each
**Step 9:** Execute #14 → test

Reduces total execution time by ~30% if parallel agents available.

---

### Critical Rules for Orchestrator

1. **Never start a plan before its dependencies are complete and tested**
2. **Always run lint/build verification after each plan**
3. **Always wait for human approval before proceeding to next phase**
4. **If a plan fails, stop and fix before continuing**
5. **Phase 1 (#01-#04) is strictly sequential - no exceptions**
6. **Parallel execution requires separate agent instances**
7. **Test each plan individually even when run in parallel**

---

## Testing Strategy

### Per-Plan Testing (Human)
After each plan implementation:
1. Agent runs lint/build (automated verification)
2. Human tests specific functionality added in that plan
3. Human verifies no regressions in existing features
4. Proceed to next plan only after approval

### Integration Testing (After Core Tools Layer)
After #03-#08 complete:
- Test tool switching across all tools
- Test chapter switching from each tool
- Test state preservation (scroll position, selections)
- Test responsive behaviour (desktop + mobile)

### Full System Testing (After Enhancement Layer)
After #09-#13 complete:
- Test all convenience workflows
- Test keyboard shortcuts
- Test command palette across all tool types
- Full responsive audit (mobile gestures, touch targets)

---

## Open Questions (Resolved)

1. **Tool state persistence** - RESOLVED: Always start at Editor when entering story workspace (tool state is transient)
2. **Desktop sidebar** - TBD: Fixed width or resizable? (Decide in #01)
3. **Mobile toolbar** - TBD: 4 tools + More menu, or 5 tools? (Decide in #01)
4. **Right panel default** - TBD: Auto-open when Editor active, or collapsed by default? (Decide in #09)

---

## Success Criteria

After all plans complete:
1. ✅ Workspace feel - User stays "in" story, no navigation sensation
2. ✅ Tool switching - Instant (< 100ms perceived latency)
3. ✅ Chapter switching - < 2s from any chapter to any other
4. ✅ Context preservation - Editor scroll position preserved per chapter
5. ✅ Mobile usability - All tools full-screen, easy toolbar switching
6. ✅ Lint/build - Zero errors, zero warnings
