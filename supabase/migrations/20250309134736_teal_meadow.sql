/*
  # Add barcode field to products table

  1. Changes
    - Add barcode column to products table
    - Make barcode unique to prevent duplicates
    
  2. Notes
    - Barcode is optional (nullable)
    - Unique constraint ensures no duplicate barcodes
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE products ADD CONSTRAINT products_barcode_key UNIQUE (barcode);