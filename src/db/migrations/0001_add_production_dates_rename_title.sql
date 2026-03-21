ALTER TABLE "productions" RENAME COLUMN "title" TO "description";--> statement-breakpoint
ALTER TABLE "productions" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "productions" ADD COLUMN "end_date" date;
