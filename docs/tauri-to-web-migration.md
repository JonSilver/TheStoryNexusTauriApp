# Tauri to Web App Migration Plan

**Date:** 2025-11-04
**Status:** Planning

## Overview

Convert The Story Nexus from Tauri desktop app to web app running in Docker container, accessible via LAN from any device.

## Architecture

**Current:** Tauri desktop app, IndexedDB local storage, single-user
**Target:** Web app, SQLite backend, Docker container, LAN-accessible, single-user

## Implementation Steps

### 1. Remove Tauri Infrastructure

- Delete `src-tauri/` directory
- Remove `@tauri-apps/cli` from devDependencies
- Remove `tauri` script from package.json
- Clean up vite.config.ts:
  - Remove `TAURI_DEV_HOST` logic
  - Remove fixed port requirements (1420/1421)
  - Remove `src-tauri` watch ignore
  - Standard Vite web app config

### 2. Add Backend (Express + Drizzle + SQLite)

**Directory structure:**
```
server/
├── index.ts          # Express app entry
├── db/
│   ├── schema.ts     # Drizzle schema definitions
│   └── client.ts     # SQLite connection
├── routes/
│   ├── stories.ts
│   ├── chapters.ts
│   ├── lorebook.ts
│   ├── prompts.ts
│   ├── ai.ts         # AI streaming proxy
│   ├── brainstorm.ts
│   ├── scenebeats.ts
│   └── notes.ts
└── utils/
    └── stream.ts     # AI streaming utilities
```

**Schema:** Mirror current Dexie tables:
- stories
- chapters
- aiChats
- prompts
- aiSettings
- lorebookEntries (with `storyId, tags` index)
- sceneBeats
- notes

**Dependencies:**
- express
- drizzle-orm
- better-sqlite3
- cors (for dev)

### 3. Frontend Changes

**Remove:**
- Dexie entirely
- Database operations from Zustand stores

**Add:**
- TanStack Query (v5)
- API client layer (`src/services/api/client.ts`)
- Query hooks replacing store operations

**Keep:**
- All UI components unchanged
- React Router
- Lexical editor
- Existing feature structure

**Zustand usage:** Only for pure client-side UI state (if needed)

### 4. Docker Setup

**Single container:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["node", "server/index.js"]
```

**docker-compose.yml:**
```yaml
services:
  storynexus:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/storynexus.db
```

**SQLite file:** `/app/data/storynexus.db` (mounted volume for persistence)

### 5. Development Workflow

**Scripts (package.json):**
```json
{
  "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
  "dev:server": "tsx watch server/index.ts",
  "dev:client": "vite",
  "build": "tsc && vite build",
  "start": "node dist/server/index.js"
}
```

**Vite proxy config:**
```ts
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

**Backend:** Express on port 3001 (dev), 3000 (prod)
**Frontend:** Vite dev server on port 5173 (proxies API to 3001)

### 6. Data Migration Utilities

Both features in new web app only:

**Export IndexedDB → JSON:**
- Admin/migration page with export button
- Reads entire IndexedDB (Dexie) client-side
- Downloads JSON file via browser
- Format: `{ version: "1.0", exportedAt: ISO8601, tables: { stories: [...], chapters: [...], ... } }`
- All tables: stories, chapters, aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes

**Import JSON → SQLite:**
- Same admin page with file upload
- Upload JSON from previous export
- **Replaces all database contents** (destructive, with confirmation)
- Backend endpoint: `POST /api/admin/import` (multipart/form-data)
- Transaction-wrapped: all-or-nothing
- Validates schema before applying

**Implementation:**
- Client: `src/services/migration.ts` (export IndexedDB, upload file)
- Server: `server/routes/admin.ts` + `server/services/importDatabase.ts`
- Single JSON schema for both operations

## Key Technical Notes

### AI Streaming
- Server-side proxy maintains API keys securely
- SSE or WebSocket for streaming to client
- TanStack Query supports streaming via `onSuccess` callbacks

### Auto-save (Lexical)
- `SaveChapterContent` plugin uses TanStack Query mutation
- Debounced saves to API endpoint
- Optimistic updates for instant UI feedback

### Lorebook Matching
- Keep matching logic client-side for responsiveness
- Fetch all relevant lorebook entries once per chapter/context
- Cache aggressively with TanStack Query

### Scene Beats
- Inline generation workflow unchanged
- API calls for generation via mutations
- Store generated content in SQLite

## Migration Complexity

**Low:**
- Remove Tauri (deletion)
- Basic Express + Drizzle setup
- Docker container config

**Medium:**
- Drizzle schema design
- API route implementation (straightforward CRUD)
- TanStack Query integration

**High:**
- Converting 8 Zustand stores to query hooks
- PromptParser context building (currently direct DB access)
- Lexical SaveChapterContent (auto-save to API)
- AI streaming integration

## Risks

- Auto-save latency (IndexedDB instant vs network call)
- AI streaming performance over LAN
- No existing data to migrate (demo content can be regenerated)

## Out of Scope

- Multi-user support
- Authentication
- Concurrent editing conflict resolution
- Real-time collaboration

## Success Criteria

- App runs in Docker container
- Accessible from any device on LAN
- All existing features work identically
- Single SQLite database persists data
- No Tauri dependencies remaining
