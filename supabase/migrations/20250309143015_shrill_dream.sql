/*
  # Add product image support
  
  1. Changes
    - Add image_url column to products table
    - Set up storage policies for secure image handling
*/

-- Add image_url column to products table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;

-- Create products storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop bucket policies
    DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
    DROP POLICY IF EXISTS "Allow authenticated users to read buckets" ON storage.buckets;
    
    -- Drop object policies
    DROP POLICY IF EXISTS "Allow authenticated users to upload product images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated users to update their product images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public to read product images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their product images" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policies for buckets
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (name = 'products');

CREATE POLICY "Allow authenticated users to read buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (name = 'products');

-- Create policies for objects
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'products' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public to read product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated users to delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'products' AND auth.role() = 'authenticated');