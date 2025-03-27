/*
  # Add image support to products

  1. Changes
    - Add `image_url` column to products table to store either uploaded image URLs or external links
    
  2. Notes
    - Column is nullable since images are optional
    - No changes to existing RLS policies needed
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;