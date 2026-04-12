/*
  Warnings:

  - The primary key for the `amrResistanceGenes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `amrResistanceGenes` table. All the data in the column will be lost.
  - The primary key for the `metagenomic` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `metagenomic` table. All the data in the column will be lost.
  - The primary key for the `virulenceGenes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `virulenceGenes` table. All the data in the column will be lost.
  - The primary key for the `wgs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `wgs` table. All the data in the column will be lost.
  - You are about to drop the `measurements` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `geneSymbol` on table `amrResistanceGenes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sequence_name` on table `metagenomic` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `sampleID` to the `virulenceGenes` table without a default value. This is not possible if the table is not empty.
  - Made the column `geneSymbol` on table `virulenceGenes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "amrResistanceGenes" DROP CONSTRAINT "amrResistanceGenes_sampleID_fkey";

-- DropForeignKey
ALTER TABLE "metagenomic" DROP CONSTRAINT "metagenomic_sampleID_fkey";

-- DropForeignKey
ALTER TABLE "virulenceGenes" DROP CONSTRAINT "virulenceGenes_isolateID_fkey";

-- DropForeignKey
ALTER TABLE "wgs" DROP CONSTRAINT "wgs_sampleID_fkey";

-- AlterTable
ALTER TABLE "amrResistanceGenes" DROP CONSTRAINT "amrResistanceGenes_pkey",
DROP COLUMN "id",
ALTER COLUMN "geneSymbol" SET NOT NULL,
ADD CONSTRAINT "amrResistanceGenes_pkey" PRIMARY KEY ("sampleID", "geneSymbol");

-- AlterTable
ALTER TABLE "metagenomic" DROP CONSTRAINT "metagenomic_pkey",
DROP COLUMN "id",
ALTER COLUMN "sequence_name" SET NOT NULL,
ADD CONSTRAINT "metagenomic_pkey" PRIMARY KEY ("sampleID", "sequence_name");

-- AlterTable
ALTER TABLE "virulenceGenes" DROP CONSTRAINT "virulenceGenes_pkey",
DROP COLUMN "id",
ADD COLUMN     "sampleID" INTEGER NOT NULL,
ALTER COLUMN "geneSymbol" SET NOT NULL,
ADD CONSTRAINT "virulenceGenes_pkey" PRIMARY KEY ("sampleID", "isolateID", "geneSymbol");

-- AlterTable
ALTER TABLE "wgs" DROP CONSTRAINT "wgs_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "wgs_pkey" PRIMARY KEY ("sampleID", "isolateID");

-- DropTable
DROP TABLE "measurements";

-- CreateTable
CREATE TABLE "samples" (
    "sampleID" SERIAL NOT NULL,
    "water_temperature" DECIMAL(5,2),
    "ph" DECIMAL(4,2),
    "tds" DECIMAL(8,2),
    "do" DECIMAL(8,2),
    "sample_analysis_type" VARCHAR(255),
    "isolation_source" VARCHAR(255),
    "collection_date" TIMESTAMP(3),
    "location_name" VARCHAR(255),
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "collected_by" VARCHAR(255),
    "predicted_sir_profile" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("sampleID")
);

-- AddForeignKey
ALTER TABLE "metagenomic" ADD CONSTRAINT "metagenomic_sampleID_fkey" FOREIGN KEY ("sampleID") REFERENCES "samples"("sampleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wgs" ADD CONSTRAINT "wgs_sampleID_fkey" FOREIGN KEY ("sampleID") REFERENCES "samples"("sampleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amrResistanceGenes" ADD CONSTRAINT "amrResistanceGenes_sampleID_fkey" FOREIGN KEY ("sampleID") REFERENCES "samples"("sampleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virulenceGenes" ADD CONSTRAINT "virulenceGenes_sampleID_isolateID_fkey" FOREIGN KEY ("sampleID", "isolateID") REFERENCES "wgs"("sampleID", "isolateID") ON DELETE RESTRICT ON UPDATE CASCADE;
