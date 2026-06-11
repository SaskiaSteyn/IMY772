-- AlterTable: add uploaded_by if it doesn't already exist (safe for both fresh and existing DBs)
ALTER TABLE "samples" ADD COLUMN IF NOT EXISTS "uploaded_by" INTEGER NOT NULL DEFAULT 1;
-- Remove default after migration so only new records require it explicitly
ALTER TABLE "samples" ALTER COLUMN "uploaded_by" DROP DEFAULT;
