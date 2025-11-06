import { Library, BookOpen, Link as LinkIcon, Layers, FolderTree, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdvancedGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Advanced Features Guide</h2>
                <p className="text-muted-foreground mb-6">
                    Master advanced features including series management, hierarchical lorebooks, and workflow optimisation to take your writing to the next level.
                </p>
            </div>

            <Tabs defaultValue="series" className="w-full">
                <TabsList className="grid grid-cols-3 mb-8">
                    <TabsTrigger value="series">Series Management</TabsTrigger>
                    <TabsTrigger value="workflow">Workflow Tips</TabsTrigger>
                    <TabsTrigger value="future">Future Topics</TabsTrigger>
                </TabsList>

                <TabsContent value="series" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Working with Series</h3>
                        <p>
                            Series provide a powerful way to organise interconnected stories that share world-building, characters, or timelines. Understanding when and how to use series effectively can significantly improve your writing workflow.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        When to Use Series
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Multiple books in the same universe</li>
                                        <li>Sequels, prequels, or spin-offs</li>
                                        <li>Shared world with different protagonists</li>
                                        <li>Anthology stories with common elements</li>
                                        <li>Stories spanning a connected timeline</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <CheckCircle className="h-4 w-4 text-blue-500" />
                                        Benefits of Series
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Shared lorebook entries across all stories</li>
                                        <li>Consistent world-building automatically</li>
                                        <li>Organised dashboard for related works</li>
                                        <li>Easy navigation between connected stories</li>
                                        <li>Unified character and location management</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                        <h3 className="text-lg font-medium">Creating and Managing Series</h3>
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-medium text-sm mb-1">1. Creating a Series</h4>
                                <p className="text-sm text-muted-foreground ml-4">
                                    Navigate to the Series page from the home screen. Click "Create New Series" and provide a name and optional description. The description helps you remember what connects the stories in this series.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm mb-1">2. Adding Stories to a Series</h4>
                                <p className="text-sm text-muted-foreground ml-4">
                                    From the series dashboard, click "Create New Story". Stories created this way automatically belong to the series. You can also assign existing standalone stories to a series by editing the story's details.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm mb-1">3. Accessing Series Lorebook</h4>
                                <p className="text-sm text-muted-foreground ml-4">
                                    The series dashboard includes a Lorebook tab. Entries created at the series level are accessible to all stories in the series, perfect for recurring characters, shared locations, or universal world rules.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                        <h3 className="text-lg font-medium">Series Lorebook Strategy</h3>
                        <p>
                            Deciding what goes in the series lorebook versus individual story lorebooks is crucial for effective organisation.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <FolderTree className="h-4 w-4 text-primary" />
                                    <h5 className="font-medium text-sm">Global Level</h5>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">Use for:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                                    <li>Writing style guides</li>
                                    <li>Universal themes</li>
                                    <li>Cross-series concepts</li>
                                </ul>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers className="h-4 w-4 text-primary" />
                                    <h5 className="font-medium text-sm">Series Level</h5>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">Use for:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                                    <li>Recurring characters</li>
                                    <li>Shared locations</li>
                                    <li>Series-wide timeline</li>
                                    <li>Common lore/magic</li>
                                </ul>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    <h5 className="font-medium text-sm">Story Level</h5>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">Use for:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                                    <li>Story-unique characters</li>
                                    <li>Specific plot locations</li>
                                    <li>One-off items/events</li>
                                    <li>Story-specific notes</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-6 border rounded-lg bg-muted/30">
                        <h3 className="text-xl font-semibold mb-4">Series Best Practices</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-sm">Plan Your Hierarchy Early</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Before creating multiple stories, decide what elements should be shared across the series. Moving entries between levels later is possible but planning prevents reorganisation work.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-sm">Use Consistent Naming</h4>
                                        <p className="text-sm text-muted-foreground">
                                            If a character appears across multiple stories, use the same tags and naming in series-level entries. This ensures the AI recognises them consistently.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-sm">Update Series Entries as Stories Progress</h4>
                                        <p className="text-sm text-muted-foreground">
                                            When characters develop or world elements evolve across stories, update the series lorebook entries to reflect the current state. This keeps AI context accurate across all stories.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-sm">Consider Chronological Order</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Even if you're not writing in chronological order, note the timeline in series lorebook entries. This helps maintain continuity when jumping between different points in your story universe.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Alert className="mt-6">
                        <LinkIcon className="h-4 w-4" />
                        <AlertTitle>Converting Standalone Stories to Series</AlertTitle>
                        <AlertDescription>
                            If you start with a standalone story and later decide to create a series, simply create the series and edit your story to assign it to the series. Any story-level lorebook entries remain at the story level—you can manually promote shared elements to the series level as needed.
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                <TabsContent value="workflow" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Optimising Your Writing Workflow</h3>
                        <p>
                            Effective workflow habits help you make the most of The Story Nexus's features and maintain creative momentum.
                        </p>
                    </div>

                    <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                        <h3 className="text-lg font-medium">Lorebook-First Approach</h3>
                        <p className="text-sm">
                            Before diving into writing, spend time building your lorebook. This upfront investment pays dividends when the AI has rich context from the start.
                        </p>
                        <div className="bg-muted p-4 rounded-md mt-2">
                            <h4 className="font-medium text-sm mb-2">Recommended Workflow:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                <li>Create core character entries with personality, background, and goals</li>
                                <li>Define key locations with atmospheric details</li>
                                <li>Document your magic system, technology, or unique world rules</li>
                                <li>Add timeline entries for major historical events</li>
                                <li>Begin writing with confidence that the AI understands your world</li>
                            </ol>
                        </div>
                    </div>

                    <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                        <h3 className="text-lg font-medium">Chapter Planning with Notes and Outlines</h3>
                        <p className="text-sm">
                            Each chapter supports both notes and outlines. Use them to stay organised:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="border rounded-lg p-3 bg-card">
                                <h4 className="font-medium text-sm mb-1">Chapter Outlines</h4>
                                <p className="text-xs text-muted-foreground">
                                    Plan scene beats, plot points, and structure before writing. Refer back as you write to stay on track.
                                </p>
                            </div>
                            <div className="border rounded-lg p-3 bg-card">
                                <h4 className="font-medium text-sm mb-1">Chapter Notes</h4>
                                <p className="text-xs text-muted-foreground">
                                    Track character arcs, continuity details, or revision reminders. Notes persist alongside your chapter.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                        <h3 className="text-lg font-medium">Using Brainstorming Effectively</h3>
                        <p className="text-sm">
                            Don't wait until you're stuck to brainstorm. Proactive brainstorming prevents writer's block:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4 mt-2">
                            <li>Brainstorm upcoming plot points before reaching them</li>
                            <li>Explore character motivations when planning scenes</li>
                            <li>Test "what if" scenarios to find the most compelling direction</li>
                            <li>Use brainstorming to work through logic issues in your plot</li>
                        </ul>
                    </div>

                    <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                        <h3 className="text-lg font-medium">Summary Generation Strategy</h3>
                        <p className="text-sm">
                            Chapter summaries help the AI maintain continuity across your story. Generate summaries after completing each chapter:
                        </p>
                        <div className="bg-muted p-4 rounded-md mt-2">
                            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                <li>Write your chapter to completion</li>
                                <li>Use a "Generate Summary" prompt to create a concise summary</li>
                                <li>Review and edit the summary to emphasise key plot points</li>
                                <li>Save the summary—it automatically becomes context for future chapters</li>
                            </ol>
                        </div>
                    </div>

                    <Alert className="mt-6 bg-primary/10 border-primary">
                        <AlertTitle>Workflow Tip: Keyboard Shortcuts</AlertTitle>
                        <AlertDescription>
                            Master keyboard shortcuts to speed up your writing: Alt+S (Option+S on Mac) inserts Scene Beats directly in the editor without breaking your flow.
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                <TabsContent value="future" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Future Guide Topics</h3>
                        <p>
                            The following topics are planned for future guide updates:
                        </p>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Coming Soon</AlertTitle>
                        <AlertDescription>
                            These topics are under development. Check back for updates as new features are documented.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Export & Archiving</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>Exporting stories in multiple formats</li>
                                        <li>Backing up your work</li>
                                        <li>Archiving completed projects</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Advanced Editor Features</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>Custom keyboard shortcuts</li>
                                        <li>Editor customisation options</li>
                                        <li>Advanced formatting techniques</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">AI Model Optimisation</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>Choosing the right model for different tasks</li>
                                        <li>Understanding temperature and token settings</li>
                                        <li>Prompt engineering best practices</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Collaboration & Sharing</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>Sharing prompts and lorebooks</li>
                                        <li>Collaborative workflows (future feature)</li>
                                        <li>Community prompt libraries</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
} 