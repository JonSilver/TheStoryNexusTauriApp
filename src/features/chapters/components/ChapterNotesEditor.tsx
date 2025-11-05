import { useEffect, useState, useCallback } from 'react';
import { useUpdateChapterMutation } from '../hooks/useChaptersQuery';
import Editor from 'react-simple-wysiwyg';
import { cn } from '@/lib/utils';
import type { Chapter, ChapterNotes } from '@/types/story';
import debounce from 'lodash/debounce';

interface ChapterNotesEditorProps {
    chapter: Chapter;
    onClose: () => void;
}

export function ChapterNotesEditor({ chapter, onClose: _onClose }: ChapterNotesEditorProps) {
    const updateChapterMutation = useUpdateChapterMutation();
    const [content, setContent] = useState('');
    const [lastSavedContent, setLastSavedContent] = useState('');

    // Create a debounced save function
    const debouncedSave = useCallback(
        debounce(async (newContent: string) => {
            if (!chapter) return;

            const notes: ChapterNotes = {
                content: newContent,
                lastUpdated: new Date()
            };

            updateChapterMutation.mutate({
                id: chapter.id,
                data: { notes }
            }, {
                onSuccess: () => {
                    setLastSavedContent(newContent);
                },
            });
        }, 1000),
        [chapter]
    );

    useEffect(() => {
        if (chapter?.notes) {
            setContent(chapter.notes.content);
            setLastSavedContent(chapter.notes.content);
        } else {
            setContent('');
            setLastSavedContent('');
        }
    }, [chapter]);

    useEffect(() => {
        if (content !== lastSavedContent) {
            debouncedSave(content);
        }
    }, [content, lastSavedContent, debouncedSave]);

    useEffect(() => {
        return () => {
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    return (
        <div className="space-y-4">
            <div>
                {chapter?.notes && (
                    <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(chapter.notes.lastUpdated).toLocaleString()}
                    </p>
                )}
            </div>
            <Editor
                value={content}
                onChange={(e) => setContent(e.target.value)}
                containerProps={{
                    style: { height: '82vh' },
                    className: cn(
                        "prose prose-sm max-w-none",
                        "dark:prose-invert"
                    )
                }}
                style={{ height: '100%', overflow: 'auto' }}
            />
        </div>
    );
} 