# Refactoring Opportunities Analysis

**Date**: 2025-10-31
**Analyst**: Claude Code
**Codebase**: The Story Nexus Tauri App
**Version**: 0.2.0

---

## Executive Summary

This report identifies refactoring opportunities in The Story Nexus codebase through three categories:

1. **Functions/components replaceable by existing dependencies** - Unnecessary abstractions and utilities that duplicate functionality already available
2. **Repetitive patterns requiring abstraction** - Code duplication across services and stores that could be consolidated
3. **Areas benefiting from well-tested external libraries** - Manual implementations that would benefit from battle-tested, maintained libraries

The analysis examined 48+ source files across services, stores, utilities, and feature modules, identifying significant opportunities for code consolidation, better dependency utilisation, and improved maintainability.

---

## 1. Functions Replaceable by Existing Dependencies

### 1.1 ID Generator Utilities (HIGH PRIORITY)

**Location**: `src/utils/idGenerator.ts`

**Issue**: Entire 9-line file is unnecessary wrapper functions around `crypto.randomUUID()`.

```typescript
// Current implementation
const generateId = (): string => crypto.randomUUID();

export const generateStoryId = (): string => generateId();
export const generateChapterId = (): string => generateId();
export const generateLorebookEntryId = (): string => generateId();
export const generateChatId = (): string => generateId();
export const generateNoteId = (): string => generateId();
export const generatePromptId = (): string => generateId();
```

**Recommendation**:
- **Option A**: Remove file entirely, use `crypto.randomUUID()` directly at call sites
- **Option B**: Keep single `generateId()` export, remove entity-specific wrappers

**Impact**: 74 imports across codebase, but straightforward find-replace refactor.

---

### 1.2 Lorebook Category Filter Methods (MEDIUM PRIORITY)

**Location**: `src/features/lorebook/stores/LorebookFilterService.ts:27-57`

**Issue**: Eight nearly-identical filter methods that only differ by category string parameter.

```typescript
// Current implementation - 8 methods, lines 27-57
static getAllCharacters(entries: LorebookEntry[]): LorebookEntry[] {
    return this.getEntriesByCategory(entries, 'character');
}

static getAllLocations(entries: LorebookEntry[]): LorebookEntry[] {
    return this.getEntriesByCategory(entries, 'location');
}
// ... 6 more identical patterns
```

**Recommendation**:
- **Option A**: Remove wrapper methods, call `getEntriesByCategory(entries, category)` directly
- **Option B**: Use lodash groupBy/filter (already in dependencies) for more powerful filtering

**Alternative using lodash**:
```typescript
import { groupBy, filter } from 'lodash';

// Single call replaces 8 methods
const grouped = groupBy(
    filter(entries, e => !e.isDisabled),
    'category'
);
const characters = grouped.character || [];
```

**Impact**: These methods are heavily used across lorebook feature and prompt resolvers. Refactor requires careful migration.

---

### 1.3 Stream Wrapping Code Duplication (HIGH PRIORITY)

**Location**:
- `src/services/ai/providers/OpenAIProvider.ts:66-85`
- `src/services/ai/providers/OpenRouterProvider.ts:100-119`

**Issue**: Identical 20-line stream generation code duplicated across both providers.

```typescript
// DUPLICATED in both files
return new Response(
    new ReadableStream({
        async start(controller) {
            const [error] = await attemptPromise(async () => {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        controller.enqueue(new TextEncoder().encode(content));
                    }
                }
            });

            if (error) {
                controller.error(error);
            } else {
                controller.close();
            }
        }
    })
);
```

**Recommendation**: Extract to shared utility function in `IAIProvider` or new `streamUtils.ts`.

```typescript
// Proposed: src/services/ai/streamUtils.ts
export const wrapOpenAIStream = async (
    stream: AsyncIterable<any>
): Promise<Response> => {
    return new Response(
        new ReadableStream({
            async start(controller) {
                const [error] = await attemptPromise(async () => {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                });

                if (error) {
                    controller.error(error);
                } else {
                    controller.close();
                }
            }
        })
    );
};
```

**Impact**: Immediate 20-line reduction per provider, better maintainability.

