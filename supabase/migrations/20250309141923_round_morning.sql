/*
  # Create storage bucket for product images

  1. Changes
    - Create a new storage bucket called 'products' for storing product images
    - Add storage policies to allow authenticated users to upload and read images
    
  2. Security
    - Enable public access for reading images
    - Only authenticated users can upload images
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products');

-- Allow public access to read files
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'products');