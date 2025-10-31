# Database Abstraction Layer Migration Plan

## Executive Summary

Migrate from Dexie/IndexedDB to a flexible database abstraction layer using Drizzle ORM, enabling support for multiple database engines (SQLite, PostgreSQL, MySQL) while maintaining local-first architecture.

**Primary recommendation**: SQLite via Tauri SQL plugin for optimal local-first performance and portability.

---

## Current State Analysis

### Existing Architecture
- **Database**: Dexie.js wrapper over IndexedDB
- **Version**: Schema v13 with migration system
- **Tables**: 8 (stories, chapters, aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes)
- **Access Pattern**: Direct Dexie table access from Zustand stores
- **Key Features**:
  - Multi-index queries (e.g., `[storyId, tags]`)
  - Transactions for multi-table operations
  - Auto-populate on first init
  - Helper methods for common queries
  - Schema versioning with upgrade hooks

### Pain Points
1. **Browser-only**: IndexedDB locks us to browser environment
2. **Limited query capabilities**: Complex joins and aggregations difficult
3. **No true relational integrity**: Foreign keys not enforced
4. **Export/backup complexity**: Binary blob format not human-readable
5. **Performance**: Large datasets slow with IndexedDB
6. **Debugging**: Poor tooling compared to SQL databases
7. **Portability**: Can't easily move data between devices

---

## Proposed Architecture

### Database Engine Selection

#### Primary: SQLite (via Tauri SQL Plugin)
**Best fit for local-first desktop app**

**Advantages**:
- Single file database (easy backup/export)
- ACID compliance with proper foreign keys
- Excellent performance for local queries
- Zero-config, no server needed
- Works offline by design
- Cross-platform (Windows, macOS, Linux)
- Human-readable with standard SQL tools
- Tauri native integration via `@tauri-apps/plugin-sql`
- File-based migration between devices

**Disadvantages**:
- Single writer (not an issue for single-user desktop app)
- No built-in replication (future consideration)

#### Secondary Options

**PostgreSQL** (network database)
- Overkill for local-first
- Requires server setup
- Network latency
- Good for future cloud sync feature

**MySQL/MariaDB**
- Similar to PostgreSQL issues
- Less suitable for desktop app

**IndexedDB (via better-sqlite3)**
- Keep browser compatibility
- But defeats purpose of migration

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

#### 1.1 Dependencies
```bash
# Core ORM
npm install drizzle-orm
npm install -D drizzle-kit

# Tauri SQL plugin
npm install @tauri-apps/plugin-sql

# Type safety
npm install -D @types/better-sqlite3
```

#### 1.2 Tauri Configuration
Add SQL plugin to `src-tauri/Cargo.toml`:
```toml
[dependencies]
tauri-plugin-sql = { version = "2.0.0", features = ["sqlite"] }
```

Register plugin in `src-tauri/src/main.rs`:
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 1.3 Project Structure
```
src/
  db/
    schema/           # Drizzle schema definitions
      stories.ts
      chapters.ts
      lorebook.ts
      prompts.ts
      aiSettings.ts
      aiChats.ts
      sceneBeats.ts
      notes.ts
      relations.ts    # Define all foreign keys
    migrations/       # Generated SQL migration files
    client.ts         # Database client initialization
    queries/          # Typed query builders
      stories.ts
      chapters.ts
      lorebook.ts
      ...
    repository/       # Repository pattern (optional abstraction)
      StoryRepository.ts
      ChapterRepository.ts
      ...
  services/
    database.ts       # Deprecated, will be replaced
```

### Phase 2: Schema Definition (Week 1)

#### 2.1 Define Drizzle Schema
Create type-safe schema mirroring existing structure:

