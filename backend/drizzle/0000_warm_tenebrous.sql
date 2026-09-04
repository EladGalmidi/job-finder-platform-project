CREATE TYPE "public"."auth_provider" AS ENUM('email', 'google', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."content_language" AS ENUM('en', 'he');--> statement-breakpoint
CREATE TYPE "public"."job_source" AS ENUM('linkedin', 'comeet', 'greenhouse', 'company');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('fullTime', 'partTime', 'contract', 'student', 'internship');--> statement-breakpoint
CREATE TYPE "public"."remote_mode" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TYPE "public"."role_key" AS ENUM('devops', 'backend', 'frontend', 'fullstack', 'productManager', 'data', 'sales');--> statement-breakpoint
CREATE TYPE "public"."seniority" AS ENUM('junior', 'mid', 'senior', 'lead', 'principal');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('language', 'framework', 'cloud', 'tool', 'soft', 'methodology');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('basic', 'proficient', 'expert');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_text" text NOT NULL,
	"logo_color" text NOT NULL,
	"industry" text NOT NULL,
	"size_range" text NOT NULL,
	"website" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"level" "skill_level",
	"weight" real
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"role_key" "role_key" NOT NULL,
	"company_id" text NOT NULL,
	"location" text NOT NULL,
	"remote_mode" "remote_mode" NOT NULL,
	"job_type" "job_type" NOT NULL,
	"seniority" "seniority" NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"salary_period" text,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"responsibilities" text[] DEFAULT '{}' NOT NULL,
	"requirements" text[] DEFAULT '{}' NOT NULL,
	"nice_to_have" text[] DEFAULT '{}' NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"source" "job_source" NOT NULL,
	"external_url" text NOT NULL,
	"is_promoted" boolean DEFAULT false NOT NULL,
	"applicants_count" integer DEFAULT 0 NOT NULL,
	"content_language" "content_language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_id" text,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "skill_category" NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"provider" "auth_provider" DEFAULT 'email' NOT NULL,
	"avatar_url" text,
	"headline" text,
	"preferences" jsonb,
	"onboarding_completed_at" timestamp with time zone,
	"active_cv_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_skills_unique" ON "job_skills" USING btree ("job_id","skill_id");--> statement-breakpoint
CREATE INDEX "job_skills_skill_id_idx" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "jobs_posted_at_idx" ON "jobs" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "jobs_role_key_idx" ON "jobs" USING btree ("role_key");--> statement-breakpoint
CREATE INDEX "jobs_seniority_idx" ON "jobs" USING btree ("seniority");--> statement-breakpoint
CREATE INDEX "jobs_remote_mode_idx" ON "jobs" USING btree ("remote_mode");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));