import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSeriesQuery } from "@/features/series/hooks/useSeriesQuery";
import { useStoryQuery } from "@/features/stories/hooks/useStoriesQuery";
import type { LorebookEntry } from "@/types/story";
import { randomUUID } from "@/utils/crypto";
import { attemptPromise } from "@jfdi/attempt";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useCreateLorebookMutation, useUpdateLorebookMutation } from "../hooks/useLorebookQuery";
import { LevelBadge } from "./LevelBadge";

interface CreateEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storyId?: string;
    seriesId?: string;
    entry?: LorebookEntry;
    defaultCategory?: LorebookCategory;
}

type LorebookLevel = LorebookEntry["level"];

// Use the category type directly from the LorebookEntry interface
type LorebookCategory = LorebookEntry["category"];
const CATEGORIES: LorebookCategory[] = [
    "character",
    "location",
    "item",
    "event",
    "note",
    "synopsis",
    "starting scenario",
    "timeline"
];
const IMPORTANCE_LEVELS = ["major", "minor", "background"] as const;
const STATUS_OPTIONS = ["active", "inactive", "historical"] as const;

type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];
type StatusOption = (typeof STATUS_OPTIONS)[number];

export function CreateEntryDialog({
    open,
    onOpenChange,
    storyId,
    seriesId,
    entry,
    defaultCategory
}: CreateEntryDialogProps) {
    const createMutation = useCreateLorebookMutation();
    const updateMutation = useUpdateLorebookMutation();
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // Fetch story and series data
    const { data: story } = useStoryQuery(storyId || "");
    const { data: seriesList } = useSeriesQuery();

    // Determine default level based on context
    const defaultLevel: LorebookLevel = entry?.level || (seriesId ? "series" : "story");
    const defaultScopeId = entry?.scopeId || seriesId || storyId;

    // Level and scope state
    const [selectedLevel, setSelectedLevel] = useState<LorebookLevel>(defaultLevel);
    const [selectedScopeId, setSelectedScopeId] = useState<string | undefined>(defaultScopeId);

    // Initial form state in a separate constant for reuse
    const initialFormState = {
        name: "",
        description: "",
        category: defaultCategory || "character",
        tags: [],
        isDisabled: false,
        metadata: {
            importance: "minor" as const,
            status: "active" as const,
            type: "",
            relationships: [],
            customFields: {}
        }
    };

    const [formData, setFormData] = useState<Partial<LorebookEntry>>(
        entry
            ? {
                  name: entry.name,
                  description: entry.description,
                  category: entry.category,
                  tags: entry.tags,
                  isDisabled: entry.isDisabled,
                  metadata: entry.metadata
              }
            : initialFormState
    );

    const [tagInput, setTagInput] = useState(entry?.tags?.join(", ") ?? "");

    const resetForm = () => {
        setFormData(initialFormState);
        setTagInput("");
        setAdvancedOpen(false);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const [error] = await attemptPromise(async () => {
            const processedTags = tagInput
                .split(",")
                .map(tag => tag.trim())
                .filter(Boolean);

            const dataToSubmit = {
                ...formData,
                tags: processedTags,
                level: selectedLevel,
                scopeId: selectedLevel === "global" ? undefined : selectedScopeId
            };

            if (entry) {
                await updateMutation.mutateAsync({
                    id: entry.id,
                    data: dataToSubmit
                });
            } else {
                await createMutation.mutateAsync({
                    id: randomUUID(),
                    ...dataToSubmit,
                    storyId: storyId || selectedScopeId || ""
                } as Omit<LorebookEntry, "createdAt">);
                resetForm();
            }
            onOpenChange(false);
        });
        if (error) {
            // Error toast is already handled by the mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>
                        <div className="flex items-center gap-2">
                            {entry ? "Edit Entry" : "Create New Entry"}
                            {entry && <LevelBadge level={entry.level} />}
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Level Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="level">Level</Label>
                        <Select
                            value={selectedLevel}
                            onValueChange={(value: LorebookLevel) => {
                                setSelectedLevel(value);
                                // Reset scopeId when level changes
                                if (value === "global") setSelectedScopeId(undefined);
                                else if (value === "story") setSelectedScopeId(storyId);
                                else if (value === "series") setSelectedScopeId(story?.seriesId);
                            }}
                        >
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

                    {/* Series Selector */}
                    {selectedLevel === "series" && (
                        <div className="space-y-2">
                            <Label htmlFor="series">Series</Label>
                            <Select value={selectedScopeId || ""} onValueChange={setSelectedScopeId}>
                                <SelectTrigger id="series">
                                    <SelectValue placeholder="Select series" />
                                </SelectTrigger>
                                <SelectContent>
                                    {seriesList?.map(series => (
                                        <SelectItem key={series.id} value={series.id}>
                                            {series.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Story Selector (when not in story context) */}
                    {selectedLevel === "story" && !storyId && (
                        <div className="space-y-2">
                            <Label htmlFor="story-select">Story</Label>
                            <Input id="story-select" value={story?.title || ""} disabled placeholder="Current story" />
                        </div>
                    )}

                    {/* Story display (when in story context) */}
                    {selectedLevel === "story" && storyId && (
                        <div className="space-y-2">
                            <Label>Story</Label>
                            <div className="text-sm text-muted-foreground">
                                This entry will be created for the current story
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value: LorebookEntry["category"]) =>
                                    setFormData(prev => ({ ...prev, category: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(category => (
                                        <SelectItem key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="importance">Importance</Label>
                            <Select
                                value={formData.metadata?.importance}
                                onValueChange={(value: ImportanceLevel) =>
                                    setFormData(prev => ({
                                        ...prev,
                                        metadata: {
                                            ...prev.metadata,
                                            importance: value
                                        }
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select importance" />
                                </SelectTrigger>
                                <SelectContent>
                                    {IMPORTANCE_LEVELS.map(level => (
                                        <SelectItem key={level} value={level}>
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <div className="space-y-2">
                            <Input
                                id="tags"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                placeholder="Harry Potter, The Boy Who Lived, Quidditch Player"
                            />
                            <p className="text-sm text-muted-foreground">
                                Enter tags separated by commas. The entry name is automatically used as a tag. You can
                                use spaces and special characters in tags.
                            </p>
                        </div>
                    </div>

                    {/* Show current tags preview */}
                    {tagInput && (
                        <div className="flex flex-wrap gap-2">
                            {tagInput.split(",").map(
                                tag =>
                                    tag.trim() && (
                                        <Badge key={tag.trim()} variant="secondary" className="group">
                                            {tag.trim()}
                                        </Badge>
                                    )
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={e =>
                                setFormData(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))
                            }
                            rows={6}
                            required
                        />
                    </div>

                    {/* Advanced Section */}
                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="border rounded-md p-2">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex w-full justify-between p-2" type="button">
                                <span className="font-semibold">Advanced Settings</span>
                                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Type</Label>
                                    <Input
                                        id="type"
                                        value={formData.metadata?.type || ""}
                                        onChange={e =>
                                            setFormData(prev => ({
                                                ...prev,
                                                metadata: {
                                                    ...prev.metadata,
                                                    type: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="E.g., Protagonist, Villain, Capital City"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Specific type within the category (e.g., Protagonist, Villain, Capital City)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.metadata?.status || "active"}
                                        onValueChange={(value: StatusOption) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                metadata: {
                                                    ...prev.metadata,
                                                    status: value
                                                }
                                            }))
                                        }
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map(status => (
                                                <SelectItem key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Custom Fields</Label>
                                <div className="border rounded-md p-3 bg-muted/20">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Custom fields will be added in a future update. These will allow you to add any
                                        additional information specific to your lorebook entries.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="disabled"
                                    checked={formData.isDisabled || false}
                                    onCheckedChange={checked =>
                                        setFormData(prev => ({
                                            ...prev,
                                            isDisabled: checked
                                        }))
                                    }
                                />
                                <Label htmlFor="disabled">Disable this entry</Label>
                                <p className="text-xs text-muted-foreground ml-2">
                                    Disabled entries won't be matched in text or included in AI context
                                </p>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending
                                ? "Saving..."
                                : entry
                                  ? "Update"
                                  : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
