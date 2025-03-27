/*
  # Add product_id to order_items table

  1. Changes
    - Add product_id column to order_items table
    - Add foreign key constraint to products table
    - Make product_id required for new order items

  2. Security
    - No changes to RLS policies
*/

-- Add product_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN product_id uuid NOT NULL REFERENCES products(id);
  END IF;
END $$;