---

### 1.4 Console Logging vs Logger Utility (MEDIUM PRIORITY)

**Location**: 48 files across codebase

**Issue**: Despite having structured logger utility (`src/utils/logger.ts`), 180 direct `console.log/error/warn` calls remain throughout codebase.

**Files with most violations**:
- `src/features/prompts/services/resolvers/BrainstormResolvers.ts`: 13 instances
- `src/features/chapters/stores/useChapterMetadataStore.ts`: 10 instances
- `src/services/dbSeed.ts`: 14 instances
- `src/features/ai/pages/AISettingsPage.tsx`: 20 instances

**Recommendation**: Enforce logger usage via ESLint rule, migrate console calls to logger methods.

```typescript
// Instead of:
console.log('[OpenAIProvider] Fetching models');
console.error('[OpenAIProvider] Error fetching models:', error);

// Use:
import { logger } from '@/utils/logger';
logger.info('[OpenAIProvider] Fetching models');
logger.error('[OpenAIProvider] Error fetching models', error);
```

**Recommendation**: Replace with `loglevel` library.

**Why loglevel**:
- Industry-standard logging library (8K+ GitHub stars, 13M+ weekly downloads)
- Minimal API surface - drop-in replacement for console
- Runtime log level control (suppress debug logs in production)
- Plugin system for custom output handling
- TypeScript support
- Only 2KB minified

```typescript
// src/utils/logger.ts - Replace with loglevel
import log from 'loglevel';

// Configure once at app startup
if (import.meta.env.PROD) {
    log.setLevel('warn');  // Production: only warnings and errors
} else {
    log.setLevel('debug'); // Development: all logs
}

export const logger = log;

// Usage - identical API to current logger
logger.info('[OpenAIProvider] Fetching models');
logger.error('[OpenAIProvider] Error fetching models', error);
logger.debug('Detailed debug info', { context });

// Runtime control (useful for debugging production issues)
logger.setLevel('debug');  // Enable debug logs temporarily
```

**Additional capabilities**:
```typescript
// Per-module log levels
const editorLogger = log.getLogger('editor');
editorLogger.setLevel('debug');

const dbLogger = log.getLogger('database');
dbLogger.setLevel('warn');

// Custom plugins for remote logging
import loglevel from 'loglevel';
import remote from 'loglevel-plugin-remote';

remote.apply(loglevel, {
    url: '/api/logs',  // Send errors to backend
    level: 'error'
});
```

**Installation**:
```bash
npm install loglevel
npm install --save-dev @types/loglevel
```

**Impact**: Better control over logging, production-ready, extensible for future needs (analytics, error reporting).

---

## 2. Repetitive Patterns Requiring Abstraction

### 2.1 CRUD Store Pattern Duplication (HIGH PRIORITY)

**Location**: 8 Zustand stores across `src/features/*/stores/`

**Issue**: Every store follows identical pattern for CRUD operations:

```typescript
// Pattern repeated in:
// - useStoryStore.ts (177 lines)
// - useChapterDataStore.ts
// - useLorebookDataStore.ts
// - useBrainstormStore.ts
// - useNotesStore.ts
// - promptStore.ts

fetchEntities: async () => {
    set({ loading: true, error: null });

    const [error, entities] = await attemptPromise(() => db.table.toArray());

    if (error) {
        set({
            error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('entities')),
            loading: false
        });
        return;
    }

    set({ entities, loading: false });
}
```

**Recommendation**: Create generic CRUD store factory or reusable custom hooks.

