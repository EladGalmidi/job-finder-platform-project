CREATE TABLE "mock_scoring_results" (
	"cv_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_scoring_submissions" (
	"cv_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"document" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_scoring_results" ADD CONSTRAINT "mock_scoring_results_cv_id_mock_scoring_submissions_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."mock_scoring_submissions"("cv_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_scoring_results" ADD CONSTRAINT "mock_scoring_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_scoring_submissions" ADD CONSTRAINT "mock_scoring_submissions_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_scoring_submissions" ADD CONSTRAINT "mock_scoring_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mock_scoring_results_user_id_idx" ON "mock_scoring_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mock_scoring_submissions_user_id_idx" ON "mock_scoring_submissions" USING btree ("user_id");