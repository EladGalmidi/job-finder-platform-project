CREATE TYPE "public"."analysis_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "analysis_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"cv_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "analysis_status" DEFAULT 'queued' NOT NULL,
	"current_step" text DEFAULT 'parsing' NOT NULL,
	"completed_steps" text[] DEFAULT '{}' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cv_analyses" (
	"cv_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cvs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"extracted_text" text,
	"extraction" jsonb,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_analyses" ADD CONSTRAINT "cv_analyses_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_analyses" ADD CONSTRAINT "cv_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_jobs_cv_id_idx" ON "analysis_jobs" USING btree ("cv_id");--> statement-breakpoint
CREATE INDEX "cv_analyses_user_id_idx" ON "cv_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cvs_user_id_idx" ON "cvs" USING btree ("user_id");