**Proposed implementation**:
```typescript
// src/utils/createCRUDStore.ts
import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';

interface CRUDStoreConfig<T> {
    table: any; // Dexie table
    entityName: string;
    generateId: () => string;
}

export const createCRUDStore = <T extends { id: string }>({
    table,
    entityName,
    generateId
}: CRUDStoreConfig<T>) => {
    return create<CRUDStore<T>>((set) => ({
        items: [],
        loading: false,
        error: null,

        fetchAll: async () => {
            set({ loading: true, error: null });
            const [error, items] = await attemptPromise(() => table.toArray());

            if (error) {
                set({
                    error: formatError(error, ERROR_MESSAGES.FETCH_FAILED(entityName)),
                    loading: false
                });
                return;
            }

            set({ items, loading: false });
        },

        create: async (data: Omit<T, 'id' | 'createdAt'>) => {
            set({ loading: true, error: null });

            const item = {
                ...data,
                id: generateId(),
                createdAt: new Date()
            } as T;

            const [error] = await attemptPromise(() => table.add(item));

            if (error) {
                set({
                    error: formatError(error, ERROR_MESSAGES.CREATE_FAILED(entityName)),
                    loading: false
                });
                throw error;
            }

            set(state => ({
                items: [...state.items, item],
                loading: false
            }));

            return item.id;
        },

        // ... update, delete, etc.
    }));
};

// Usage:
export const useStoryStore = createCRUDStore({
    table: db.stories,
    entityName: 'story',
    generateId: () => crypto.randomUUID()
});
```

**Impact**:
- Reduces ~150 lines per store (8 stores = ~1,200 lines saved)
- Enforces consistency
- Single source of truth for CRUD error handling

---

### 2.2 Lexical Text Extraction Duplication (HIGH PRIORITY)

**Location**:
- `src/utils/exportUtils.ts:22-51` (extractPlainTextFromLexical)
- `src/features/chapters/stores/useChapterContentStore.ts:49-88` (extractPlainTextFromLexicalState)

**Issue**: Two different implementations doing similar recursive tree-walking to extract plain text from Lexical JSON. They handle different edge cases:

| Feature | exportUtils | useChapterContentStore |
|---------|-------------|----------------------|
| Handles linebreak nodes | ❌ | ✅ |
| Handles scene-beat nodes | ❌ | ✅ |
| Multiple newline cleanup | ❌ | ✅ |
| Paragraph spacing | Double newline | Single newline |

**Recommendation**: Unify into single, comprehensive implementation that handles all node types.

**Proposed location**: `src/utils/lexicalUtils.ts`

```typescript
interface LexicalTextExtractionOptions {
    paragraphSpacing: '\n' | '\n\n';
    excludeNodeTypes?: string[];
    cleanupMultipleNewlines?: boolean;
}

export const extractPlainTextFromLexical = (
    jsonContent: string,
    options: Partial<LexicalTextExtractionOptions> = {}
): string => {
    const opts: LexicalTextExtractionOptions = {
        paragraphSpacing: '\n\n',
        excludeNodeTypes: ['scene-beat'],
        cleanupMultipleNewlines: true,
        ...options
    };

    const [parseError, editorState] = attempt(() => JSON.parse(jsonContent));
    if (parseError) return '';

    const extractText = (node: any): string => {
        if (!node) return '';

        if (opts.excludeNodeTypes?.includes(node.type)) {
            return '';
        }

        if (node.type === 'text') {
            return node.text || '';
        }

        if (node.type === 'linebreak') {
            return '\n';
        }

        const childrenText = Array.isArray(node.children)
            ? node.children.map(extractText).join('')
            : '';

        const lineBreak = (node.type === 'paragraph' || node.type === 'heading')
            ? opts.paragraphSpacing
            : '';

        return childrenText + lineBreak;
    };

    const rawText = extractText(editorState.root);

    return opts.cleanupMultipleNewlines
        ? rawText.replace(/\n{3,}/g, '\n\n').trim()
        : rawText.trim();
};
```

**Impact**:
- Single implementation used by export utils, content store, and future features
- Consistent text extraction behaviour
- Configurable for different use cases

---

### 2.3 String Normalization Pattern (MEDIUM PRIORITY)

**Location**: 7+ occurrences across lorebook and search features

**Issue**: Pattern `.toLowerCase().trim()` repeated throughout codebase.

```typescript
// Examples from LorebookFilterService.ts
const normalizedTag = tag.toLowerCase().trim();  // line 16
const normalizedName = entry.name.toLowerCase().trim();  // line 102
const normalizedTag = tag.toLowerCase().trim();  // line 106

// Examples from BrainstormResolvers.ts
const normalizedInput = input.toLowerCase().trim();
```

