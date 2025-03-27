/*
  # Order Numbering System

  1. Changes
    - Add order_type column to orders table
    - Create sequences for each order type (regular, pre-order, delivery)
    - Implement order number format: O001-O999, P001-P999, D001-D999
    - Update order_number to use text format

  2. Notes
    - Numbers will reset to 001 when reaching 999
    - Each type has its own sequence
    - Preserves existing order numbers
*/

-- First remove the default value that depends on the sequence
ALTER TABLE orders ALTER COLUMN order_number DROP DEFAULT;

-- Now we can safely drop the sequence
DROP SEQUENCE IF EXISTS orders_order_number_seq;

-- Add order_type column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type text NOT NULL DEFAULT 'regular';
  END IF;
END $$;

-- Add constraint for order_type values if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'orders' AND constraint_name = 'orders_order_type_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_type_check 
      CHECK (order_type IN ('regular', 'pre_order', 'delivery'));
  END IF;
END $$;

-- Create sequences for each order type
CREATE SEQUENCE IF NOT EXISTS order_number_regular_seq MINVALUE 1 MAXVALUE 999 CYCLE;
CREATE SEQUENCE IF NOT EXISTS order_number_preorder_seq MINVALUE 1 MAXVALUE 999 CYCLE;
CREATE SEQUENCE IF NOT EXISTS order_number_delivery_seq MINVALUE 1 MAXVALUE 999 CYCLE;

-- Change order_number to text type
ALTER TABLE orders ALTER COLUMN order_number TYPE text USING order_number::text;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
BEGIN
  -- Determine order type and get next number
  CASE NEW.order_type
    WHEN 'regular' THEN
      next_number := nextval('order_number_regular_seq');
      prefix := 'O';
    WHEN 'pre_order' THEN
      next_number := nextval('order_number_preorder_seq');
      prefix := 'P';
    WHEN 'delivery' THEN
      next_number := nextval('order_number_delivery_seq');
      prefix := 'D';
  END CASE;

  -- Format order number with leading zeros
  NEW.order_number := prefix || LPAD(next_number::text, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order number generation
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();