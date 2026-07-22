-- ============================================================
-- Fronto Music Player — Add Uploader Tracking to Songs
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Add uploaded_by and uploader_fp columns
ALTER TABLE songs 
  ADD COLUMN IF NOT EXISTS uploaded_by text DEFAULT 'Admin',
  ADD COLUMN IF NOT EXISTS uploader_fp text;

-- Update existing records to have 'Admin' as uploader if null
UPDATE songs SET uploaded_by = 'Admin' WHERE uploaded_by IS NULL;

-- Make uploaded_by NOT NULL for future records (optional but recommended)
-- ALTER TABLE songs ALTER COLUMN uploaded_by SET NOT NULL;

-- Add index on uploader_fp for faster lookup in admin panel if needed
CREATE INDEX IF NOT EXISTS idx_songs_uploader_fp ON songs(uploader_fp);