**Recommendation**: Extract to utility function.

```typescript
// src/utils/stringUtils.ts
export const normalizeForComparison = (str: string): string => {
    return str.toLowerCase().trim();
};

// Optional: More robust normalization
export const normalizeAdvanced = (str: string): string => {
    return str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')  // Collapse multiple spaces
        .normalize('NFD')       // Unicode normalization
        .replace(/[\u0300-\u036f]/g, '');  // Remove diacritics
};
```

**Impact**: Small but improves maintainability, enables future enhancement (e.g., diacritic handling for international text).

---

### 2.4 Import/Export JSON Pattern Duplication (MEDIUM PRIORITY)

**Location**:
- `src/features/lorebook/stores/LorebookImportExportService.ts` (72 lines)
- `src/features/prompts/store/promptStore.ts` (exportPrompts, importPrompts methods)

**Issue**: Both services follow nearly identical pattern:

```typescript
// Export: Stringify → Blob → Download
const json = JSON.stringify(data, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();
URL.revokeObjectURL(url);

// Import: Parse → Validate → DB Write
const [parseError, data] = attempt(() => JSON.parse(jsonString));
if (parseError) throw new Error('Invalid JSON');

// Validate structure
if (!data.version || !data.type || !Array.isArray(data.items)) {
    throw new Error('Invalid format');
}

// Write to DB
await db.table.bulkAdd(processedItems);
```

**Recommendation**: Create generic import/export utility.

```typescript
// src/utils/importExportUtils.ts
interface ExportConfig<T> {
    data: T[];
    filename: string;
    type: string;
    version: string;
}

interface ImportConfig<T> {
    jsonData: string;
    type: string;
    validator: (item: any) => item is T;
    processor?: (item: T) => T;
}

export const exportToJSON = <T>({
    data,
    filename,
    type,
    version
}: ExportConfig<T>): void => {
    const exportData = {
        version,
        type,
        [type]: data,
        exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

export const importFromJSON = <T>({
    jsonData,
    type,
    validator,
    processor = (item) => item
}: ImportConfig<T>): T[] => {
    const [parseError, data] = attempt(() => JSON.parse(jsonData));

    if (parseError) {
        throw new Error('Invalid JSON format');
    }

    if (data.type !== type) {
        throw new Error(`Expected type "${type}", got "${data.type}"`);
    }

    const items = data[type];
    if (!Array.isArray(items)) {
        throw new Error(`Expected array of ${type}`);
    }

    // Validate each item
    const validItems = items.filter(validator);
    if (validItems.length !== items.length) {
        console.warn(`Filtered ${items.length - validItems.length} invalid items`);
    }

    return validItems.map(processor);
};
```

**Impact**: DRY principle, consistent import/export UX, easier to add new import/export features.

---

### 2.5 Fetch-After-Update Pattern (LOW PRIORITY)

**Location**: Every CRUD store operation

**Issue**: After every update/delete operation, code fetches full updated entity from database:

```typescript
// Pattern in every update method
const [updateError] = await attemptPromise(() => db.table.update(id, data));

if (updateError) {
    // handle error
}

// THEN fetch the updated entity
const [getError, updatedEntity] = await attemptPromise(() => db.table.get(id));

if (getError || !updatedEntity) {
    // handle error
}

set(state => ({
    items: state.items.map(item =>
        item.id === id ? updatedEntity : item
    )
}));
```

**Recommendation**:
- **Option A**: Trust local state update (optimistic update pattern)
- **Option B**: Use Dexie's transaction hooks or observe() for reactive updates
- **Option C**: If CRUD factory (recommendation 2.1) is implemented, this becomes moot

**Impact**: Minor performance improvement, reduced database round-trips.

---

## 3. Areas Benefiting from Well-Tested External Libraries

### 3.1 Validation with Zod (HIGH PRIORITY)

**Location**:
- `src/features/prompts/store/promptStore.ts:36-44` (validatePromptData)
- `src/features/lorebook/stores/LorebookImportExportService.ts` (manual validation)
- Import/export validation across features

**Current Status**: **Zod is already in dependencies (`package.json:68`)** but not used!

