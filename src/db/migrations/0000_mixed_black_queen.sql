CREATE TYPE "public"."extra_scene_status" AS ENUM('proposed', 'contacted', 'confirmed', 'arrived');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('manual', 'public_form');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'director', 'guest');--> statement-breakpoint
CREATE TABLE "attribute_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(100) NOT NULL,
	CONSTRAINT "attribute_options_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"extra_id" integer NOT NULL,
	"date" date NOT NULL,
	"is_available" boolean NOT NULL,
	"note" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "extra_attributes" (
	"extra_id" integer NOT NULL,
	"attribute_id" integer NOT NULL,
	CONSTRAINT "extra_attributes_extra_id_attribute_id_pk" PRIMARY KEY("extra_id","attribute_id")
);
--> statement-breakpoint
CREATE TABLE "extra_scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"extra_id" integer NOT NULL,
	"scene_id" integer NOT NULL,
	"status" "extra_scene_status" DEFAULT 'proposed' NOT NULL,
	"look" varchar(255),
	"situation" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extras" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" integer NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"age" integer,
	"gender" integer DEFAULT 1 NOT NULL,
	"height" integer,
	"weight" integer,
	"has_car" boolean DEFAULT false NOT NULL,
	"reliability" integer DEFAULT 2 NOT NULL,
	"notes" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"source" "source" DEFAULT 'manual' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"extra_id" integer NOT NULL,
	"r2_key" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registration_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"shooting_day_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"required_extras" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shooting_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" integer NOT NULL,
	"date" date NOT NULL,
	"title" varchar(255),
	"location" varchar(255),
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(255),
	"image" varchar(500),
	"role" "role" DEFAULT 'director' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_attributes" ADD CONSTRAINT "extra_attributes_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_attributes" ADD CONSTRAINT "extra_attributes_attribute_id_attribute_options_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_scenes" ADD CONSTRAINT "extra_scenes_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_scenes" ADD CONSTRAINT "extra_scenes_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras" ADD CONSTRAINT "extras_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_shooting_day_id_shooting_days_id_fk" FOREIGN KEY ("shooting_day_id") REFERENCES "public"."shooting_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shooting_days" ADD CONSTRAINT "shooting_days_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE no action ON UPDATE no action;