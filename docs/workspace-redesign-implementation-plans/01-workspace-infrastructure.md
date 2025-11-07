# Implementation Plan #01: Workspace Infrastructure

**Model:** Haiku
**Dependencies:** None (foundational)
**Estimated Complexity:** Medium

---

## Objective

Establish workspace infrastructure using Shadcn Sidebar and react-resizable-panels. Create minimal tool-switching state management without custom navigation components.

---

## Key Principle

**Dependency-first approach:** Use Shadcn Sidebar for all navigation/collapse/responsive behaviour. Use react-resizable-panels for split views. Write minimal glue code only.

---

## Dependencies to Install

```bash
# Shadcn Sidebar (includes all subcomponents)
npx shadcn@latest add sidebar

# Resizable panels for split views
npm install react-resizable-panels

# Command palette (used later but install now)
npm install cmdk
```

---

## Files to Create

### 1. `src/contexts/WorkspaceContext.tsx`
Minimal context for current tool state:

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type Tool = 'editor' | 'chapters' | 'lorebook' | 'brainstorm' | 'prompts' | 'notes';

interface WorkspaceContextType {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [currentTool, setCurrentTool] = useState<Tool>('editor');

  return (
    <WorkspaceContext.Provider value={{ currentTool, setCurrentTool }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
```

### 2. `src/components/workspace/AppSidebar.tsx`
Sidebar using Shadcn components:

```tsx
import { Home, FileText, Book, MessageSquare, Settings, StickyNote } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const tools = [
  { id: 'editor', label: 'Editor', icon: FileText },
  { id: 'chapters', label: 'Chapters', icon: Home },
  { id: 'lorebook', label: 'Lorebook', icon: Book },
  { id: 'brainstorm', label: 'Brainstorm', icon: MessageSquare },
  { id: 'prompts', label: 'Prompts', icon: Settings },
  { id: 'notes', label: 'Notes', icon: StickyNote },
] as const;

export const AppSidebar = () => {
  const { currentTool, setCurrentTool } = useWorkspace();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarMenu>
            {tools.map((tool) => (
              <SidebarMenuItem key={tool.id}>
                <SidebarMenuButton
                  onClick={() => setCurrentTool(tool.id as any)}
                  isActive={currentTool === tool.id}
                >
                  <tool.icon />
                  <span>{tool.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
```

### 3. `src/components/workspace/WorkspaceTopBar.tsx`
Top bar with story title and back button:

```tsx
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface WorkspaceTopBarProps {
  storyTitle: string;
}

export const WorkspaceTopBar = ({ storyTitle }: WorkspaceTopBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 border-b px-4 py-2">
      <SidebarTrigger />
      <Button variant="ghost" size="sm" onClick={() => navigate('/stories')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Stories
      </Button>
      <div className="flex-1">
        <h1 className="text-lg font-semibold">{storyTitle}</h1>
      </div>
      {/* Chapter dropdown placeholder - implemented in plan #03 */}
    </div>
  );
};
```

### 4. `src/pages/Workspace.tsx`
Main workspace layout:

```tsx
import { useParams } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { AppSidebar } from '@/components/workspace/AppSidebar';
import { WorkspaceTopBar } from '@/components/workspace/WorkspaceTopBar';
import { useStoryQuery } from '@/features/stories/hooks/useStoryQuery';

const WorkspaceContent = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const { data: story, isLoading } = useStoryQuery(storyId!);
  const { currentTool } = useWorkspace();

  if (isLoading) return <div>Loading...</div>;
  if (!story) return <div>Story not found</div>;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <WorkspaceTopBar storyTitle={story.title} />
          <main className="flex-1 overflow-auto p-4">
            {/* Tool content placeholder - implemented in plans #03-#08 */}
            <div className="text-muted-foreground">
              Current tool: {currentTool}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export const Workspace = () => {
  return (
    <WorkspaceProvider>
      <WorkspaceContent />
    </WorkspaceProvider>
  );
};
```

---

## Files to Modify

### `src/App.tsx`
Update routing to add workspace route:

**Find:**
```tsx
<Route path="/dashboard/:storyId/*" element={<Dashboard />} />
```

**Replace with:**
```tsx
<Route path="/story/:storyId" element={<Workspace />} />
```

**Add import:**
```tsx
import { Workspace } from '@/pages/Workspace';
```

---

## Implementation Steps

1. **Install dependencies** (see above)

2. **Create WorkspaceContext** (`src/contexts/WorkspaceContext.tsx`)
   - Simple useState for current tool
   - Provider and hook

3. **Create AppSidebar** (`src/components/workspace/AppSidebar.tsx`)
   - Use Shadcn Sidebar components
   - Map tools array to SidebarMenu items
   - Use `isActive` prop for active tool highlighting
   - onClick sets current tool in context

4. **Create WorkspaceTopBar** (`src/components/workspace/WorkspaceTopBar.tsx`)
   - Back button to `/stories`
   - SidebarTrigger for mobile toggle
   - Story title display
   - Chapter dropdown placeholder (comment for now)

5. **Create Workspace page** (`src/pages/Workspace.tsx`)
   - Wrap in WorkspaceProvider + SidebarProvider
   - Fetch story using useStoryQuery
   - Layout: AppSidebar + TopBar + main content area
   - Placeholder for tool content (just shows current tool name)

6. **Update routing** (`src/App.tsx`)
   - Replace `/dashboard/:storyId/*` route with `/story/:storyId`
   - Import Workspace component

7. **Test in browser:**
   - Navigate to `/story/:storyId`
   - Verify sidebar renders with all tools
   - Click tools, verify active state updates
   - Verify SidebarTrigger collapses/expands sidebar
   - Test mobile responsive behaviour

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
- Workspace route loads successfully
- Sidebar renders with 6 tools
- Tool switching updates active state
- Mobile: sidebar collapses to overlay
- Desktop: sidebar collapsible via trigger

---

## Testing Checklist

- [ ] Navigate to `/story/:storyId` with valid story ID
- [ ] Sidebar displays all 6 tools (Editor, Chapters, Lorebook, Brainstorm, Prompts, Notes)
- [ ] Click each tool, verify active state highlights correctly
- [ ] Click "Stories" back button, navigates to `/stories`
- [ ] SidebarTrigger collapses/expands sidebar
- [ ] Mobile viewport: sidebar becomes overlay (test at <768px width)
- [ ] Desktop viewport: sidebar shows inline (test at >1024px width)
- [ ] No console errors

---

## Known Limitations (Resolved in Later Plans)

- Tool switching shows placeholder text, not actual tool content (fixed in #03-#08)
- No chapter dropdown in top bar (added in #03)
- No actual tool pages rendered (added in #03-#08)
- Navigation still references old `/dashboard` route in some places (cleaned up in #02)

---

## Notes for Agent

- Do NOT build custom sidebar components. Use Shadcn Sidebar exclusively.
- Do NOT add routing logic for tools. Tool switching is pure React state, no URL changes.
- Do NOT implement tool content yet. Just the infrastructure.
- Shadcn Sidebar handles all responsive breakpoints automatically via its collapsible variants.
- If `npx shadcn@latest add sidebar` prompts for config, use defaults (or check existing components.json).