**Issue**: Manual validation logic that's error-prone and verbose:

```typescript
// Current manual validation (promptStore.ts:36-44)
validatePromptData: (messages) => {
    return messages.every(msg =>
        typeof msg === 'object' &&
        ('role' in msg) &&
        ('content' in msg) &&
        ['system', 'user', 'assistant'].includes(msg.role) &&
        typeof msg.content === 'string'
    );
}
```

**Recommendation**: Use Zod schemas throughout application for type-safe validation.

```typescript
// src/schemas/promptSchemas.ts
import { z } from 'zod';

export const PromptMessageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
});

export const PromptSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    messages: z.array(PromptMessageSchema),
    temperature: z.number().min(0).max(2).default(1.0),
    maxTokens: z.number().int().positive().default(4096),
    top_p: z.number().min(0).max(1).default(1.0),
    top_k: z.number().int().positive().default(50),
    repetition_penalty: z.number().min(0).max(2).default(1.0),
    min_p: z.number().min(0).max(1).default(0.0),
    createdAt: z.date(),
    isSystem: z.boolean().optional()
});

export const PromptExportSchema = z.object({
    version: z.string(),
    type: z.literal('prompts'),
    prompts: z.array(PromptSchema)
});

// Usage in store
validatePromptData: (messages) => {
    const result = z.array(PromptMessageSchema).safeParse(messages);
    return result.success;
}

// Better: Get detailed errors
importPrompts: async (jsonData: string) => {
    const parsed = JSON.parse(jsonData);
    const result = PromptExportSchema.safeParse(parsed);

    if (!result.success) {
        throw new Error(
            `Validation failed: ${result.error.issues.map(i => i.message).join(', ')}`
        );
    }

    // Type-safe from here
    const prompts = result.data.prompts;
    // ...
}
```

**Impact**:
- Type-safe validation with detailed error messages
- Runtime type checking that mirrors TypeScript types
- Automatic type inference from schemas
- Better error messages for users

**Files to migrate**:
- All import/export validation
- API response validation (AI provider responses)
- Form validation
- Database input validation

---

### 3.2 Date/Time Handling with date-fns (MEDIUM PRIORITY)

**Location**: 39 `new Date()` calls across 16 files

**Current Status**: No date utility library in dependencies

**Issue**: Manual date handling leads to inconsistent formatting and timezone issues:

```typescript
// Examples throughout codebase
createdAt: new Date()
exportedAt: new Date().toISOString()
lastModified: new Date()

// Sorting by date
chapters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
```

**Recommendation**: Add `date-fns` (lightweight, tree-shakeable, functional) or `dayjs` (smaller, moment-like API).

**Comparison**:

| Library | Size | Tree-shakeable | API Style | TypeScript |
|---------|------|----------------|-----------|------------|
| date-fns | ~13KB (individual functions) | ✅ Yes | Functional | ✅ Excellent |
| dayjs | ~7KB | ⚠️ Partial | Chainable | ✅ Good |

**Recommendation**: **date-fns** for functional programming preference stated in CLAUDE.md.

```typescript
// src/utils/dateUtils.ts
import { format, formatDistance, parseISO, compareDesc } from 'date-fns';

export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
};

export const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy HH:mm');
};

export const formatRelative = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(d, new Date(), { addSuffix: true });
};

export const sortByDateDesc = <T extends { createdAt: Date | string }>(
    items: T[]
): T[] => {
    return [...items].sort((a, b) => {
        const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt) : a.createdAt;
        const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt) : b.createdAt;
        return compareDesc(dateA, dateB);
    });
};

// Usage
const formattedDate = formatDate(story.createdAt);  // "31 Oct 2025"
const relative = formatRelative(story.updatedAt);  // "2 hours ago"
const sorted = sortByDateDesc(stories);
```

**Installation**:
```bash
npm install date-fns
```

**Impact**:
- Consistent date formatting throughout app
- Timezone-safe operations
- Human-readable relative dates ("2 hours ago")
- Tree-shakeable - only import functions you use

---

### 3.3 File Downloads with file-saver (LOW PRIORITY)

