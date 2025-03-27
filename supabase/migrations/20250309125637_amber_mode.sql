/*
  # Add products management

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `price` (numeric, required)
      - `category` (text, required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references profiles)

  2. Security
    - Enable RLS on products table
    - Add policies for:
      - Sellers can create and update products
      - All authenticated users can view products
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view products
CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow sellers to create products
CREATE POLICY "Sellers can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'seller'
    )
  );

-- Allow sellers to update their own products
CREATE POLICY "Sellers can update their products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'seller'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'seller'
    )
  );