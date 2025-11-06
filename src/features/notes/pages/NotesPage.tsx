import type { Note } from "@/types/story";
import { useState } from "react";
import { useParams } from "react-router";
import NoteEditor from "../components/NoteEditor";
import NoteList from "../components/NoteList";

export default function NotesPage() {
    const { storyId } = useParams();
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

    if (!storyId) return <div>Story ID is required</div>;

    const handleSelectNote = (note: Note | null) => {
        setSelectedNoteId(note?.id || null);
    };

    return (
        <div className="h-full flex">
            <NoteList storyId={storyId} selectedNoteId={selectedNoteId} onSelectNote={handleSelectNote} />
            <div className="flex-1">
                <NoteEditor selectedNoteId={selectedNoteId} />
            </div>
        </div>
    );
}
