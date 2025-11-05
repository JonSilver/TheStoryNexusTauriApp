import fs from 'fs';
import path from 'path';

// Read the old format file
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node convert-export.js <input-file> [output-file]');
  process.exit(1);
}

const outputFile = process.argv[3] || inputFile.replace('.json', '-converted.json');

const oldData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Convert to new format
const newData = {
  version: oldData.version || "1.0",
  exportedAt: oldData.exportDate || new Date().toISOString(),
  tables: {
    stories: oldData.stories || [],
    chapters: oldData.chapters || [],
    prompts: oldData.prompts || [],
    aiSettings: oldData.aiSettings || [],
    lorebookEntries: oldData.lorebookEntries || [],
    sceneBeats: oldData.sceneBeats || [],
    aiChats: oldData.aiChats || [],
    notes: oldData.notes || []
  }
};

// Write converted file
fs.writeFileSync(outputFile, JSON.stringify(newData, null, 2));

console.log(`Converted ${inputFile} to ${outputFile}`);
console.log(`Stories: ${newData.tables.stories.length}`);
console.log(`Chapters: ${newData.tables.chapters.length}`);
console.log(`Prompts: ${newData.tables.prompts.length}`);
console.log(`AI Settings: ${newData.tables.aiSettings.length}`);
console.log(`Lorebook Entries: ${newData.tables.lorebookEntries.length}`);
console.log(`Scene Beats: ${newData.tables.sceneBeats.length}`);
console.log(`AI Chats: ${newData.tables.aiChats.length}`);
console.log(`Notes: ${newData.tables.notes.length}`);
