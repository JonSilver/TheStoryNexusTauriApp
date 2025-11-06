import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import Editor from "react-simple-wysiwyg";
import { useNoteQuery, useUpdateNoteMutation } from "../hooks/useNotesQuery";

interface NoteEditorProps {
    selectedNoteId: string | null;
}

export default function NoteEditor({ selectedNoteId }: NoteEditorProps) {
    const { data: selectedNote } = useNoteQuery(selectedNoteId || "");
    const updateNoteMutation = useUpdateNoteMutation();
    const [content, setContent] = useState("");

    useEffect(() => {
        if (selectedNote) setContent(selectedNote.content);
        else setContent("");
    }, [selectedNote]);

    const handleSave = async () => {
        if (!selectedNote) return;

        await updateNoteMutation.mutateAsync({
            id: selectedNote.id,
            data: { content }
        });
    };

    if (!selectedNoteId || !selectedNote) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Select a note to start editing</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="border-b border-input p-4 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-foreground">{selectedNote.title}</h2>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={updateNoteMutation.isPending}
                    className="flex items-center gap-2"
                >
                    <Save className="h-4 w-4" />
                    Save
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <Editor
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    containerProps={{
                        className: cn("prose prose-sm max-w-none min-h-full", "dark:prose-invert", "overflow-y-auto")
                    }}
                    className="h-full"
                />
            </div>
        </div>
    );
}
