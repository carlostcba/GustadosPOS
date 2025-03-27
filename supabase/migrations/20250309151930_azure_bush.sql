/*
  # Fix storage policies for product images

  1. Changes
    - Ensure storage schema exists
    - Create products bucket with proper configuration
    - Set up correct storage policies

  2. Security
    - Enable public access for viewing images
    - Allow authenticated users to manage their images
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Ensure the bucket exists with proper configuration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'products'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'products',
            'products',
            true,
            2097152, -- 2MB in bytes
            ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
        );
    END IF;
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update their images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete their images" ON storage.objects;
END $$;

-- Create new policies with proper permissions
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