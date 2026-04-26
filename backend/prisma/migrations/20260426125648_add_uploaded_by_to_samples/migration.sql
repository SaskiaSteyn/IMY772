-- AlterTable
ALTER TABLE "samples" ADD COLUMN     "uploaded_by" VARCHAR(255);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;
