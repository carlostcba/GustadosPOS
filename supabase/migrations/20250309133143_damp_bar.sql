/*
  # Add subcategory to products table

  1. Changes
    - Add subcategory column to products table
    - Update category check constraint to match new categories
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add subcategory column
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;

-- Update category check constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check 
  CHECK (category IN (
    'Panadería',
    'Facturas',
    'Pastelería',
    'Sándwiches de miga',
    'Pizzas',
    'Productos especiales'
  ));