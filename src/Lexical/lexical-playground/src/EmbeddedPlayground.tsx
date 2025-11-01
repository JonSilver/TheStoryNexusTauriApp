import { useStoryContext } from '@/features/stories/context/StoryContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import PlaygroundApp from './App' // using the lexical playground App component
import './index.css' // Ensure the CSS is imported

interface EmbeddedPlaygroundProps {
    maximizeButton?: ReactNode;
}

const EditorErrorFallback = (error: Error, resetError: () => void) => (
    <div className="flex items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Editor Error</AlertTitle>
            <AlertDescription className="mt-2">
                <p className="mb-4">The editor encountered an error: {error.message}</p>
                <div className="flex gap-2">
                    <Button onClick={resetError} variant="outline" size="sm">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Reset Editor
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                    >
                        Reload Page
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    </div>
);

export default function EmbeddedPlayground({ maximizeButton }: EmbeddedPlaygroundProps) {
    const { currentChapterId } = useStoryContext();
    const { currentChapter } = useChapterStore();

    // Note: getChapter is called by LoadChapterContentPlugin, no need to duplicate here

    if (!currentChapterId || !currentChapter) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a chapter to start editing</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">{currentChapter.title}</h2>
                {maximizeButton}
            </div>
            <div className="flex-1 overflow-auto">
                <ErrorBoundary fallback={EditorErrorFallback} resetKeys={[currentChapterId]}>
                    <PlaygroundApp />
                </ErrorBoundary>
            </div>
        </div>
    );
}
