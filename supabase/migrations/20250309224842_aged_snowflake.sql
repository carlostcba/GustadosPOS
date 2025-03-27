/*
  # Add categories and subcategories tables

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    - `subcategories`
      - `id` (uuid, primary key) 
      - `name` (text)
      - `category_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Changes
    - Add foreign key to products table for category and subcategory
    - Migrate existing category data
    - Update RLS policies

  3. Security
    - Enable RLS on new tables
    - Add policies for viewing categories
*/

-- Create categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create subcategories table
CREATE TABLE subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Anyone can view categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view subcategories"
  ON subcategories
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert existing categories
INSERT INTO categories (name) VALUES
  ('Panadería'),
  ('Facturas'),
  ('Pastelería'),
  ('Sándwiches de miga'),
  ('Pizzas'),
  ('Productos especiales');

-- Insert existing subcategories
WITH category_ids AS (
  SELECT id, name FROM categories
)
INSERT INTO subcategories (name, category_id)
SELECT subcategory_name, c.id
FROM (
  VALUES
    ('Panes de masa tradicional', 'Panadería'),
    ('Panes integrales y especiales', 'Panadería'),
    ('Otros panes', 'Panadería'),
    ('Medialunas', 'Facturas'),
    ('Otras facturas dulces', 'Facturas'),
    ('Tortas', 'Pastelería'),
    ('Alfajores', 'Pastelería'),
    ('Budines', 'Pastelería'),
    ('Otros productos de pastelería', 'Pastelería'),
    ('Pan Blanco', 'Sándwiches de miga'),
    ('Pan Negro', 'Sándwiches de miga'),
    ('Pizzas tradicionales', 'Pizzas'),
    ('Pizzetas', 'Pizzas')
) AS s(subcategory_name, category_name)
JOIN category_ids c ON c.name = s.category_name;

-- Add category_id and subcategory_id to products
ALTER TABLE products 
ADD COLUMN category_id uuid REFERENCES categories(id),
ADD COLUMN subcategory_id uuid REFERENCES subcategories(id);

-- Create indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);

-- Update existing products with new category references
WITH category_refs AS (
  SELECT c.id as category_id, s.id as subcategory_id, 
         c.name as category_name, s.name as subcategory_name
  FROM categories c
  LEFT JOIN subcategories s ON s.category_id = c.id
)
UPDATE products p
SET 
  category_id = cr.category_id,
  subcategory_id = cr.subcategory_id
FROM category_refs cr
WHERE p.category = cr.category_name 
  AND (p.subcategory = cr.subcategory_name OR (p.subcategory IS NULL AND cr.subcategory_name IS NULL));