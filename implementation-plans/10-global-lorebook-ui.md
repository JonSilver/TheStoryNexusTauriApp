# Task 10: Global Lorebook UI

## Objective
Create UI for managing global-level lorebook entries, accessible from anywhere in the application.

## Context
- Reuse existing lorebook components with level='global' prop
- Global entries editable only from this page
- Read-only display in story/series views

## Dependencies
- **Task 08**: Lorebook query hooks with global query
- **Existing**: Lorebook components in `src/features/lorebook/components/`

## File Locations
- **Create**: `src/features/lorebook/pages/GlobalLorebookPage.tsx`
- **Modify**: Existing lorebook components to accept level prop

## Implementation Steps

### 1. Create GlobalLorebookPage Component
```typescript
// src/features/lorebook/pages/GlobalLorebookPage.tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalLorebookQuery } from '../hooks/useLorebookQuery';
import { LorebookEntryCard } from '../components/LorebookEntryCard';
import { LorebookEntryDialog } from '../components/LorebookEntryDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { LorebookCategory } from '@/types/entities';

const CATEGORIES: LorebookCategory[] = [
    'character',
    'location',
    'item',
    'event',
    'note',
    'synopsis',
    'starting scenario',
    'timeline',
];

export const GlobalLorebookPage = () => {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<LorebookCategory>('character');

    const { data: entries, isLoading } = useGlobalLorebookQuery();

    const entriesByCategory = entries?.filter((e) => e.category === selectedCategory) || [];

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Global Lorebook</h1>
                    <p className="text-muted-foreground mt-1">
                        Entries available to all stories
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Entry
                </Button>
            </div>

            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as LorebookCategory)}>
                <TabsList className="mb-6">
                    {CATEGORIES.map((cat) => (
                        <TabsTrigger key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {CATEGORIES.map((cat) => (
                    <TabsContent key={cat} value={cat}>
                        {isLoading ? (
                            <div>Loading...</div>
                        ) : entriesByCategory.length > 0 ? (
                            <div className="space-y-4">
                                {entriesByCategory.map((entry) => (
                                    <LorebookEntryCard
                                        key={entry.id}
                                        entry={entry}
                                        editable={true}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-12">
                                No global {cat} entries yet
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            <LorebookEntryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                level="global"
                defaultCategory={selectedCategory}
            />
        </div>
    );
};
```

### 2. Update LorebookEntryDialog Component
Modify to accept level and scopeId props:

```typescript
// In src/features/lorebook/components/LorebookEntryDialog.tsx

interface LorebookEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry?: LorebookEntry;  // For editing
    level: 'global' | 'series' | 'story';
    scopeId?: string;  // Required for series/story level
    defaultCategory?: LorebookCategory;
}

export const LorebookEntryDialog = ({
    open,
    onOpenChange,
    entry,
    level,
    scopeId,
    defaultCategory,
}: LorebookEntryDialogProps) => {
    // ... implementation
    // Pass level and scopeId to form
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {entry ? 'Edit' : 'Create'} Lorebook Entry
                    </DialogTitle>
                </DialogHeader>
                <LorebookEntryForm
                    entry={entry}
                    level={level}
                    scopeId={scopeId}
                    defaultCategory={defaultCategory}
                    onSuccess={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
};
```

### 3. Update LorebookEntryForm Component
Add level and scopeId to form:

```typescript
// In src/features/lorebook/components/LorebookEntryForm.tsx

interface LorebookEntryFormProps {
    entry?: LorebookEntry;
    level: 'global' | 'series' | 'story';
    scopeId?: string;
    defaultCategory?: LorebookCategory;
    onSuccess?: () => void;
}

export const LorebookEntryForm = ({
    entry,
    level,
    scopeId,
    defaultCategory,
    onSuccess,
}: LorebookEntryFormProps) => {
    // ... existing form logic

    const onSubmit = async (data: FormData) => {
        const payload = {
            ...data,
            level,
            scopeId: level === 'global' ? undefined : scopeId,
        };

        if (entry) {
            await updateMutation.mutateAsync({ id: entry.id, data: payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
        onSuccess?.();
    };

    // ... rest of form
};
```

### 4. Add Route
Update routing configuration:

```typescript
// Add to router
{
    path: '/lorebook-global',
    element: <GlobalLorebookPage />,
}
```

### 5. Add Navigation Link
Add to main navigation (header/sidebar):

```typescript
// In navigation component
<Link to="/lorebook-global">
    <Button variant="ghost">
        Global Lorebook
    </Button>
</Link>
```

## Component Summary
After implementation:

**Pages:**
- `GlobalLorebookPage` - Manage global lorebook entries

**Modified Components:**
- `LorebookEntryDialog` - Accepts level/scopeId props
- `LorebookEntryForm` - Includes level/scopeId in submission

**Routes:**
- `/lorebook-global` - Global lorebook management

## Validation
- Global lorebook page displays all global entries
- Entries grouped by category tabs
- Create new global entry saves with level='global'
- Edit global entry maintains level='global'
- No scopeId set for global entries
- Navigation link accessible from main nav

## Notes
- Reuse ALL existing lorebook components - only add level/scopeId props
- Global entries have no scopeId (undefined)
- Category-specific forms (Character, Location, etc.) require NO changes
- This page is the ONLY place to edit global entries