**Location**:
- `src/utils/exportUtils.ts:97-108` (downloadAsFile)
- `src/services/export/FileDownloadUtil.ts`

**Issue**: Manual blob URL creation works but lacks cross-browser reliability and iOS Safari handling.

```typescript
// Current implementation
function downloadAsFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
```

**Recommendation**: Use battle-tested `file-saver` library.

```typescript
import { saveAs } from 'file-saver';

// Replaces downloadAsFile
export const downloadAsFile = (
    content: string,
    filename: string,
    contentType: string
): void => {
    const blob = new Blob([content], { type: contentType });
    saveAs(blob, filename);
};
```

**Installation**:
```bash
npm install file-saver
npm install --save-dev @types/file-saver
```

**Benefits**:
- Better iOS Safari support
- Handles large files correctly
- Automatic memory cleanup
- Works around browser quirks
- 6KB minified, well-tested

**Impact**: Better cross-platform reliability, especially mobile browsers.

---

### 3.4 Native JavaScript vs Lodash (MEDIUM PRIORITY)

**Current Status**: **Lodash is already in dependencies** (`package.json:50`)

**Issue**: Lodash imported but many operations now have native JavaScript equivalents.

**Recommendation**: Prefer native JavaScript where available, keep lodash for specialized utilities.

#### 3.4.1 Use Native `Object.groupBy()` for Grouping

```typescript
// Instead of LorebookFilterService category methods, use native groupBy:
const activeEntries = entries.filter(e => !e.isDisabled);
const byCategory = Object.groupBy(activeEntries, e => e.category);

const characters = byCategory.character || [];
const locations = byCategory.location || [];

// Browser support: Chrome 117+, Firefox 119+, Safari 17+ (2023+)
// No polyfill needed for Electron/Tauri with modern webview
```

#### 3.4.2 Use Native Set for Deduplication

```typescript
// When combining lorebook entries from different sources
const allEntries = [
    ...matchedChapterEntries,
    ...matchedSceneBeatEntries,
    ...customEntries
];

// Deduplicate by ID using Map
const uniqueEntries = [...new Map(allEntries.map(e => [e.id, e])).values()];

// Or filter approach
const seen = new Set();
const uniqueEntries = allEntries.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
});
```

#### 3.4.3 Keep Lodash `debounce`

```typescript
// In Lexical SaveChapterContent plugin - lodash debounce is still best
import { debounce } from 'lodash';

const debouncedSave = debounce(
    async (editorState) => {
        await saveChapter(editorState);
    },
    1000
);

// Native alternative would require manual implementation
```

#### 3.4.4 Use Native `Array.partition()` Pattern

```typescript
// Separate enabled/disabled entries - native approach
const enabled = entries.filter(e => !e.isDisabled);
const disabled = entries.filter(e => e.isDisabled);

// Or single-pass with reduce
const { enabled, disabled } = entries.reduce(
    (acc, e) => {
        (e.isDisabled ? acc.disabled : acc.enabled).push(e);
        return acc;
    },
    { enabled: [], disabled: [] }
);
```

#### 3.4.5 Use Destructuring for Object Transformation

```typescript
// When preparing data for export - use destructuring
const exportData = prompts.map(({ isSystem, lastUsed, usageCount, ...rest }) => rest);

// Or keep specific fields
const exportData = prompts.map(({ id, name, messages, temperature }) =>
    ({ id, name, messages, temperature })
);
```

**Keep Lodash For**:
- `debounce` / `throttle` - no native equivalent
- `cloneDeep` - native structuredClone exists but lodash handles edge cases
- Complex path operations - `get(obj, 'deeply.nested.path', defaultValue)`

**Replace with Native**:
- `groupBy` → `Object.groupBy()` / `Map.groupBy()`
- `uniqBy` → Set-based deduplication
- `partition` → reduce or double filter
- `pick` / `omit` → destructuring
- `filter` / `map` / `forEach` - always use native

**Impact**: Smaller bundle size, better performance, less dependency surface area.

---

### 3.5 Retry Logic with p-retry (LOW PRIORITY)

**Location**: Git operations requiring retry (noted in CLAUDE.md)

