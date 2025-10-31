# Test Implementation Plan

## Overview

Comprehensive test infrastructure for The Story Nexus covering unit tests (Vitest) and E2E tests (Playwright), with tests enforced as build prerequisites.

---

## 1. Test Framework Configuration

### 1.1 Vitest Setup (Unit & Integration Tests)

**Installation:**
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
```

**Configuration (`vitest.config.ts`):**
- Extend from `vite.config.ts` to preserve path aliases (`@/*`, `shared/*`)
- Use `happy-dom` environment for React component tests
- Configure coverage thresholds (80% target)
- Mock IndexedDB using `fake-indexeddb`
- Setup test globals and cleanup
- Exclude `src-tauri/`, `dist/`, `node_modules/`, `src/Lexical/lexical-playground/` from coverage

**Mock Strategy:**
- Mock Dexie database with in-memory fake-indexeddb
- Mock Tauri APIs (if invoked from frontend)
- Mock OpenAI SDK responses for AI service tests
- Mock `localStorage` for storageService tests

### 1.2 Playwright Setup (E2E Tests)

**Installation:**
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

**Configuration (`playwright.config.ts`):**
- Base URL: `http://localhost:1420` (Vite dev server)
- Test directory: `e2e/`
- Browsers: Chromium (primary), Firefox, WebKit (optional)
- Parallel execution with workers
- Retries: 2 on CI, 0 locally
- Screenshot/video on failure
- Trace collection on first retry

**Test Data Strategy:**
- Seed IndexedDB with realistic demo stories, chapters, lorebook entries
- Use Page Object Model pattern for maintainability
- Isolate tests with fresh database state per test file

---

## 2. Test Scripts & Build Integration

### 2.1 Package.json Scripts

Add to `scripts` section:

```json
{
  "test": "npm run test:unit && npm run test:e2e",
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:unit:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report",
  "prebuild": "npm run test",
  "build": "tsc && vite build",
  "build:skip-tests": "tsc && vite build"
}
```

### 2.2 Build Prerequisites

- **`prebuild` script** runs full test suite automatically before `npm run build`
- Production builds fail if tests fail (exit code propagation)
- Provide `build:skip-tests` escape hatch for emergency deploys
- CI/CD pipelines should use `npm run build` (includes tests)

---

## 3. Unit Test Coverage Plan

### 3.1 Core Services (`src/services/`)

#### Database Layer
- **`database.test.ts`**
  - Table schema validation
  - Story creation with auto-generated fields
  - Cascading delete (`deleteStoryWithRelated`)
  - Version migrations
  - System prompt seeding

#### AI Services
- **`AIService.test.ts`**
  - Singleton instance management
  - Provider initialization (OpenAI, OpenRouter, Local)
  - API key storage/retrieval
  - Model fetching from providers
  - Stream generation with mock responses
  - Abort signal handling
  - Error handling for invalid keys/URLs

- **`AIProviderFactory.test.ts`**
  - Factory pattern: correct provider instantiation based on type
  - Configuration passing to providers

- **`OpenAIProvider.test.ts`**
  - Chat completion streaming with mocked OpenAI SDK
  - Model fetching
  - Error handling (API errors, network failures)

- **`OpenRouterProvider.test.ts`**
  - Similar to OpenAI but with OpenRouter-specific headers
  - Model list parsing

- **`LocalAIProvider.test.ts`**
  - Custom URL support
  - LM Studio compatibility

#### Export/Import Services
- **`StoryExportService.test.ts`**
  - Complete story export with all related entities
  - JSON structure validation
  - Filename generation

- **`StoryImportService.test.ts`**
  - Import validation
  - Conflict resolution
  - Partial import handling
  - Error cases (malformed JSON, missing fields)

- **`FileDownloadUtil.test.ts`**
  - Blob creation
  - Download trigger simulation

### 3.2 Feature Stores (`src/features/*/stores/`)

#### Story Store
- **`useStoryStore.test.ts`**
  - CRUD operations
  - Story listing with sorting
  - Cascading delete verification
  - Error handling

#### Chapter Stores
- **`useChapterStore.test.ts`**
  - Facade delegation to sub-stores
  - Current chapter state management

- **`useChapterDataStore.test.ts`**
  - Chapter CRUD
  - Order management
  - Editing history tracking

- **`useChapterContentStore.test.ts`**
  - Lexical state extraction
  - Plain text conversion
  - Content retrieval

- **`useChapterMetadataStore.test.ts`**
  - Summary management
  - Outline updates
  - Summary aggregation

#### AI Store
- **`useAIStore.test.ts`**
  - AIService initialization
  - Provider key management
  - Model fetching
  - Generation execution with prompt parsing
  - Stream processing
  - Abort functionality

#### Lorebook Stores
- **`useLorebookStore.test.ts`**
  - Filtered queries
  - Category filtering
  - Tag-based matching
  - Import/export

- **`useLorebookDataStore.test.ts`**
  - Entry CRUD
  - Batch operations

- **`LorebookFilterService.test.ts`**
  - Category filters
  - Tag matching logic
  - Importance/status filters

- **`LorebookImportExportService.test.ts`**
  - JSON serialization
  - Name collision handling

#### Prompt Store
- **`usePromptStore.test.ts`**
  - Prompt CRUD
  - Message validation
  - Clone functionality
  - Import/export with collision resolution
  - System prompt protection

#### Brainstorm Store
- **`useBrainstormStore.test.ts`**
  - Chat session management
  - Message CRUD
  - Draft message handling
  - Edited message tracking

#### Notes Store
- **`useNotesStore.test.ts`**
  - Note CRUD
  - Type categorization
  - Sorted retrieval

### 3.3 Feature Services

#### Prompt System
- **`promptParser.test.ts`**
  - Variable substitution for all 40+ variables
  - Function syntax parsing
  - Comment stripping
  - Context building
  - Error handling for undefined variables

- **`ContextBuilder.test.ts`**
  - Database-dependent context gathering
  - Matched entries retrieval
  - Summary aggregation
  - Previous words extraction

- **`VariableResolverRegistry.test.ts`**
  - Resolver registration
  - Resolver lookup
  - Custom resolver addition

- **Resolver Tests:**
  - `ChapterResolvers.test.ts` - All chapter-related variables
  - `LorebookResolvers.test.ts` - All lorebook variables
  - `MetadataResolvers.test.ts` - POV, selection, language
  - `BrainstormResolvers.test.ts` - Chat history, user input
  - `LorebookFormatter.test.ts` - Markdown formatting

#### Scene Beat Service
- **`sceneBeatService.test.ts`**
  - Scene beat CRUD
  - Batch operations
  - Chapter association

- **`sceneBeatPromptService.test.ts`**
  - Prompt config building
  - Context mode handling
  - Lorebook entry selection

### 3.4 Utilities (`src/utils/`)

- **`logger.test.ts`** - Logging levels, dev-only debug
- **`errorUtils.test.ts`** - Error message extraction
- **`idGenerator.test.ts`** - UUID generation, uniqueness
- **`storageService.test.ts`** - localStorage wrapper operations
- **`exportUtils.test.ts`** - JSON serialization, filename generation

### 3.5 Shared Components

- **Component tests for:**
  - `ai-generate-menu.test.tsx` - Model/prompt selection UI
  - `prompt-select-menu.test.tsx` - Prompt picker with filtering
  - `prompt-preview-dialog.test.tsx` - Parsed prompt display
  - `prompt-config-dialog.test.tsx` - Parameter configuration
  - `DownloadMenu.test.tsx` - Export dropdown

### 3.6 Lexical Custom Nodes & Plugins

#### Custom Nodes
- **`SceneBeatNode.test.tsx`**
  - Node serialization/deserialization
  - Rendering with controls
  - Context toggle state
  - POV settings
  - Generation trigger

#### Core Plugins
- **`SaveChapterContent.test.tsx`**
  - Debounced save (1s)
  - Database update verification

- **`LoadChapterContent.test.tsx`**
  - Editor initialization from DB

- **`LorebookTagPlugin.test.tsx`**
  - Text content monitoring
  - Tag matching logic
  - Debounce behavior (500ms)

- **`SceneBeatShortcutPlugin.test.tsx`**
  - Alt+S / Option+S keybinding
  - Scene beat node insertion

- **`WordCountPlugin.test.tsx`**
  - Real-time word count calculation

#### Scene Beat Hooks
- **`useSceneBeatData.test.ts`** - Command text management
- **`useCommandHistory.test.ts`** - Undo/redo functionality
- **`useLorebookMatching.test.ts`** - Tag-based matching
- **`useSceneBeatSync.test.ts`** - DB synchronization
- **`useSceneBeatGeneration.test.ts`** - AI generation orchestration

#### Scene Beat Services
- **`lexicalEditorUtils.test.ts`** - Editor manipulation utilities

### 3.7 Test Data Fixtures

Create `src/test/fixtures/` with:
- `storyFixtures.ts` - Sample stories
- `chapterFixtures.ts` - Sample chapters with Lexical editor state
- `lorebookFixtures.ts` - Sample characters, locations, items
- `promptFixtures.ts` - Sample prompts with variables
- `chatFixtures.ts` - Sample chat sessions
- `sceneBeatFixtures.ts` - Sample scene beats

---

## 4. E2E Test Coverage Plan

### 4.1 Test Structure

```
e2e/
├── fixtures/
│   ├── demo-story-seed.ts      # Complete demo story with all entities
│   └── test-data.json          # Realistic test data
├── pages/                      # Page Object Models
│   ├── StoryListPage.ts
│   ├── ChapterEditorPage.ts
│   ├── LorebookPage.ts
│   ├── BrainstormPage.ts
│   ├── PromptsPage.ts
│   └── AISettingsPage.ts
├── tests/
│   ├── story-management.spec.ts
│   ├── chapter-editing.spec.ts
│   ├── lorebook-management.spec.ts
│   ├── ai-generation.spec.ts
│   ├── brainstorm-flow.spec.ts
│   ├── prompt-management.spec.ts
│   ├── scene-beats.spec.ts
│   ├── export-import.spec.ts
│   └── full-workflow.spec.ts
└── utils/
    ├── db-helpers.ts           # IndexedDB seeding/cleanup
    └── test-helpers.ts         # Common test utilities
