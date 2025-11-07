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

### Critical Path
1. **#01** (Workspace Infrastructure) - MUST BE FIRST
2. **#02** (Story List Entry Point) - After #01
3. **#03** (Editor Tool) - After #01, BEFORE other tools
4. **#04-#08** (Remaining Tools) - After #03, can be sequential or slightly overlapped
5. **#09-#13** (Enhancements) - After relevant tools exist (see dependencies)
6. **#14** (Polish) - LAST

### Parallelisation Opportunities
- **None in Foundation Layer** (#01, #02 are sequential)
- **Partial in Core Tools Layer** (#04-#08 can proceed once #03 is done, but test each individually)
- **Partial in Enhancement Layer** (#11, #12 can proceed independently if dependencies met)
- **Keyboard shortcuts** (#13) can be done anytime after #03-#08

### Recommended Execution Strategy
Run plans strictly in numerical order. Do not start a plan until its dependencies are complete and tested. Each plan should end with lint/build verification before human testing.

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
