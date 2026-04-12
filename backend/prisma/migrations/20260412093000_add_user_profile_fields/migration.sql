-- Add persisted profile fields to users table
ALTER TABLE "users"
ADD COLUMN "bio" TEXT,
ADD COLUMN "interests" JSONB,
ADD COLUMN "education" JSONB,
ADD COLUMN "experience" JSONB,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
