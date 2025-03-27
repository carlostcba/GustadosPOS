/*
  # Create Storage Bucket for Product Images

  1. Storage
    - Create a new public bucket called 'products' for storing product images
    - Enable public access to the bucket
    - Set size limit to 2MB
    - Allow only image files (jpg, png, webp)

  2. Security
    - Enable public access for authenticated users
    - Add policy for sellers to upload images
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to read images
CREATE POLICY "Authenticated users can view product images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'products');

-- Policy to allow sellers to upload images
CREATE POLICY "Sellers can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.profiles ON profiles.id = auth.users.id
    WHERE auth.users.id = auth.uid()
    AND profiles.role = 'seller'
  ))
);