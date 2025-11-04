# Restoring AI Settings & Story Data

Your AI backend settings (API keys) weren't in the export files. This guide helps you restore them along with your story data.

## Quick Start: Import Everything At Once

1. **Edit `full-import-PRIVATE.json`**:
   - Replace `"sk-YOUR-OPENAI-API-KEY-HERE"` with your actual OpenAI API key
   - Replace `"sk-or-v1-YOUR-OPENROUTER-KEY-HERE"` with your actual OpenRouter API key
   - Update `localApiUrl` if you use a different local API endpoint (default is LM Studio on port 1234)
   - Update default models if needed

2. **Import the file**:
   - Start the dev server: `npm run dev`
   - Open http://localhost:5173 in your browser
   - Navigate to AI Settings page
   - Click the Import button
   - Select `full-import-PRIVATE.json`
   - Everything will be imported: story data + API keys

## Separate Files (Optional)

If you prefer to import things separately:
- `story-import.json` - Story data only (no API keys)
- `ai-settings-PRIVATE.json` - API keys only (no story data)

## Security Note

- These files contain placeholder API keys only - safe to commit
- After editing with your real keys, don't commit those changes
- Keep your edited versions local only

## Alternative: Manual Entry

You can also enter your API keys directly in the AI Settings page instead of using import.
