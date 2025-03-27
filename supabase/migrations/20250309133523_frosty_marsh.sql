/*
  # Add weighable property to products

  1. Changes
    - Add is_weighable column to products table to identify products sold by weight
    - Add unit_label column to display the appropriate unit (kg, unidad, etc.)
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add columns for weighable products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_weighable boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_label text DEFAULT 'unidad';

-- Update existing products to have default values
UPDATE products SET unit_label = 'unidad' WHERE unit_label IS NULL;