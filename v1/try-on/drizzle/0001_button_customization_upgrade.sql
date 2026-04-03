ALTER TABLE "Merchant" ADD COLUMN "widgetButtonSize" bigint DEFAULT 56 NOT NULL;
--> statement-breakpoint
ALTER TABLE "Merchant" ADD COLUMN "widgetButtonIcon" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "Merchant" ADD COLUMN "widgetButtonIconPosition" text DEFAULT 'none' NOT NULL;