**Issue**: CLAUDE.md specifies retry logic for network operations:

> For git push: retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

Manual implementation is error-prone.

**Recommendation**: Use `p-retry` for declarative retry logic.

```typescript
import pRetry from 'p-retry';

// Git push with retry
const pushWithRetry = async (branch: string) => {
    return pRetry(
        async () => {
            const result = await fetch(`/git/push`, {
                method: 'POST',
                body: JSON.stringify({ branch })
            });

            if (!result.ok && result.status === 403) {
                throw new pRetry.AbortError('Permission denied');
            }

            if (!result.ok) {
                throw new Error('Push failed');
            }

            return result;
        },
        {
            retries: 4,
            factor: 2,
            minTimeout: 2000,
            maxTimeout: 16000,
            onFailedAttempt: (error) => {
                console.log(
                    `Attempt ${error.attemptNumber} failed. ` +
                    `${error.retriesLeft} retries left.`
                );
            }
        }
    );
};
```

**Installation**:
```bash
npm install p-retry
```

**Impact**: Declarative, tested retry logic. Useful for AI API calls too (rate limiting).

---

### 3.6 Server-Sent Events Parsing (LOW PRIORITY)

**Location**: `src/services/ai/AIService.ts` (manual SSE parsing in processStreamedResponse)

**Issue**: Manual parsing of SSE format from AI streaming responses.

**Recommendation**: Use `eventsource-parser` for robust SSE handling.

```typescript
import { createParser } from 'eventsource-parser';

const processStream = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    const parser = createParser((event) => {
        if (event.type === 'event') {
            const data = JSON.parse(event.data);
            onToken(data.content);
        }
    });

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        parser.feed(chunk);
    }
};
```

**Installation**:
```bash
npm install eventsource-parser
```

**Impact**: Better error handling, spec-compliant parsing, handles edge cases.

---

## 4. Additional Observations

### 4.1 TypeScript Strict Mode

**CLAUDE.md notes**: `strict: false` in tsconfig.json, with TODO to enable strict mode soon.

**Recommendation**: When enabling strict mode, leverage Zod schemas to bridge runtime/compile-time type safety.

```typescript
import { z } from 'zod';

// Schema serves as single source of truth
const StorySchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    author: z.string(),
    synopsis: z.string().optional(),
    createdAt: z.date()
});

// Infer TypeScript type from schema
export type Story = z.infer<typeof StorySchema>;

// Runtime validation + compile-time types
const validateStory = (data: unknown): Story => {
    return StorySchema.parse(data);  // Throws if invalid
};
```

---

### 4.2 React Antipatterns

**Found**: Archived documentation `docs/archived/REACT_ANTIPATTERNS_REMEDIATION.md` suggests past work on this.

**Observation**: CLAUDE.md explicitly warns against `useEffect` abuse for derived state. Current codebase generally follows best practices, but worth periodic review.

**Recommendation**: Consider ESLint rules:
- `react-hooks/exhaustive-deps`
- `react/no-unstable-nested-components`

---

### 4.3 Error Boundary Usage

**Found**: Global error boundary in `src/components/ErrorBoundary.tsx`

**Observation**: Single error boundary at app root is good, but complex features (Lexical editor, AI generation) might benefit from feature-level boundaries.

**Recommendation**: Add granular error boundaries:

```typescript
// Feature-level error boundaries
<ErrorBoundary
    FallbackComponent={EditorErrorFallback}
    onReset={() => resetEditorState()}
>
    <LexicalEditor />
</ErrorBoundary>

<ErrorBoundary
    FallbackComponent={AIGenerationErrorFallback}
    onReset={() => cancelGeneration()}
>
    <AIGenerationPanel />
</ErrorBoundary>
```

Using `react-error-boundary` (already in dependencies, `package.json:55`).

---

## 5. Implementation Priority Matrix

