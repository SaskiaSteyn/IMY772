/*
  Warnings:

  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "locations";

-- CreateTable
CREATE TABLE "measurements" (
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

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("sampleID")
);
