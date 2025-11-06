CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` integer NOT NULL,
	`isDemo` integer
);
--> statement-breakpoint
CREATE INDEX `series_name_idx` ON `series` (`name`);--> statement-breakpoint
CREATE INDEX `series_created_at_idx` ON `series` (`createdAt`);--> statement-breakpoint
ALTER TABLE `lorebookEntries` ADD `level` text DEFAULT 'story' NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebookEntries` ADD `scopeId` text;--> statement-breakpoint
CREATE INDEX `lorebook_level_idx` ON `lorebookEntries` (`level`);--> statement-breakpoint
CREATE INDEX `lorebook_scope_id_idx` ON `lorebookEntries` (`scopeId`);--> statement-breakpoint
CREATE INDEX `lorebook_level_scope_idx` ON `lorebookEntries` (`level`,`scopeId`);--> statement-breakpoint
ALTER TABLE `stories` ADD `seriesId` text REFERENCES series(id);--> statement-breakpoint
CREATE INDEX `story_series_id_idx` ON `stories` (`seriesId`);--> statement-breakpoint
UPDATE lorebookEntries SET scopeId = storyId, level = 'story' WHERE storyId IS NOT NULL;