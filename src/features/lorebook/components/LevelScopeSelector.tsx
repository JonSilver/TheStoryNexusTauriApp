import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSeriesQuery } from '@/features/series/hooks/useSeriesQuery';
import { useStoriesQuery } from '@/features/stories/hooks/useStoriesQuery';
import type { LorebookLevel } from '@/types/story';

interface LevelScopeSelectorProps {
    level: LorebookLevel;
    onLevelChange: (level: LorebookLevel) => void;
    scopeId?: string;
    onScopeIdChange: (scopeId: string | undefined) => void;
}

export const LevelScopeSelector = ({
    level,
    onLevelChange,
    scopeId,
    onScopeIdChange,
}: LevelScopeSelectorProps) => {
    const { data: seriesList } = useSeriesQuery();
    const { data: storiesList } = useStoriesQuery();

    return (
        <div className="flex gap-4 items-end">
            <div className="flex-1">
                <Label htmlFor="level">Level</Label>
                <Select value={level} onValueChange={(v) => onLevelChange(v as LorebookLevel)}>
                    <SelectTrigger id="level">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="series">Series</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {level === 'series' && (
                <div className="flex-1">
                    <Label htmlFor="series">Series</Label>
                    <Select value={scopeId || ''} onValueChange={onScopeIdChange}>
                        <SelectTrigger id="series">
                            <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent>
                            {seriesList?.map((series) => (
                                <SelectItem key={series.id} value={series.id}>
                                    {series.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {level === 'story' && (
                <div className="flex-1">
                    <Label htmlFor="story">Story</Label>
                    <Select value={scopeId || ''} onValueChange={onScopeIdChange}>
                        <SelectTrigger id="story">
                            <SelectValue placeholder="Select story" />
                        </SelectTrigger>
                        <SelectContent>
                            {storiesList?.map((story) => (
                                <SelectItem key={story.id} value={story.id}>
                                    {story.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
};
