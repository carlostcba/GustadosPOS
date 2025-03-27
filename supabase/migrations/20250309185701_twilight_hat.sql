/*
  # Add product image support and storage policies

  1. Changes
    - Add image_url column to products table if it doesn't exist
    - Create storage bucket for product images if it doesn't exist
    - Add storage policies if they don't exist

  2. Security
    - Enable authenticated users to upload/delete images
    - Allow public read access to product images
*/

-- Add image_url column to products table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'products', 'products', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'products'
);

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  -- Public read access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow public read access to product images'
  ) THEN
    CREATE POLICY "Allow public read access to product images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'products');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload product images'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'products');
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow authenticated users to update their product images'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'products');
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow authenticated users to delete their product images'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete their product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'products');
  END IF;
END $$;