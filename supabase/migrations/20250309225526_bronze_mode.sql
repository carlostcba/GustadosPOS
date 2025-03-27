/*
  # Product Schema Update

  1. New Tables
    - `product_images`
      - For storing product image metadata
      - Includes RLS policies for secure access
    - `categories` and `subcategories`
      - For organizing products
      - Includes RLS policies for viewing

  2. Changes to Products Table
    - Add image relationship columns
    - Add category relationship columns
    - Update indexes for performance

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Create product_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Add product_image_id to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_image_id uuid REFERENCES product_images(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_product_image_id ON products(product_image_id);

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Add policies for product_images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Users can create product images'
  ) THEN
    CREATE POLICY "Users can create product images"
    ON product_images
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Anyone can view product images'
  ) THEN
    CREATE POLICY "Anyone can view product images"
    ON product_images
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Drop existing category check constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Update products table to use category_id and subcategory_id
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES subcategories(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create subcategories table if it doesn't exist
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Create index for subcategories
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);

-- Enable RLS on new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Add policies for viewing categories and subcategories
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Anyone can view categories'
  ) THEN
    CREATE POLICY "Anyone can view categories"
    ON categories
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subcategories' 
    AND policyname = 'Anyone can view subcategories'
  ) THEN
    CREATE POLICY "Anyone can view subcategories"
    ON subcategories
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Insert default categories
INSERT INTO categories (name) VALUES
  ('Panadería'),
  ('Facturas'),
  ('Pastelería'),
  ('Sándwiches de miga'),
  ('Pizzas'),
  ('Productos especiales')
ON CONFLICT (name) DO NOTHING;

-- Insert subcategories
DO $$
DECLARE
  panaderia_id uuid;
  facturas_id uuid;
  pasteleria_id uuid;
  sandwiches_id uuid;
  pizzas_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO panaderia_id FROM categories WHERE name = 'Panadería';
  SELECT id INTO facturas_id FROM categories WHERE name = 'Facturas';
  SELECT id INTO pasteleria_id FROM categories WHERE name = 'Pastelería';
  SELECT id INTO sandwiches_id FROM categories WHERE name = 'Sándwiches de miga';
  SELECT id INTO pizzas_id FROM categories WHERE name = 'Pizzas';

  -- Insert subcategories
  INSERT INTO subcategories (name, category_id) VALUES
    ('Panes de masa tradicional', panaderia_id),
    ('Panes integrales y especiales', panaderia_id),
    ('Otros panes', panaderia_id),
    ('Medialunas', facturas_id),
    ('Otras facturas dulces', facturas_id),
    ('Tortas', pasteleria_id),
    ('Alfajores', pasteleria_id),
    ('Budines', pasteleria_id),
    ('Otros productos de pastelería', pasteleria_id),
    ('Pan Blanco', sandwiches_id),
    ('Pan Negro', sandwiches_id),
    ('Pizzas tradicionales', pizzas_id),
    ('Pizzetas', pizzas_id)
  ON CONFLICT (name, category_id) DO NOTHING;
END $$;