```

### 4.2 Test Scenarios

#### Story Management (`story-management.spec.ts`)
1. Create new story with title, genre, language
2. Edit story metadata
3. Delete story (verify cascading delete)
4. Navigate to story dashboard
5. Verify story list display and sorting

#### Chapter Editing (`chapter-editing.spec.ts`)
1. Create new chapter
2. Enter text in Lexical editor
3. Verify auto-save (wait for debounce)
4. Edit chapter title and metadata
5. Reorder chapters via drag-drop
6. Delete chapter
7. Verify word count updates
8. Format text (bold, italic, lists)
9. Insert links, images
10. Use markdown shortcuts

#### Lorebook Management (`lorebook-management.spec.ts`)
1. Create character entry with tags
2. Create location, item, event entries
3. Filter by category
4. Search by tag
5. Edit entry content
6. Toggle entry enabled/disabled
7. Delete entry
8. Import lorebook JSON
9. Export lorebook JSON
10. Verify tag matching in chapter editor

#### AI Generation (`ai-generation.spec.ts`)
1. Configure API key for provider
2. Fetch available models
3. Select model from dropdown
4. Choose prompt template
5. Preview parsed prompt with variable substitution
6. Trigger generation (mock AI response)
7. Verify streamed output display
8. Abort generation mid-stream
9. Adjust generation parameters (temp, max tokens)

#### Scene Beats (`scene-beats.spec.ts`)
1. Insert scene beat with Alt+S
2. Enter scene beat command
3. Toggle context modes (matched chapter/scene beat/custom)
4. Select custom lorebook entries
5. Configure POV settings
6. Trigger scene beat generation (mock)
7. Review generated content
8. Accept generated content (insert into editor)
9. Regenerate with different settings
10. Delete scene beat

#### Brainstorm Flow (`brainstorm-flow.spec.ts`)
1. Create new brainstorm chat
2. Send user message
3. Receive AI response (mock)
4. Edit previous message
5. Continue conversation thread
6. Select context (lorebook entries, chapter summaries)
7. Change prompt mid-conversation
8. Delete chat
9. Switch between multiple chats

#### Prompt Management (`prompt-management.spec.ts`)
1. Create custom prompt
2. Add system and user messages
3. Use variable syntax (`{{chapter_content}}`)
4. Set allowed models
5. Set prompt type
6. Clone existing prompt
7. Edit prompt
8. Delete prompt (verify system prompts protected)
9. Import prompts JSON
10. Export prompts JSON (verify system prompts excluded)

#### Export/Import (`export-import.spec.ts`)
1. Export complete story as JSON
2. Verify export includes all entities (chapters, lorebook, chats, notes)
3. Delete story
4. Import story from JSON
5. Verify all data restored correctly
6. Handle import conflicts

#### Full Creative Workflow (`full-workflow.spec.ts`)

**Realistic end-to-end scenario:**

1. **Story Setup**
   - Create story "The Quantum Heist" (sci-fi, English)
   - Add 3 characters to lorebook (protagonist, antagonist, mentor)
   - Add 2 locations (space station, black hole research lab)
   - Add 3 items (quantum key, neural interface, time-lock)
   - Tag entries appropriately

2. **Chapter 1 - Opening Scene**
   - Create "Chapter 1: The Briefing"
   - Write opening paragraph manually
   - Insert scene beat: "Describe the quantum vault security system"
   - Use matched chapter context (pulls character/location tags)
   - Generate and accept scene beat
   - Continue writing
   - Add chapter summary

3. **Brainstorm Session**
   - Open brainstorm chat
   - Ask: "What twist could complicate the heist?"
   - Provide chapter context
   - Receive AI suggestion
   - Create new lorebook entry from idea

4. **Chapter 2 - Conflict**
   - Create "Chapter 2: The Double-Cross"
   - Use "Continue Writing" prompt with previous words context
   - Insert scene beat with custom POV (antagonist, first person)
   - Select specific lorebook entries for context
   - Generate action sequence
   - Verify word count updates across both chapters

5. **Export & Backup**
   - Export story with all content
   - Verify JSON structure
   - Download file

**Success Criteria:**
- All database operations succeed
- AI generation requests formatted correctly (mocked responses work)
- Lexical editor state persists correctly
- Lorebook matching works across all contexts
- Export includes all entities
- No console errors throughout workflow

### 4.3 Realistic Test Data

#### Demo Story: "The Quantum Heist"

**Story Metadata:**
- Title: "The Quantum Heist"
- Genre: Science Fiction
- Language: English
- Synopsis: "In 2157, a crew of quantum thieves must steal a device that can rewrite the past—but their employer has darker intentions than they realize."

**Characters (10):**
- Alex Chen (protagonist, quantum physicist, pragmatic)
- Zara Okonkwo (hacker, witty, loyal)
- Dr. Elias Voss (antagonist, scientist, obsessive)
- Maya Singh (mentor, former thief, wise)
- Marcus Grey (security chief, suspicious, methodical)
- Ren Takahashi (pilot, reckless, skilled)
- Olivia Cross (corporate exec, calculating, ambitious)
- Kai Brennan (engineer, nervous, brilliant)
- Juno (AI companion, curious, evolving)
- Viktor Petrov (black market dealer, shady, resourceful)

**Locations (8):**
- Cronos Station (orbital research facility, high security)
- The Nexus (underground bar, information hub)
- Quantum Vault (temporal-locked chamber, impossible to breach)
- Black Hole Observatory (research lab, gravity distortions)
- Neo-Singapore (sprawling megacity, corporate controlled)
- The Drift (abandoned station, lawless refuge)
- Voss Industries HQ (corporate tower, sterile environment)
- Temporal Nexus Chamber (experimental lab, reality unstable)

**Items (6):**
- Quantum Key (device that rewrites causality)
- Neural Interface (direct brain-to-machine connection)
- Chrono-Lock (temporal security system)
- Phase Cloak (stealth technology)
- Memory Chip (contains stolen secrets)
- Fusion Core (power source, unstable)

**Events (5):**
- The Briefing (crew assembled for job)
- Vault Infiltration (heist begins, complications arise)
- The Betrayal (Voss reveals true intentions)
- Reality Fracture (quantum key activated, timeline splits)
- Final Confrontation (crew vs Voss in temporal flux)

**Timeline:**
- 2140: Quantum Key discovered
- 2145: Black Hole Observatory established
- 2150: Dr. Voss begins experiments
- 2155: First temporal anomaly detected
- 2157: Present day—heist takes place
- 2160: (alternate timeline) Voss succeeds, reality collapses

**Chapters (3):**
1. "The Briefing" (2,500 words)—Maya recruits the crew
2. "The Double-Cross" (3,200 words)—Infiltration goes wrong
3. "Temporal Reckoning" (2,800 words)—Showdown in fractured time

**Scene Beats (5 examples):**
- "Describe the quantum vault's security measures from Alex's perspective"
- "Marcus discovers evidence of the heist. Show his internal conflict"
- "Zara hacks the chrono-lock. Technical details and suspense"
- "Voss monologue revealing his plan to prevent his daughter's death"
- "Reality fractures around the crew as timelines collapse"

**Prompts (8 custom):**
- "Sci-Fi Action Scene" (scene_beat)
- "Technical Jargon Generator" (scene_beat)
- "Character Internal Monologue" (scene_beat)
- "Heist Complication" (brainstorm)
- "World-Building Details" (brainstorm)
- "Cliffhanger Ending" (continue_writing)
- "POV Switch" (selection_specific)
- "Timeline Plot Holes" (brainstorm)

**AI Chat Sessions (2):**
1. "Plot Development"—6 message exchanges about heist complications
2. "Character Motivations"—4 message exchanges exploring Voss's backstory

**Notes (3):**
- Idea: "What if quantum key affects user's memories too?"
- Research: "Black hole time dilation effects"
- Todo: "Revise chapter 2 pacing, add Ren character moment"

---

## 5. Implementation Phases

### Phase 1: Infrastructure (Week 1)
- Install Vitest and Playwright dependencies
- Configure `vitest.config.ts` and `playwright.config.ts`
- Add test scripts to `package.json`
- Configure prebuild hook
- Setup mock strategies (IndexedDB, AI providers)
- Create test fixtures directory structure

### Phase 2: Unit Tests - Core Services (Week 2)
- Database tests (`database.test.ts`)
- AI service tests (`AIService.test.ts`, provider tests)
- Export/import service tests
- Utilities tests
- Target: 100% coverage for services

### Phase 3: Unit Tests - Stores (Week 3)
- Story store tests
- Chapter store tests (3 sub-stores)
- Lorebook store tests
- Prompt, brainstorm, notes store tests
- Target: 90% coverage for stores

### Phase 4: Unit Tests - Feature Services (Week 4)
- Prompt parser and resolver tests
- Context builder tests
- Scene beat service tests
- Target: 95% coverage for parsers/resolvers

### Phase 5: Unit Tests - Components & Lexical (Week 5)
- Shared component tests
- Lexical node tests
- Lexical plugin tests
- Scene beat hook tests
- Target: 80% coverage for components/nodes

### Phase 6: E2E Tests - Core Flows (Week 6)
- Story management tests
- Chapter editing tests
- Lorebook management tests
- Page Object Models
- Create "The Quantum Heist" seed data

### Phase 7: E2E Tests - Advanced Features (Week 7)
- AI generation tests (with mocks)
- Scene beat tests
- Brainstorm flow tests
- Prompt management tests

### Phase 8: E2E Tests - Integration & Workflow (Week 8)
- Export/import tests
- Full creative workflow test
- Cross-feature integration tests
- Performance benchmarks

### Phase 9: Coverage & Refinement (Week 9)
- Achieve coverage targets (80% overall)
- Fix flaky tests
- Optimize test performance
- Documentation (test README)

### Phase 10: CI/CD Integration (Week 10)
- GitHub Actions workflow (optional, if CI planned)
- Pre-commit hooks (optional)
- Test report generation
- Badge integration

---

## 6. Coverage Targets

| Category | Target Coverage |
|----------|----------------|
| Services | 100% |
| Stores | 90% |
| Feature Services (Parsers/Resolvers) | 95% |
| Utilities | 100% |
| Components | 80% |
| Lexical Nodes/Plugins | 80% |
| **Overall** | **85%** |

---

## 7. Testing Best Practices

### Unit Tests
- **Isolation:** Mock external dependencies (DB, AI, browser APIs)
- **Fast:** Keep unit tests under 100ms each
- **Focused:** One logical assertion per test
- **Readable:** Use descriptive test names (`it('should create story with auto-generated ID')`)
- **AAA Pattern:** Arrange, Act, Assert

### E2E Tests
- **Realistic:** Use complete, realistic test data (The Quantum Heist)
- **Isolated:** Fresh database state per test file
- **Resilient:** Use Playwright's auto-wait, avoid manual sleeps
- **Page Objects:** Encapsulate selectors and actions
- **Visual Regression:** Screenshot comparison for critical UI (optional)

### Maintenance
- **Keep tests DRY:** Share fixtures and helpers
- **Update with code:** Tests are first-class code
- **Monitor flakiness:** Re-run flaky tests, fix or skip
- **Review coverage:** Track untested paths in coverage reports

---

## 8. Open Questions & Decisions

1. **Tauri Integration:** Do E2E tests need to run against Tauri webview (desktop app) or just Vite dev server (web)?
   - **Recommendation:** Start with Vite dev server for speed, add Tauri E2E later if needed

2. **AI Mocking Strategy:** Mock at HTTP level (MSW) or mock provider classes directly?
   - **Recommendation:** Mock provider classes directly in unit tests, use MSW for E2E if real API calls needed

3. **Lexical Testing:** Full Lexical editor state testing or focus on custom nodes/plugins?
   - **Recommendation:** Focus on custom code (SceneBeatNode, plugins), trust Lexical core library

4. **Snapshot Testing:** Use snapshot tests for Lexical state or component rendering?
   - **Recommendation:** Minimal snapshots (brittle), prefer explicit assertions

5. **CI Environment:** GitHub Actions, GitLab CI, or local-only?
   - **Recommendation:** Suggest GitHub Actions workflow if repo on GitHub

6. **Test Data Maintenance:** Keep "The Quantum Heist" fixture updated as schema evolves?
   - **Recommendation:** Version fixtures, update with breaking DB changes

---

## 9. Success Metrics

- ✅ All unit tests pass (target: 85%+ coverage)
- ✅ All E2E tests pass (10+ realistic scenarios)
- ✅ Build fails if tests fail (`prebuild` hook works)
- ✅ Test suite runs in under 5 minutes (unit + E2E)
- ✅ Zero flaky tests (or documented/skipped)
- ✅ Documentation: README in `src/test/` and `e2e/`

---

## 10. Next Steps

1. ✅ Review and approve this plan (Guv)
2. Create feature branch: `feature/test-infrastructure`
3. Install dependencies (Vitest, Playwright, testing libraries)
4. Configure test runners
5. Implement Phase 1 (infrastructure)
6. Begin Phase 2 (unit tests for services)
7. Iterate through phases 3-10
8. Merge to main with full test coverage

---

**Total Estimated Tests:**
- Unit Tests: ~150-200 test files
- E2E Tests: ~50-70 test scenarios
- Total Test Coverage: 85%+ across codebase

This plan provides comprehensive test coverage for The Story Nexus, ensuring reliability, maintainability, and confidence in production deployments.
