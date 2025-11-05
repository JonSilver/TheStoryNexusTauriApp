CREATE TABLE `aiChats` (
	`id` text PRIMARY KEY NOT NULL,
	`storyId` text NOT NULL,
	`title` text NOT NULL,
	`messages` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	`isDemo` integer,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_story_id_idx` ON `aiChats` (`storyId`);--> statement-breakpoint
CREATE TABLE `aiSettings` (
	`id` text PRIMARY KEY NOT NULL,
	`openaiKey` text,
	`openrouterKey` text,
	`availableModels` text NOT NULL,
	`lastModelsFetch` integer,
	`localApiUrl` text,
	`defaultLocalModel` text,
	`defaultOpenAIModel` text,
	`defaultOpenRouterModel` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`storyId` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`order` integer NOT NULL,
	`content` text NOT NULL,
	`outline` text,
	`wordCount` integer DEFAULT 0 NOT NULL,
	`povCharacter` text,
	`povType` text,
	`notes` text,
	`createdAt` integer NOT NULL,
	`isDemo` integer,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapter_story_id_idx` ON `chapters` (`storyId`);--> statement-breakpoint
CREATE INDEX `chapter_order_idx` ON `chapters` (`order`);--> statement-breakpoint
CREATE TABLE `lorebookEntries` (
	`id` text PRIMARY KEY NOT NULL,
	`storyId` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`metadata` text,
	`isDisabled` integer,
	`createdAt` integer NOT NULL,
	`isDemo` integer,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lorebook_story_id_idx` ON `lorebookEntries` (`storyId`);--> statement-breakpoint
CREATE INDEX `lorebook_category_idx` ON `lorebookEntries` (`category`);--> statement-breakpoint
CREATE INDEX `lorebook_name_idx` ON `lorebookEntries` (`name`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`storyId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`type` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`isDemo` integer,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `note_story_id_idx` ON `notes` (`storyId`);--> statement-breakpoint
CREATE INDEX `note_type_idx` ON `notes` (`type`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`promptType` text NOT NULL,
	`messages` text NOT NULL,
	`allowedModels` text NOT NULL,
	`storyId` text,
	`isSystem` integer,
	`temperature` integer,
	`maxTokens` integer,
	`top_p` integer,
	`top_k` integer,
	`repetition_penalty` integer,
	`min_p` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prompt_name_idx` ON `prompts` (`name`);--> statement-breakpoint
CREATE INDEX `prompt_type_idx` ON `prompts` (`promptType`);--> statement-breakpoint
CREATE INDEX `prompt_story_id_idx` ON `prompts` (`storyId`);--> statement-breakpoint
CREATE TABLE `sceneBeats` (
	`id` text PRIMARY KEY NOT NULL,
	`storyId` text NOT NULL,
	`chapterId` text NOT NULL,
	`command` text NOT NULL,
	`povType` text,
	`povCharacter` text,
	`generatedContent` text,
	`accepted` integer,
	`metadata` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scenebeat_story_id_idx` ON `sceneBeats` (`storyId`);--> statement-breakpoint
CREATE INDEX `scenebeat_chapter_id_idx` ON `sceneBeats` (`chapterId`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`language` text NOT NULL,
	`synopsis` text,
	`createdAt` integer NOT NULL,
	`isDemo` integer
);
--> statement-breakpoint
CREATE INDEX `title_idx` ON `stories` (`title`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `stories` (`createdAt`);