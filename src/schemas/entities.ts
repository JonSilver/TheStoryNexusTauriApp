import { z } from 'zod';

// Base schema for common fields
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  isDemo: z.boolean().optional(),
});

// POV Type enum
const povTypeSchema = z.enum(['First Person', 'Third Person Limited', 'Third Person Omniscient']);

// Story schema
export const storySchema = baseEntitySchema.extend({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  language: z.string().min(1, 'Language is required'),
  synopsis: z.string().optional(),
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

export const chapterSchema = baseEntitySchema.extend({
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

// SceneBeat schema
export const sceneBeatSchema = baseEntitySchema.extend({
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

// AI Chat schema
export const aiChatSchema = baseEntitySchema.extend({
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

export const promptSchema = baseEntitySchema.extend({
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

// Note schema
export const noteSchema = baseEntitySchema.extend({
  storyId: z.string().uuid(),
  title: z.string().min(1, 'Note title is required'),
  content: z.string(),
  type: z.enum(['idea', 'research', 'todo', 'other']),
  updatedAt: z.coerce.date(),
});

// Lorebook entry schema
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

export const lorebookEntrySchema = baseEntitySchema.extend({
  storyId: z.string().uuid(),
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
});

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
