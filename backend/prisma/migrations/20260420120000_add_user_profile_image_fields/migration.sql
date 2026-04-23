-- Add profile image storage fields to users table
ALTER TABLE "users"
ADD COLUMN "profile_image_data" BYTEA,
ADD COLUMN "profile_image_mime_type" VARCHAR(50),
ADD COLUMN "profile_image_size_bytes" INTEGER,
ADD COLUMN "profile_image_updated_at" TIMESTAMP(3);
