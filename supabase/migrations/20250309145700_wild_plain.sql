/*
  # Storage setup for product images
  
  1. Storage Configuration
    - Create storage schema if needed
    - Create products bucket
    - Enable RLS
  
  2. Security
    - Add policies for public access and authenticated users
    - Check for existing policies before creation
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create products bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update their images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete their images" ON storage.objects;
END $$;

-- Create policies for objects
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');