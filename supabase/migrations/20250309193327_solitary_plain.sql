/*
  # Create product images table

  1. New Tables
    - `product_images`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Original filename
      - `title` (text, not null) - Display name/title for the image
      - `url` (text, not null) - Public URL of the image
      - `created_at` (timestamp with time zone)
      - `created_by` (uuid) - Reference to the user who uploaded the image

  2. Security
    - Enable RLS on `product_images` table
    - Add policies for authenticated users to:
      - View all images
      - Create new images
*/

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view product images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create product images"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Add foreign key to products table for image reference
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_image_id uuid REFERENCES product_images(id);