PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lorebookEntries` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text DEFAULT 'story' NOT NULL,
	`scopeId` text,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`metadata` text,
	`isDisabled` integer,
	`createdAt` integer NOT NULL,
	`isDemo` integer
);
--> statement-breakpoint
INSERT INTO `__new_lorebookEntries`("id", "level", "scopeId", "name", "description", "category", "tags", "metadata", "isDisabled", "createdAt", "isDemo") SELECT "id", "level", "scopeId", "name", "description", "category", "tags", "metadata", "isDisabled", "createdAt", "isDemo" FROM `lorebookEntries`;--> statement-breakpoint
DROP TABLE `lorebookEntries`;--> statement-breakpoint
ALTER TABLE `__new_lorebookEntries` RENAME TO `lorebookEntries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `lorebook_level_idx` ON `lorebookEntries` (`level`);--> statement-breakpoint
CREATE INDEX `lorebook_scope_id_idx` ON `lorebookEntries` (`scopeId`);--> statement-breakpoint
CREATE INDEX `lorebook_level_scope_idx` ON `lorebookEntries` (`level`,`scopeId`);--> statement-breakpoint
CREATE INDEX `lorebook_category_idx` ON `lorebookEntries` (`category`);--> statement-breakpoint
CREATE INDEX `lorebook_name_idx` ON `lorebookEntries` (`name`);