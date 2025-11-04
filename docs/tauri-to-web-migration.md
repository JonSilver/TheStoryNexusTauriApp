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

**Structure:** `server/` with Express app, Drizzle schema, API routes per feature

**Schema:** Mirror current Dexie tables (stories, chapters, aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes)

**Dependencies:** express, drizzle-orm, better-sqlite3

### 3. Frontend Changes

- Remove Dexie, replace with TanStack Query + API client
- Convert Zustand stores to query hooks
- UI components unchanged

### 4. Docker Setup

Single container: Node + built frontend, SQLite in mounted volume `/app/data`

### 5. Development Workflow

Concurrently run Express (port 3001) + Vite (port 5173, proxies `/api` to 3001)

### 6. Data Migration

**Export:** Read IndexedDB (still in browser) → download JSON
**Import:** Upload JSON → replace all SQLite contents

Simple migration page in new app with two buttons.

## Notes

- AI streaming: server-side proxy for API keys, SSE/WebSocket to client
- Auto-save: TanStack Query mutation with debounce and optimistic updates
- Lorebook matching: client-side logic, aggressive query caching
- Single-user only, no auth, no concurrent edit handling
