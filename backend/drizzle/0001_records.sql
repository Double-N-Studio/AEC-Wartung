CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`rev` integer NOT NULL,
	`received_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text
);
--> statement-breakpoint
CREATE TABLE `passwords` (
	`user_id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`coll` text NOT NULL,
	`id` text NOT NULL,
	`value` text NOT NULL,
	`rev` integer NOT NULL,
	`client_id` text,
	`updated_by` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`coll`, `id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
