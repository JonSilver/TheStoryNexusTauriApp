# Task 09: Series UI Components

## Objective
Create React components for series management: list, dashboard, and forms.

## Context
- Reuse existing patterns from `StoryListPage` and `StoryDashboard`
- Use shadcn/ui components for consistency
- Integrate with series query hooks from Task 07

## Dependencies
- **Task 02**: Updated types
- **Task 07**: Series query hooks

## File Locations
- **Create**: `src/features/series/pages/SeriesListPage.tsx`
- **Create**: `src/features/series/pages/SeriesDashboard.tsx`
- **Create**: `src/features/series/components/SeriesForm.tsx`
- **Create**: `src/features/series/components/SeriesCard.tsx`

## Implementation Steps

### 1. Create SeriesListPage Component
Similar to `StoryListPage.tsx`:

```typescript
// src/features/series/pages/SeriesListPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSeriesQuery, useDeleteSeriesMutation } from '../hooks/useSeriesQuery';
import { SeriesCard } from '../components/SeriesCard';
import { SeriesForm } from '../components/SeriesForm';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export const SeriesListPage = () => {
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const { data: seriesList, isLoading } = useSeriesQuery();
    const deleteMutation = useDeleteSeriesMutation();

    const handleDelete = async (id: string) => {
        if (confirm('Delete this series? Stories will be orphaned but not deleted.')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    if (isLoading) return <div>Loading series...</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Series</h1>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Series
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seriesList?.map((series) => (
                    <SeriesCard
                        key={series.id}
                        series={series}
                        onDelete={() => handleDelete(series.id)}
                        onClick={() => navigate(`/series/${series.id}`)}
                    />
                ))}
            </div>

            {seriesList?.length === 0 && (
                <div className="text-center text-muted-foreground mt-12">
                    No series yet. Create your first series to organize stories.
                </div>
            )}

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Series</DialogTitle>
                    </DialogHeader>
                    <SeriesForm onSuccess={() => setIsCreateDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
};
```

### 2. Create SeriesCard Component
Similar to `StoryCard.tsx`:

```typescript
// src/features/series/components/SeriesCard.tsx
import { Trash2, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Series } from '@/types/entities';

interface SeriesCardProps {
    series: Series;
    onDelete: () => void;
    onClick: () => void;
}

export const SeriesCard = ({ series, onDelete, onClick }: SeriesCardProps) => {
    return (
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            {series.name}
                        </CardTitle>
                        {series.description && (
                            <CardDescription className="mt-2">
                                {series.description}
                            </CardDescription>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
        </Card>
    );
};
```

### 3. Create SeriesForm Component
```typescript
// src/features/series/components/SeriesForm.tsx
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateSeriesMutation, useUpdateSeriesMutation } from '../hooks/useSeriesQuery';
import type { Series } from '@/types/entities';

interface SeriesFormProps {
    series?: Series;  // For editing existing series
    onSuccess?: () => void;
}

interface SeriesFormData {
    name: string;
    description?: string;
}

export const SeriesForm = ({ series, onSuccess }: SeriesFormProps) => {
    const createMutation = useCreateSeriesMutation();
    const updateMutation = useUpdateSeriesMutation();

    const { register, handleSubmit, formState: { errors } } = useForm<SeriesFormData>({
        defaultValues: {
            name: series?.name || '',
            description: series?.description || '',
        },
    });

    const onSubmit = async (data: SeriesFormData) => {
        if (series) {
            await updateMutation.mutateAsync({ id: series.id, data });
        } else {
            await createMutation.mutateAsync(data);
        }
        onSuccess?.();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Series Name</Label>
                <Input
                    id="name"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="Enter series name"
                />
                {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Enter series description"
                    rows={4}
                />
            </div>

            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {series ? 'Update' : 'Create'} Series
            </Button>
        </form>
    );
};
```

### 4. Create SeriesDashboard Component
Similar to `StoryDashboard.tsx`:

```typescript
// src/features/series/pages/SeriesDashboard.tsx
import { useParams, Link, Outlet } from 'react-router-dom';
import { useSingleSeriesQuery } from '../hooks/useSeriesQuery';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const SeriesDashboard = () => {
    const { seriesId } = useParams<{ seriesId: string }>();
    const { data: series, isLoading } = useSingleSeriesQuery(seriesId);

    if (isLoading) return <div>Loading series...</div>;
    if (!series) return <div>Series not found</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">{series.name}</h1>
            {series.description && (
                <p className="text-muted-foreground mb-6">{series.description}</p>
            )}

            <Tabs defaultValue="stories" className="mb-6">
                <TabsList>
                    <TabsTrigger value="stories" asChild>
                        <Link to={`/series/${seriesId}/stories`}>Stories</Link>
                    </TabsTrigger>
                    <TabsTrigger value="lorebook" asChild>
                        <Link to={`/series/${seriesId}/lorebook`}>Lorebook</Link>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <Outlet />
        </div>
    );
};
```

### 5. Add Routes
Update routing configuration (e.g., `src/App.tsx` or routes file):

```typescript
// Add to router configuration
{
    path: '/series',
    element: <SeriesListPage />,
},
{
    path: '/series/:seriesId',
    element: <SeriesDashboard />,
    children: [
        {
            path: 'stories',
            element: <SeriesStoriesView />,  // To be created in next task
        },
        {
            path: 'lorebook',
            element: <SeriesLorebookView />,  // To be created in next task
        },
    ],
},
```

## Component Summary
After implementation:

**Pages:**
- `SeriesListPage` - List all series with create/delete
- `SeriesDashboard` - Series detail view with tabs

**Components:**
- `SeriesCard` - Card display for series
- `SeriesForm` - Create/edit series form

**Routes:**
- `/series` - Series list
- `/series/:seriesId/stories` - Stories in series
- `/series/:seriesId/lorebook` - Series lorebook

## Validation
- Series list displays all series
- Create series opens dialog, saves successfully
- Delete series shows confirmation, updates list
- Click series card navigates to dashboard
- Dashboard shows series name and description
- Tabs navigate between stories and lorebook views

## Notes
- Reuse shadcn/ui components for consistency
- Follow existing patterns from story components
- Stories and lorebook views will be implemented in separate tasks
- Add navigation link to series list in main nav/header
