# Workspace Redesign - Implementation Overview

## Philosophy

These plans describe **architectural transformations**, not code implementations. Each plan identifies:

1. **What changes architecturally** - component relationships, state management, routing
2. **Problems to solve** - technical challenges, user experience issues
3. **Key decisions** - choices to make during implementation
4. **Integration points** - how this connects to existing code
5. **Success criteria** - how to verify it works

**What these plans are NOT:**
- Line-by-line code instructions
- Complete component implementations
- Prescriptive JSX templates
- Copy-paste solutions

## Core Transformation

**From:** Page-based navigation with separate routes for each feature
**To:** Single persistent workspace with tool switching via UI state

**Key architectural shifts:**
1. **Routing simplification** - `/story/:storyId` replaces nested dashboard routes
2. **Tool-based navigation** - React state controls visible tool, not router
3. **Persistent chrome** - Top bar and sidebar never change, only main content swaps
4. **State preservation** - Chapter context, scroll position, tool state maintained across switches

## Implementation Sequence

### Foundation (Sequential - Must complete in order)

**#01 - Workspace Infrastructure**
- Create workspace route and layout shell
- Tool switching via React state (not routing)
- Minimal context for current tool + chapter
- Empty content area (tools added later)

**#02 - Story List Entry Point**
- Remove story dashboard concept
- Story cards link directly to workspace
- Clean up old dashboard routes

**#03 - Editor Tool**
- Refactor editor page as workspace tool
- Chapter switching via top bar dropdown
- State preservation (scroll, cursor position)

**#04 - Chapters Tool**
- Refactor chapters page as tool
- Clicking chapter switches to Editor tool with that chapter loaded

### Remaining Tools (Can parallelize)

**#05 - Lorebook Tool**
**#06 - Brainstorm Tool**
**#07 - Prompts Tool**
**#08 - Notes Tool**

Each tool: Refactor existing page as workspace tool, remove navigation chrome, integrate with workspace context.

### Enhancements (After tools exist)

**#09 - Right Panel System** (Editor contextual tools)
**#10 - Command Palette** (Unified search)
**#11 - Brainstorm → Lorebook Workflow**
**#12 - Editor Quick Reference**
**#13 - Keyboard Shortcuts**

### Polish

**#14 - Visual Cohesion**

## Critical Technical Decisions

### 1. Tool Navigation Pattern
**Decision:** Tool switching uses React state, not routing
**Rationale:** Instant switching, no URL changes, feels like workspace not website
**Implementation:** WorkspaceContext holds `currentTool` state, sidebar buttons update it

### 2. Chapter State Management
**Decision:** Chapter ID in workspace context, not URL params
**Rationale:** Chapter switching shouldn't feel like navigation
**Alternative:** Could use URL query param for deep linking (`?chapter=xyz`)
**Recommendation:** Start with context, add URL param later if needed

### 3. Mobile Layout
**Decision:** Bottom toolbar (not collapsible sidebar)
**Rationale:** More ergonomic for thumb reach, clearer tool switching
**Implementation:** Responsive check swaps sidebar for toolbar at mobile breakpoint

### 4. State Preservation Strategy
**Editor scroll position:** Store in ref Map keyed by chapter ID
**Tool state:** Keep in memory during session, don't persist across page reloads
**Chapter selection:** Persist in context, initialize to first chapter if none

### 5. Existing Page Integration
**Decision:** Extract existing page components into tool wrappers, don't rebuild from scratch
**Rationale:** Preserve working functionality, reduce risk
**Implementation:** Create thin wrapper components that render existing pages with workspace context

## Testing Strategy

### Per-Plan Verification
1. Lint and build (automated)
2. Specific functionality test (human)
3. No regressions in existing features
4. Explicit approval before next plan

### Integration Testing Checkpoints
- After #04: Core workspace navigation works (sidebar, tools, chapters)
- After #08: All tools accessible and functional
- After #13: All enhancements integrated
- After #14: Visual cohesion and polish complete

## Common Pitfalls to Avoid

1. **Don't rebuild existing features** - Wrap and integrate, don't rewrite
2. **Don't add routing** - Tool switching is pure React state
3. **Don't break existing editor** - Lexical plugins must continue working
4. **Don't over-engineer state** - Start simple, add complexity only if needed
5. **Don't skip testing** - Each plan must be verified before continuing

## Success Metrics

After implementation complete:
- **Workspace feel** - No navigation sensation, always "in" the story
- **Tool switching** - Instant, < 100ms perceived latency
- **Chapter switching** - < 2s to load any chapter
- **Context preservation** - Return to editor shows exact position
- **Mobile usability** - All tools accessible, easy toolbar switching
- **Zero regressions** - All existing functionality still works

## Execution Rules

1. Complete foundation plans (#01-#04) sequentially - no exceptions
2. Tools #05-#08 can parallelize if multiple implementers available
3. Never start plan before dependencies verified and tested
4. If plan fails, stop and fix before continuing
5. Human approval required between phases

## What Makes a Good Implementation

**Good:**
- Solves the problem described in the plan
- Makes sensible architectural decisions
- Integrates cleanly with existing code
- Preserves existing functionality
- Follows project conventions (see CLAUDE.md)

**Bad:**
- Copies code from plan verbatim
- Ignores existing implementations
- Rebuilds working features from scratch
- Adds unnecessary complexity
- Breaks existing functionality

---

**Ready to start? Read plan #01.**