**src/db/schema/stories.ts**:
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  language: text('language').notNull(),
  synopsis: text('synopsis'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isDemo: integer('is_demo', { mode: 'boolean' }),
});
```

**src/db/schema/chapters.ts**:
```typescript
export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  storyId: text('story_id').notNull().references(() => stories.id, {
    onDelete: 'cascade'
  }),
  title: text('title').notNull(),
  summary: text('summary'),
  order: integer('order').notNull(),
  content: text('content').notNull(),
  outline: text('outline', { mode: 'json' }).$type<ChapterOutline>(),
  wordCount: integer('word_count').notNull().default(0),
  povCharacter: text('pov_character'),
  povType: text('pov_type').$type<'First Person' | 'Third Person Limited' | 'Third Person Omniscient'>(),
  notes: text('notes', { mode: 'json' }).$type<ChapterNotes>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isDemo: integer('is_demo', { mode: 'boolean' }),
});

// Index for common queries
export const chapterStoryIdIdx = index('chapter_story_id_idx').on(chapters.storyId);
export const chapterOrderIdx = index('chapter_order_idx').on(chapters.storyId, chapters.order);
```

**src/db/schema/lorebookEntries.ts**:
```typescript
export const lorebookEntries = sqliteTable('lorebook_entries', {
  id: text('id').primaryKey(),
  storyId: text('story_id').notNull().references(() => stories.id, {
    onDelete: 'cascade'
  }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().$type<LorebookEntry['category']>(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<LorebookEntry['metadata']>(),
  isDisabled: integer('is_disabled', { mode: 'boolean' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isDemo: integer('is_demo', { mode: 'boolean' }),
});

// Full-text search for lorebook (SQLite FTS5)
export const lorebookFts = sqliteTable('lorebook_fts', {
  // FTS5 virtual table for fast text search
  // Will enable: SELECT * FROM lorebook_fts WHERE lorebook_fts MATCH 'search term'
});
```

**Key Schema Features**:
- Foreign keys with CASCADE delete (replaces manual `deleteStoryWithRelated`)
- JSON columns for complex nested data (outline, notes, metadata, tags)
- Timestamp mode for Date handling
- Type-safe enums via `$type<>`
- Indexes for common query patterns
- FTS5 virtual tables for full-text search in lorebook

#### 2.2 Relations Definition
**src/db/schema/relations.ts**:
```typescript
import { relations } from 'drizzle-orm';
import { stories, chapters, lorebookEntries, sceneBeats, aiChats, notes } from './index';

export const storiesRelations = relations(stories, ({ many }) => ({
  chapters: many(chapters),
  lorebookEntries: many(lorebookEntries),
  sceneBeats: many(sceneBeats),
  aiChats: many(aiChats),
  notes: many(notes),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  story: one(stories, {
    fields: [chapters.storyId],
    references: [stories.id],
  }),
  sceneBeats: many(sceneBeats),
}));

// ... more relations
```

**Benefits**:
- Type-safe joins with auto-completion
- Automatic eager/lazy loading
- Query builder understands relationships

### Phase 3: Database Client & Migrations (Week 2)

#### 3.1 Initialize Client
**src/db/client.ts**:
```typescript
import { drizzle } from 'drizzle-orm/sql-js';
import Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;

export const initDb = async () => {
  if (db) return db;

  // Initialize Tauri SQLite database
  const sqliteDb = await Database.load('sqlite:story_nexus.db');

  db = drizzle(sqliteDb, { schema });

  return db;
};

export const getDb = () => {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
};
```

#### 3.2 Migration System
**drizzle.config.ts** (root):
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './story_nexus.db',
  },
} satisfies Config;
```

Generate migrations:
```bash
# Generate migration from schema changes
npx drizzle-kit generate:sqlite

# Apply migrations (run at app startup)
npx drizzle-kit push:sqlite
```

**Migration strategy**:
```typescript
// src/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client';

export const runMigrations = async () => {
  const db = getDb();
  await migrate(db, { migrationsFolder: './src/db/migrations' });
};
```

#### 3.3 Seed System Prompts
**src/db/seeds/systemPrompts.ts**:
```typescript
import { getDb } from '../client';
import { prompts } from '../schema';
import systemPromptsData from '@/data/systemPrompts';

export const seedSystemPrompts = async () => {
  const db = getDb();

  // Check if already seeded
  const existing = await db.select().from(prompts).where(eq(prompts.isSystem, true));
  if (existing.length > 0) return;

  // Insert system prompts
  await db.insert(prompts).values(
    systemPromptsData.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      isSystem: true,
    }))
  );
};
```

### Phase 4: Repository Layer (Week 2-3)

Create clean abstraction over Drizzle queries to match existing `db.*` API.

#### 4.1 Base Repository Pattern
**src/db/repository/BaseRepository.ts**:
```typescript
import { getDb } from '../client';
import type { Table } from 'drizzle-orm';

export abstract class BaseRepository<T extends Table> {
  protected db = getDb();
  protected abstract table: T;

  async findById(id: string) {
    return this.db.select().from(this.table).where(eq(this.table.id, id)).get();
  }

  async findAll() {
    return this.db.select().from(this.table).all();
  }

  async create(data: Omit<T['$inferInsert'], 'id' | 'createdAt'>) {
    const id = crypto.randomUUID();
    await this.db.insert(this.table).values({
      id,
      createdAt: new Date(),
      ...data,
    });
    return id;
  }

  async update(id: string, data: Partial<T['$inferInsert']>) {
    await this.db.update(this.table).set(data).where(eq(this.table.id, id));
  }

  async delete(id: string) {
    await this.db.delete(this.table).where(eq(this.table.id, id));
  }
}
```

#### 4.2 Story Repository
**src/db/repository/StoryRepository.ts**:
```typescript
import { eq } from 'drizzle-orm';
import { stories, chapters, lorebookEntries, aiChats, sceneBeats } from '../schema';
import { BaseRepository } from './BaseRepository';

class StoryRepository extends BaseRepository<typeof stories> {
  protected table = stories;

  async getFullStory(storyId: string) {
    const story = await this.db.query.stories.findFirst({
      where: eq(stories.id, storyId),
      with: {
        chapters: {
          orderBy: (chapters, { asc }) => [asc(chapters.order)],
        },
      },
    });
    return story;
  }

  async deleteWithRelated(storyId: string) {
    // Foreign key CASCADE handles this automatically!
    // Just delete the story, related records auto-delete
    await this.db.delete(stories).where(eq(stories.id, storyId));
  }

  // Migrate from Dexie method names
  async createNewStory(data: Omit<Story, 'createdAt'>) {
    return this.create(data);
  }
}

export const storyRepository = new StoryRepository();
```

#### 4.3 Lorebook Repository
**src/db/repository/LorebookRepository.ts**:
```typescript
import { eq, and, inArray, sql } from 'drizzle-orm';
import { lorebookEntries } from '../schema';
import { BaseRepository } from './BaseRepository';

class LorebookRepository extends BaseRepository<typeof lorebookEntries> {
  protected table = lorebookEntries;

  async getByStory(storyId: string) {
    return this.db.select()
      .from(lorebookEntries)
      .where(eq(lorebookEntries.storyId, storyId));
  }

  async getByCategory(storyId: string, category: LorebookEntry['category']) {
    return this.db.select()
      .from(lorebookEntries)
      .where(
        and(
          eq(lorebookEntries.storyId, storyId),
          eq(lorebookEntries.category, category)
        )
      );
  }

  async getByTag(storyId: string, tag: string) {
    // JSON array search in SQLite
    return this.db.select()
      .from(lorebookEntries)
      .where(
        and(
          eq(lorebookEntries.storyId, storyId),
          sql`json_each(${lorebookEntries.tags}) WHERE value = ${tag}`
        )
      );
  }

  async fullTextSearch(storyId: string, query: string) {
    // FTS5 full-text search
    return this.db.select()
      .from(lorebookEntries)
      .where(
        and(
          eq(lorebookEntries.storyId, storyId),
          sql`lorebook_entries.id IN (
            SELECT id FROM lorebook_fts WHERE lorebook_fts MATCH ${query}
          )`
        )
      );
  }
}

export const lorebookRepository = new LorebookRepository();
```

#### 4.4 Unified Database Service
**src/db/index.ts** (replaces `src/services/database.ts`):
```typescript
import { storyRepository } from './repository/StoryRepository';
import { chapterRepository } from './repository/ChapterRepository';
import { lorebookRepository } from './repository/LorebookRepository';
import { promptRepository } from './repository/PromptRepository';
import { aiSettingsRepository } from './repository/AISettingsRepository';
import { sceneBeatRepository } from './repository/SceneBeatRepository';
import { aiChatRepository } from './repository/AIChatRepository';
import { notesRepository } from './repository/NotesRepository';

// Export unified interface matching old `db.*` API
export const db = {
  // Table repositories
  stories: storyRepository,
  chapters: chapterRepository,
  lorebookEntries: lorebookRepository,
  prompts: promptRepository,
  aiSettings: aiSettingsRepository,
  sceneBeats: sceneBeatRepository,
  aiChats: aiChatRepository,
  notes: notesRepository,

  // Convenience methods (match old Dexie API)
  getFullStory: (id: string) => storyRepository.getFullStory(id),
  createNewStory: (data: Omit<Story, 'createdAt'>) => storyRepository.create(data),
  deleteStoryWithRelated: (id: string) => storyRepository.deleteWithRelated(id),
  getLorebookEntriesByStory: (storyId: string) => lorebookRepository.getByStory(storyId),
  getLorebookEntriesByTag: (storyId: string, tag: string) => lorebookRepository.getByTag(storyId, tag),
  getLorebookEntriesByCategory: (storyId: string, category: LorebookEntry['category']) =>
    lorebookRepository.getByCategory(storyId, category),
  getSceneBeatsByChapter: (chapterId: string) => sceneBeatRepository.getByChapter(chapterId),
  getSceneBeat: (id: string) => sceneBeatRepository.findById(id),
  createSceneBeat: (data: Omit<SceneBeat, 'id' | 'createdAt'>) => sceneBeatRepository.create(data),
  updateSceneBeat: (id: string, data: Partial<SceneBeat>) => sceneBeatRepository.update(id, data),
  deleteSceneBeat: (id: string) => sceneBeatRepository.delete(id),
};
```

**Key benefit**: Existing store code mostly unchanged! Just import path changes.

### Phase 5: Store Migration (Week 3)

Minimal changes to existing stores - mostly import path updates.

**Before** (`src/features/stories/stores/useStoryStore.ts`):
```typescript
import { db } from '@/services/database';
```

**After**:
```typescript
import { db } from '@/db';
```

Most store methods work as-is because repository layer matches old API.

**Changes needed**:
1. `db.stories.toArray()` → `db.stories.findAll()`
2. `db.stories.get(id)` → `db.stories.findById(id)`
3. `db.stories.add(data)` → `db.stories.create(data)`
4. `db.stories.update(id, data)` → `db.stories.update(id, data)` (same!)
5. Transactions → wrap in `db.transaction(async () => { ... })`

### Phase 6: Data Migration (Week 4)

#### 6.1 Export Tool
Create one-time migration tool to export IndexedDB → SQLite:

**src/scripts/migrateFromIndexedDB.ts**:
```typescript
import { StoryDatabase } from '@/services/database'; // Old Dexie
import { db as newDb } from '@/db'; // New Drizzle

export const migrateFromIndexedDB = async () => {
  const oldDb = new StoryDatabase();

  console.log('Starting migration from IndexedDB to SQLite...');

  // Stories
  const stories = await oldDb.stories.toArray();
  for (const story of stories) {
    await newDb.stories.create(story);
  }
  console.log(`Migrated ${stories.length} stories`);

  // Chapters
  const chapters = await oldDb.chapters.toArray();
  for (const chapter of chapters) {
    await newDb.chapters.create(chapter);
  }
  console.log(`Migrated ${chapters.length} chapters`);

  // Continue for all tables...

  console.log('Migration complete!');
};
```

#### 6.2 Migration UI
Add migration prompt on app startup:
```typescript
// src/App.tsx
const [needsMigration, setNeedsMigration] = useState(false);

useEffect(() => {
  const checkMigration = async () => {
    // Check if IndexedDB has data but SQLite doesn't
    const hasOldData = await checkIndexedDBHasData();
    const hasNewData = await checkSQLiteHasData();

    if (hasOldData && !hasNewData) {
      setNeedsMigration(true);
    }
  };
  checkMigration();
}, []);

if (needsMigration) {
  return <MigrationDialog onMigrate={migrateFromIndexedDB} />;
}
```

### Phase 7: Testing & Validation (Week 4)

#### 7.1 Unit Tests
Test repositories in isolation:
```typescript
// src/db/repository/__tests__/StoryRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { storyRepository } from '../StoryRepository';

describe('StoryRepository', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it('creates story with chapters', async () => {
    const storyId = await storyRepository.create({
      title: 'Test Story',
      author: 'Test Author',
      language: 'en',
    });

    const story = await storyRepository.getFullStory(storyId);
    expect(story).toBeDefined();
    expect(story.title).toBe('Test Story');
  });

  it('cascades delete to related records', async () => {
    const storyId = await createTestStoryWithChapters();
    await storyRepository.deleteWithRelated(storyId);

    const chapters = await chapterRepository.getByStory(storyId);
    expect(chapters).toHaveLength(0);
  });
});
```

#### 7.2 Integration Tests
Test full user flows:
- Create story → add chapters → add lorebook → delete story
- Scene beat generation with lorebook matching
- Prompt parsing with database context
- Export/import story with all related data

#### 7.3 Performance Testing
Benchmark common operations:
```typescript
// Compare IndexedDB vs SQLite
const benchmarkChapterLoad = async () => {
  const start = performance.now();
  const chapters = await db.chapters.getByStory(storyId);
  const duration = performance.now() - start;
  console.log(`Loaded ${chapters.length} chapters in ${duration}ms`);
};
```

Expected improvements:
- Complex queries: 2-5x faster
- Full-text search: 10-20x faster
- Joins: 5-10x faster (vs manual Dexie queries)

### Phase 8: Deployment (Week 5)

#### 8.1 Database Location
Store SQLite file in platform-specific app data:
```typescript
import { appDataDir } from '@tauri-apps/api/path';

const getDbPath = async () => {
  const dir = await appDataDir();
  return `${dir}/story_nexus.db`;
};
```

Locations:
- **Windows**: `%APPDATA%\com.storynexus.app\story_nexus.db`
- **macOS**: `~/Library/Application Support/com.storynexus.app/story_nexus.db`
- **Linux**: `~/.local/share/com.storynexus.app/story_nexus.db`

#### 8.2 Backup System
Auto-backup before migrations:
```typescript
import { copyFile } from '@tauri-apps/api/fs';

const backupDb = async () => {
  const dbPath = await getDbPath();
  const backupPath = `${dbPath}.backup.${Date.now()}`;
  await copyFile(dbPath, backupPath);
};
```

#### 8.3 Export/Import Enhancement
**Benefits of SQLite**:
- Export: just copy `.db` file
- Import: just paste `.db` file
- Or use SQL dumps for text format:
  ```typescript
  import { invoke } from '@tauri-apps/api/tauri';

  const exportToSQL = async () => {
    return await invoke('export_db_to_sql');
  };
  ```

---

## Future Enhancements

### Multi-Database Support

Once abstraction layer is in place, adding other databases is straightforward:

#### PostgreSQL Support
```typescript
// src/db/adapters/postgres.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const createPostgresDb = (connectionString: string) => {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
};
```

#### Config-Based Selection
```typescript
// src/db/config.ts
export const DB_CONFIG = {
  type: 'sqlite', // or 'postgres', 'mysql'
  sqlite: {
    path: './story_nexus.db',
  },
  postgres: {
    connectionString: 'postgresql://...',
  },
};

// src/db/client.ts
export const initDb = async () => {
  switch (DB_CONFIG.type) {
    case 'sqlite':
      return createSqliteDb(DB_CONFIG.sqlite.path);
    case 'postgres':
      return createPostgresDb(DB_CONFIG.postgres.connectionString);
    default:
      throw new Error(`Unsupported database: ${DB_CONFIG.type}`);
  }
};
```

### Cloud Sync
With SQLite foundation:
1. Use SQLite as local cache
2. Sync to PostgreSQL cloud instance
3. Use `last_modified` timestamps for conflict resolution
4. Implement CRDT patterns for collaborative editing

### Query Optimization
Drizzle provides prepared statements:
```typescript
const getStoryById = db.select().from(stories).where(eq(stories.id, sql.placeholder('id'))).prepare();

// Reuse compiled query
const story = await getStoryById.execute({ id: 'story-123' });
```

### Advanced Lorebook Search
Leverage SQLite FTS5 for:
- Fuzzy matching
- Phrase search
- Boolean operators (AND, OR, NOT)
- Ranking by relevance
```typescript
// "character AND magic -evil"
const results = await lorebookRepository.fullTextSearch(storyId, 'character AND magic -evil');
```

---

## Risk Assessment

### High Risk
1. **Data Loss During Migration**
   - **Mitigation**: Auto-backup before migration, validate data integrity, allow rollback
   - **Testing**: Extensive migration testing with large datasets

2. **Performance Regression**
   - **Mitigation**: Benchmark before/after, optimize indexes, use prepared statements
   - **Testing**: Load test with 1000+ chapters, 10000+ lorebook entries

### Medium Risk
3. **Breaking Store Logic**
   - **Mitigation**: Repository layer matches old API, incremental migration per feature
   - **Testing**: Comprehensive integration tests for all stores

4. **Tauri Plugin Compatibility**
   - **Mitigation**: Test on all platforms (Windows, macOS, Linux) early
   - **Testing**: CI/CD with cross-platform builds

### Low Risk
5. **Type Safety Gaps**
   - **Mitigation**: Drizzle has excellent TypeScript support, stricter than Dexie
   - **Testing**: Enable strict mode (`strict: true`) during migration

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 3 days | Dependencies installed, Tauri configured |
| 2. Schema Definition | 4 days | All tables defined with relations, indexes |
| 3. Client & Migrations | 5 days | DB client, migration system, seed scripts |
| 4. Repository Layer | 7 days | All repositories matching old API |
| 5. Store Migration | 5 days | All Zustand stores using new DB |
| 6. Data Migration | 5 days | IndexedDB → SQLite tool + UI |
| 7. Testing | 5 days | Unit, integration, performance tests |
| 8. Deployment | 3 days | Packaging, backup system, docs |

**Total**: ~5 weeks (assuming full-time work)

---

## Success Criteria

1. ✅ All existing features work identically
2. ✅ No data loss during migration
3. ✅ Performance equal or better than IndexedDB
4. ✅ Type safety maintained or improved
5. ✅ Easy backup/restore (file copy)
6. ✅ Foundation for PostgreSQL/MySQL support
7. ✅ Zero breaking changes to component layer
8. ✅ Comprehensive test coverage (>80%)

---

## Alternative Approaches Considered

### 1. Keep Dexie, Add Abstraction Layer
**Rejected**: Doesn't solve core IndexedDB limitations (performance, portability, browser-only)

### 2. Direct Tauri SQL Plugin (No ORM)
**Rejected**: Lose type safety, manual query building, more error-prone, harder to maintain

### 3. TypeORM Instead of Drizzle
**Rejected**:
- Heavier bundle size
- Decorator-based (less functional)
- Drizzle has better TypeScript inference
- Drizzle is newer, more actively maintained

### 4. Prisma
**Rejected**:
- Requires separate generation step
- Larger bundle size
- Less flexible for advanced queries
- Drizzle more suited for Tauri/frontend apps

---

## Recommendation

**Proceed with Drizzle + SQLite migration.**

**Rationale**:
1. Aligns with project goals (local-first, portable, performant)
2. Minimal disruption to existing code (repository layer abstracts changes)
3. Future-proof (easy to add PostgreSQL for cloud sync)
4. Better developer experience (type safety, SQL tooling, debuggability)
5. Improved user experience (faster queries, full-text search, easy backup)
6. Addresses known TODO in CLAUDE.md: "replace this with a better, portable solution"

**Next Steps**:
1. Approve plan with Guv
2. Create feature branch `feature/drizzle-migration`
3. Start Phase 1 (Foundation)
4. Implement incrementally with continuous testing
5. Deploy with migration wizard for existing users

---

**Author**: Claude Code
**Date**: 2025-10-31
**Version**: 1.0
**Status**: Awaiting Approval