| Priority | Category | Items | Estimated Impact |
|----------|----------|-------|------------------|
| **HIGH** | Duplication | Stream wrapping code | High - Immediate DRY gains |
| **HIGH** | Duplication | Lexical text extraction | High - Prevents bugs |
| **HIGH** | Abstraction | CRUD store factory | Very High - ~1,200 lines |
| **HIGH** | Library | Zod validation | High - Type safety |
| **HIGH** | Dependencies | ID generator removal | Medium - Less noise |
| **MEDIUM** | Duplication | Import/export utils | Medium - Consistency |
| **MEDIUM** | Duplication | String normalization | Low - Maintainability |
| **MEDIUM** | Library | date-fns integration | Medium - Better UX |
| **MEDIUM** | Library | Native JS vs lodash migration | Medium - Bundle size |
| **MEDIUM** | Library | Replace logger with loglevel | Medium - Production readiness |
| **MEDIUM** | Dependencies | Lorebook filter methods | Medium - DRY |
| **LOW** | Library | file-saver | Low - Reliability |
| **LOW** | Library | p-retry | Low - Reliability |
| **LOW** | Library | eventsource-parser | Low - Robustness |
| **LOW** | Pattern | Fetch-after-update | Low - Performance |

**Quick Wins** (high impact):
1. Stream wrapping extraction
2. ID generator removal
3. Replace logger with loglevel
4. String normalization utility

---

## 6. Migration Strategy

### Phase 1: Quick Wins
- Remove ID generator wrappers
- Extract stream wrapping code
- Replace logger utility with loglevel
- Create string normalization utility

### Phase 2: Validation & Types
- Add Zod schemas for all entities
- Migrate validation logic
- Add runtime validation to import/export

### Phase 3: Utilities
- Unify Lexical text extraction
- Create import/export utilities
- Add date-fns and migrate date operations

### Phase 4: Major Refactor
- Design and implement CRUD store factory
- Migrate stores one-by-one
- Comprehensive testing

### Phase 5: Polish
- Migrate lodash usage to native JS where appropriate
- Add p-retry for network operations
- Feature-level error boundaries
- Documentation updates

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes in store refactor | High | High | Incremental migration, comprehensive testing per store |
| Type errors from Zod schemas | Medium | Medium | Start with non-critical features, gradual rollout |
| Performance regression | Low | Medium | Benchmark before/after, use React DevTools Profiler |
| Increased bundle size | Low | Low | Use tree-shakeable libraries (date-fns), monitor with webpack-bundle-analyzer |
| Developer learning curve | Medium | Low | Documentation, code review sessions, pair programming |

---

## 8. Success Metrics

### Code Quality Metrics
- **Lines of code reduction**: Target 15-20% reduction (~1,500-2,000 lines)
- **Duplication reduction**: Target 80% reduction in duplicated logic
- **Test coverage**: Maintain or increase current coverage
- **TypeScript errors**: Zero increase when strict mode enabled

### Developer Experience Metrics
- **New entity development**: Should improve significantly with CRUD factory
- **Validation error debugging**: Should improve with Zod detailed errors
- **Code review feedback cycles**: Should decrease with consistent patterns

### Reliability Metrics
- **Import/export errors**: Target 90% reduction
- **Date formatting inconsistencies**: Target 100% elimination
- **Cross-browser compatibility issues**: Track reduction in bug reports

---

## 9. Conclusion

The Story Nexus codebase is well-structured with clear separation of concerns and consistent patterns. The analysis identified **three major opportunity areas**:

1. **Elimination of unnecessary abstractions** - ID generators, category filter wrappers
2. **Consolidation of duplicated patterns** - CRUD operations, text extraction, import/export
3. **Better utilisation of existing & new dependencies** - Zod validation, loglevel, date-fns, native JS over lodash

**Key Takeaway**: Most opportunities fall into "good code made better" rather than "fixing broken code". The codebase follows functional programming principles and error handling best practices. This refactoring work would primarily improve maintainability, reduce future bug surface area, and accelerate feature development.

**Recommended Immediate Actions**:
1. Start with Phase 1 quick wins for immediate value
2. Prioritise Zod validation before enabling TypeScript strict mode
3. Design CRUD factory carefully - get feedback before full migration
4. Maintain excellent test coverage throughout refactoring

---

**Report Version**: 1.0
**Next Review**: 2026-01-31
