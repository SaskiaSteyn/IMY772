/*
  Warnings:

  - The `uploaded_by` column on the `samples` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "samples" DROP COLUMN "uploaded_by",
ADD COLUMN     "uploaded_by" INTEGER;
