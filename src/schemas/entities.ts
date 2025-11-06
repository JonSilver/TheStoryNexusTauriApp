import { z } from 'zod';

// Helper for safe JSON parsing with Zod validation
export const parseJSON = <T extends z.ZodTypeAny>(
  schema: T,
  jsonString: string
): z.SafeParseReturnType<z.input<T>, z.output<T>> => {
  try {
    const parsed = JSON.parse(jsonString);
    return schema.safeParse(parsed);
  } catch (error) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: error instanceof Error ? error.message : 'Invalid JSON',
        },
      ]),
    };
  }
};

// Helper for localStorage with Zod validation
export const parseLocalStorage = <T extends z.ZodTypeAny>(
  schema: T,
  key: string,
  defaultValue: z.output<T>
): z.output<T> => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;

  const result = parseJSON(schema, stored);
  return result.success ? result.data : defaultValue;
};

// Base schema for common fields
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  isDemo: z.boolean().optional(),
});

// POV Type enum
const povTypeSchema = z.enum(['First Person', 'Third Person Limited', 'Third Person Omniscient']);

// Story schema (used internally for export validation)
const storySchema = baseEntitySchema.extend({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  language: z.string().min(1, 'Language is required'),
  synopsis: z.string().optional(),
  seriesId: z.string().uuid().optional(),
});

// Series schema
const seriesSchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
});

// Chapter schemas
const chapterOutlineSchema = z.object({
  content: z.string(),
  lastUpdated: z.coerce.date(),
});

const chapterNotesSchema = z.object({
  content: z.string(),
  lastUpdated: z.coerce.date(),
});

const chapterSchema = baseEntitySchema.extend({
  storyId: z.string().uuid(),
  title: z.string().min(1, 'Chapter title is required'),
  summary: z.string().optional(),
  order: z.number().int().nonnegative(),
  content: z.string(),
  outline: chapterOutlineSchema.optional(),
  wordCount: z.number().int().nonnegative(),
  povCharacter: z.string().optional(),
  povType: povTypeSchema.optional(),
  notes: chapterNotesSchema.optional(),
});

// SceneBeat schema (used internally for export validation)
const sceneBeatSchema = baseEntitySchema.extend({
  storyId: z.string().uuid(),
  chapterId: z.string().uuid(),
  command: z.string(),
  povType: povTypeSchema.optional(),
  povCharacter: z.string().optional(),
  generatedContent: z.string().optional(),
  accepted: z.boolean().optional(),
  metadata: z.object({
    useMatchedChapter: z.boolean().optional(),
    useMatchedSceneBeat: z.boolean().optional(),
    useCustomContext: z.boolean().optional(),
  }).catchall(z.unknown()).optional(),
});

// Chat message schema
const chatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.coerce.date(),
  originalContent: z.string().optional(),
  editedAt: z.string().optional(),
  editedBy: z.string().optional(),
  edited: z.boolean().optional(),
});

// AI Chat schema (used internally for export validation)
const aiChatSchema = baseEntitySchema.extend({
  storyId: z.string().uuid(),
  title: z.string().min(1, 'Chat title is required'),
  messages: z.array(chatMessageSchema),
  updatedAt: z.coerce.date().optional(),
});

// Prompt schemas
const promptMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const aiProviderSchema = z.enum(['openai', 'openrouter', 'local']);

const allowedModelSchema = z.object({
  id: z.string(),
  provider: aiProviderSchema,
  name: z.string(),
});

const promptSchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Prompt name is required'),
  description: z.string().optional(),
  promptType: z.enum(['scene_beat', 'gen_summary', 'selection_specific', 'continue_writing', 'other', 'brainstorm']),
  messages: z.array(promptMessageSchema).min(1, 'At least one message is required'),
  allowedModels: z.array(allowedModelSchema),
  storyId: z.string().uuid().optional(),
  isSystem: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().nonnegative().optional(),
  repetition_penalty: z.number().nonnegative().optional(),
  min_p: z.number().min(0).max(1).optional(),
});

// Lorebook entry schema (used internally for export validation)
const lorebookLevelSchema = z.enum(['global', 'series', 'story']);

const lorebookCategorySchema = z.enum([
  'character',
  'location',
  'item',
  'event',
  'note',
  'synopsis',
  'starting scenario',
  'timeline',
]);

const relationshipSchema = z.object({
  targetId: z.string(),
  type: z.string(),
  description: z.string().optional(),
});

const lorebookEntrySchema = baseEntitySchema.extend({
  level: lorebookLevelSchema,
  scopeId: z.string().uuid().optional(),
  name: z.string().min(1, 'Entry name is required'),
  description: z.string(),
  category: lorebookCategorySchema,
  tags: z.array(z.string()),
  metadata: z.object({
    type: z.string().optional(),
    importance: z.enum(['major', 'minor', 'background']).optional(),
    status: z.enum(['active', 'inactive', 'historical']).optional(),
    relationships: z.array(relationshipSchema).optional(),
    customFields: z.record(z.unknown()).optional(),
  }).optional(),
  isDisabled: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.level === 'global') return !data.scopeId;
    return !!data.scopeId;
  },
  { message: 'scopeId required for series/story level, forbidden for global level' }
);

// Export schemas for import/export validation
export const promptsExportSchema = z.object({
  version: z.string(),
  type: z.literal('prompts'),
  prompts: z.array(promptSchema),
});

export const lorebookExportSchema = z.object({
  version: z.string(),
  type: z.literal('lorebook'),
  entries: z.array(lorebookEntrySchema),
});

// Story export schema
export const storyExportSchema = z.object({
  version: z.string(),
  type: z.literal('story'),
  exportDate: z.string(),
  story: storySchema,
  series: seriesSchema.optional(),
  chapters: z.array(chapterSchema),
  lorebookEntries: z.array(lorebookEntrySchema),
  sceneBeats: z.array(sceneBeatSchema),
  aiChats: z.array(aiChatSchema),
});

// AI Model schema
const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: aiProviderSchema,
});

// AI Settings schema
export const aiSettingsSchema = baseEntitySchema.extend({
  openaiKey: z.string().optional(),
  openrouterKey: z.string().optional(),
  availableModels: z.array(aiModelSchema),
  lastModelsFetch: z.coerce.date().optional(),
  localApiUrl: z.string().optional(),
  defaultLocalModel: z.string().optional(),
  defaultOpenAIModel: z.string().optional(),
  defaultOpenRouterModel: z.string().optional(),
});
