# Task 11: Story Lorebook UI - Inheritance Display

## Objective
Update story lorebook view to display inherited global/series entries alongside story-specific entries.

## Context
- Use hierarchical query to fetch all applicable entries
- Display inherited entries as read-only
- Display story entries as editable
- Two display options: sectioned or unified with badges

## Dependencies
- **Task 08**: Hierarchical lorebook query hook
- **Existing**: Story lorebook page and components

## File Locations
- **Modify**: `src/features/lorebook/pages/LorebookPage.tsx` (or story-specific lorebook view)
- **Create**: `src/features/lorebook/components/LevelBadge.tsx`
- **Create**: `src/features/lorebook/components/InheritedEntriesSection.tsx`

## Implementation Steps

### 1. Create LevelBadge Component
```typescript
// src/features/lorebook/components/LevelBadge.tsx
import { Badge } from '@/components/ui/badge';
import type { LorebookLevel } from '@/types/entities';

interface LevelBadgeProps {
    level: LorebookLevel;
}

const LEVEL_STYLES = {
    global: 'bg-blue-500 hover:bg-blue-600',
    series: 'bg-purple-500 hover:bg-purple-600',
    story: 'bg-green-500 hover:bg-green-600',
} as const;

const LEVEL_LABELS = {
    global: 'Global',
    series: 'Series',
    story: 'Story',
} as const;

export const LevelBadge = ({ level }: LevelBadgeProps) => {
    return (
        <Badge variant="secondary" className={LEVEL_STYLES[level]}>
            {LEVEL_LABELS[level]}
        </Badge>
    );
};
```

### 2. Create InheritedEntriesSection Component
```typescript
// src/features/lorebook/components/InheritedEntriesSection.tsx
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { LorebookEntryCard } from './LorebookEntryCard';
import { LevelBadge } from './LevelBadge';
import type { LorebookEntry, LorebookLevel } from '@/types/entities';

interface InheritedEntriesSectionProps {
    entries: LorebookEntry[];
    level: LorebookLevel;
    category: string;
}

export const InheritedEntriesSection = ({
    entries,
    level,
    category,
}: InheritedEntriesSectionProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (entries.length === 0) return null;

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <LevelBadge level={level} />
                <span className="font-medium">
                    Inherited {category} ({entries.length})
                </span>
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2 pl-6">
                    {entries.map((entry) => (
                        <LorebookEntryCard
                            key={entry.id}
                            entry={entry}
                            editable={false}
                            showLevel={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
```

### 3. Update LorebookEntryCard Component
Add support for read-only mode and level badge:

```typescript
// In src/features/lorebook/components/LorebookEntryCard.tsx

interface LorebookEntryCardProps {
    entry: LorebookEntry;
    editable?: boolean;  // NEW
    showLevel?: boolean;  // NEW
}

export const LorebookEntryCard = ({
    entry,
    editable = true,
    showLevel = false,
}: LorebookEntryCardProps) => {
    // ... existing card implementation

    return (
        <Card className={editable ? '' : 'opacity-75'}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            {showLevel && <LevelBadge level={entry.level} />}
                            {entry.name}
                        </CardTitle>
                        <CardDescription>{entry.description}</CardDescription>
                    </div>
                    {editable && (
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={handleEdit}>
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
        </Card>
    );
};
```

### 4. Update Story LorebookPage (Option A: Sectioned Layout)
```typescript
// In src/features/lorebook/pages/LorebookPage.tsx (or story-specific view)

export const StoryLorebookPage = () => {
    const { storyId } = useParams<{ storyId: string }>();
    const [selectedCategory, setSelectedCategory] = useState<LorebookCategory>('character');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Use hierarchical query instead of story-only query
    const { data: allEntries, isLoading } = useHierarchicalLorebookQuery(storyId);

    // Separate entries by level
    const globalEntries = allEntries?.filter((e) => e.level === 'global' && e.category === selectedCategory) || [];
    const seriesEntries = allEntries?.filter((e) => e.level === 'series' && e.category === selectedCategory) || [];
    const storyEntries = allEntries?.filter((e) => e.level === 'story' && e.category === selectedCategory) || [];

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Lorebook</h1>
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
                        {/* Inherited Global Entries */}
                        <InheritedEntriesSection
                            entries={globalEntries}
                            level="global"
                            category={cat}
                        />

                        {/* Inherited Series Entries */}
                        <InheritedEntriesSection
                            entries={seriesEntries}
                            level="series"
                            category={cat}
                        />

                        {/* Story Entries (Editable) */}
                        <div className="mb-4">
                            <h3 className="font-medium mb-3 flex items-center gap-2">
                                <LevelBadge level="story" />
                                Story-Specific {cat}
                            </h3>
                            {storyEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {storyEntries.map((entry) => (
                                        <LorebookEntryCard
                                            key={entry.id}
                                            entry={entry}
                                            editable={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    No story-specific {cat} entries yet
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <LorebookEntryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                level="story"
                scopeId={storyId}
                defaultCategory={selectedCategory}
            />
        </div>
    );
};
```

### 5. Alternative: Unified List (Option B)
If preferred, show all entries in single list with badges:

```typescript
// Alternative rendering in TabsContent
<TabsContent key={cat} value={cat}>
    {isLoading ? (
        <div>Loading...</div>
    ) : allCategoryEntries.length > 0 ? (
        <div className="space-y-2">
            {allCategoryEntries.map((entry) => (
                <LorebookEntryCard
                    key={entry.id}
                    entry={entry}
                    editable={entry.level === 'story'}
                    showLevel={true}
                />
            ))}
        </div>
    ) : (
        <div className="text-center text-muted-foreground py-12">
            No {cat} entries
        </div>
    )}
</TabsContent>
```

## Component Summary
After implementation:

**New Components:**
- `LevelBadge` - Visual indicator of entry level
- `InheritedEntriesSection` - Collapsible section for inherited entries

**Modified Components:**
- `LorebookPage` - Uses hierarchical query, displays inherited entries
- `LorebookEntryCard` - Supports read-only mode and level badge

**Display Options:**
- **Option A**: Sectioned (global / series / story sections)
- **Option B**: Unified list with level badges

## Validation
- Story lorebook displays global + series + story entries
- Inherited entries shown as read-only (no edit/delete buttons)
- Story entries editable
- Level badges correctly colored
- Hierarchical query fetches all applicable entries
- Creating new entry defaults to story level

## Notes
- **Recommend Option A (sectioned)** for clearer separation
- Inherited sections collapsible to reduce clutter
- Level badges use consistent colors across app
- Edit buttons only on story-level entries
