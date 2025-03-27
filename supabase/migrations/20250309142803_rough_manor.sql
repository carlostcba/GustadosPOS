/*
  # Add storage policies for products bucket

  1. Changes
    - Enable RLS for storage.buckets table
    - Enable RLS for storage.objects table
    - Add policies to allow authenticated users to:
      - Create and manage product buckets
      - Upload and manage product images
*/

-- Enable RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'products'
  ) AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'products'
  ) AND 
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'products'
  ) AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public to read product images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'products'
  )
);

CREATE POLICY "Allow authenticated users to delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'products'
  ) AND 
  auth.role() = 'authenticated'
);