/*
  Warnings:

  - Added the required column `uploaded_by` to the `samples` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "samples" ADD COLUMN "uploaded_by" INTEGER NOT NULL DEFAULT 1;
-- Remove default after migration so only new records get it
ALTER TABLE "samples" ALTER COLUMN "uploaded_by" DROP DEFAULT;
