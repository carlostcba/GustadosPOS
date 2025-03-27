/*
  # Add stock field to products table

  1. Changes
    - Add stock column to products table with default value of 0
    
  2. Notes
    - Stock is a numeric field to track product inventory
    - Default value ensures existing products start with 0 stock
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0;