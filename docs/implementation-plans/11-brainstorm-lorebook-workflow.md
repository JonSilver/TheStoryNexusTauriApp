# Implementation Plan #11: Brainstorm → Lorebook Workflow

**Model:** Haiku
**Dependencies:** #05 (Lorebook tool), #06 (Brainstorm tool must exist)
**Estimated Complexity:** Low

---

## Objective

Add "Create Lorebook Entry" action from brainstorm message. Modal: prefill content, select category, add tags, save. Background entry creation (no tool switch). Toast notification.

---

## Key Behaviour

1. User in Brainstorm tool, AI generates useful content (e.g., character description)
2. Hover message → action menu → "Create Lorebook Entry"
3. Modal opens: Content prefilled with message text, select category, add tags, title
4. Save → Entry created in Lorebook (background)
5. Toast notification: "Lorebook entry created"
6. User stays in Brainstorm tool (no context switch)

---

## Files to Create

### `src/features/brainstorm/components/CreateLorebookEntryModal.tsx`

```tsx
import { useState } from 'react';
import { useCreateLorebookEntryMutation } from '@/features/lorebook/hooks/useCreateLorebookEntryMutation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'react-toastify';
import type { LorebookCategory } from '@/types/lorebook';

const categories: Array<{ id: LorebookCategory; label: string }> = [
  { id: 'character', label: 'Character' },
  { id: 'location', label: 'Location' },
  { id: 'item', label: 'Item' },
  { id: 'event', label: 'Event' },
  { id: 'note', label: 'Note' },
  { id: 'synopsis', label: 'Synopsis' },
  { id: 'starting_scenario', label: 'Starting Scenario' },
  { id: 'timeline', label: 'Timeline' },
];

interface CreateLorebookEntryModalProps {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledContent: string;
}

export const CreateLorebookEntryModal = ({
  storyId,
  open,
  onOpenChange,
  prefilledContent,
}: CreateLorebookEntryModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(prefilledContent);
  const [category, setCategory] = useState<LorebookCategory>('character');
  const [tags, setTags] = useState('');

  const createMutation = useCreateLorebookEntryMutation(storyId);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    createMutation.mutate(
      {
        title,
        content,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        storyId,
      },
      {
        onSuccess: () => {
          toast.success('Lorebook entry created');
          onOpenChange(false);
          // Reset form
          setTitle('');
          setContent('');
          setTags('');
        },
        onError: () => {
          toast.error('Failed to create entry');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Lorebook Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as LorebookCategory)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Files to Modify

### `src/features/brainstorm/components/BrainstormChat.tsx`

Add action menu to messages:

**Add imports:**
```tsx
import { useState } from 'react'; // May already exist
import { MoreVertical, BookPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CreateLorebookEntryModal } from './CreateLorebookEntryModal';
```

**Add state:**
```tsx
const [createEntryModalOpen, setCreateEntryModalOpen] = useState(false);
const [selectedMessageContent, setSelectedMessageContent] = useState('');
```

**Add action menu to each message (in message render):**
```tsx
{/* Existing message content */}
<div className="flex items-start gap-2">
  <div className="flex-1">
    {/* Message text */}
  </div>

  {/* Action menu */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={() => {
          setSelectedMessageContent(message.content);
          setCreateEntryModalOpen(true);
        }}
      >
        <BookPlus className="mr-2 h-4 w-4" />
        Create Lorebook Entry
      </DropdownMenuItem>
      {/* TODO: Add more actions (copy, regenerate, etc.) */}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Add modal after message list:**
```tsx
<CreateLorebookEntryModal
  storyId={storyId}
  open={createEntryModalOpen}
  onOpenChange={setCreateEntryModalOpen}
  prefilledContent={selectedMessageContent}
/>
```

---

## Files to Verify/Create

### `src/features/lorebook/hooks/useCreateLorebookEntryMutation.ts`

**Check if exists.** If not, create:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import type { LorebookEntry } from '@/types/lorebook';

export const useCreateLorebookEntryMutation = (storyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<LorebookEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.post('/lorebook', entry);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lorebook', storyId] });
    },
  });
};
```

---

## Implementation Steps

1. **Create CreateLorebookEntryModal component:**
   - Form with title, category, tags, content
   - Prefill content from message
   - Save creates entry via mutation
   - Toast on success/error

2. **Verify/create useCreateLorebookEntryMutation hook:**
   - POST to `/lorebook` endpoint
   - Invalidate lorebook query cache on success

3. **Modify BrainstormChat component:**
   - Add action menu to each message (DropdownMenu)
   - "Create Lorebook Entry" action
   - onClick opens modal with prefilled content
   - Render modal

4. **Test workflow:**
   - Send brainstorm message
   - Hover message, click action menu
   - Select "Create Lorebook Entry"
   - Verify modal opens with prefilled content
   - Fill form, save
   - Verify toast notification
   - Switch to Lorebook tool, verify entry created

---

## Verification Steps

```bash
npm run lint
npm run build
npm run dev
```

**Expected outcomes:**
- Zero lint/build errors
- Action menu appears on messages
- Modal opens with prefilled content
- Entry created in database
- Toast notification shown

---

## Testing Checklist

- [ ] Open workspace, switch to Brainstorm tool
- [ ] Send message to AI (or use existing message)
- [ ] Hover message, verify action menu button appears
- [ ] Click action menu → "Create Lorebook Entry"
- [ ] Modal opens with message content prefilled
- [ ] Enter title, select category, add tags
- [ ] Click "Create Entry"
- [ ] Verify toast: "Lorebook entry created"
- [ ] Stay in Brainstorm tool (no navigation)
- [ ] Switch to Lorebook tool
- [ ] Verify new entry appears in list
- [ ] Verify entry has correct title, content, category, tags
- [ ] No console errors

---

## Future Enhancements (Not in This Plan)

- Text selection in message → prefill only selected text
- "Create Scene Beat" action (use message as scene beat command)
- Copy message content action
- Regenerate message action

---

## Notes for Agent

- Action menu should appear on ALL messages (user + assistant)
- Prefilled content is entire message text (no selection yet)
- Modal should reset form on close
- Entry creation happens in background (no tool switch)
- Toast library (react-toastify) already in dependencies
- If useCreateLorebookEntryMutation doesn't exist, create it as specified
