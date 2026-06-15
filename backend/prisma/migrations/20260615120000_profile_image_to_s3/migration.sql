-- Move profile images out of the database and into S3.
-- The binary blob column is replaced by an S3 object key.
ALTER TABLE "users" DROP COLUMN "profile_image_data";
ALTER TABLE "users" ADD COLUMN "profile_image_key" VARCHAR(255);
