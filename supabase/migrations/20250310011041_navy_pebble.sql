/*
  # Update order number sequence logic

  1. Changes
    - Add daily reset for regular and delivery order numbers
    - Keep pre-orders with continuous sequence
    - Add created_date column to track when orders were created
    - Update order number generation function

  2. Details
    - Regular orders (O001-O999) reset daily
    - Delivery orders (D001-D999) reset daily
    - Pre-orders (P001-P999) maintain continuous sequence
*/

-- Add created_date column to track when orders were created
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_date date DEFAULT CURRENT_DATE;

-- Drop existing sequences
DROP SEQUENCE IF EXISTS order_number_regular_seq CASCADE;
DROP SEQUENCE IF EXISTS order_number_preorder_seq CASCADE;
DROP SEQUENCE IF EXISTS order_number_delivery_seq CASCADE;

-- Create sequence for pre-orders (continuous)
CREATE SEQUENCE IF NOT EXISTS order_number_preorder_seq MINVALUE 1 MAXVALUE 999 CYCLE;

-- Function to get the next number for an order type on a specific date
CREATE OR REPLACE FUNCTION get_next_order_number(p_order_type text, p_date date)
RETURNS integer AS $$
DECLARE
  v_max_number integer;
  v_next_number integer;
BEGIN
  IF p_order_type = 'pre_order' THEN
    -- Pre-orders use a continuous sequence
    RETURN nextval('order_number_preorder_seq');
  END IF;

  -- For regular and delivery orders, find the max number used today
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number ~ '^[OD][0-9]{3}$' THEN 
        CAST(SUBSTRING(order_number FROM 2 FOR 3) AS integer)
    END
  ), 0)
  INTO v_max_number
  FROM orders
  WHERE order_type = p_order_type
    AND created_date = p_date;

  -- Get next number, ensuring it doesn't exceed 999
  v_next_number := v_max_number + 1;
  IF v_next_number > 999 THEN
    RAISE EXCEPTION 'Maximum order number reached for the day';
  END IF;

  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Update the order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
BEGIN
  -- Set created_date
  NEW.created_date := CURRENT_DATE;

  -- Get prefix based on order type
  CASE NEW.order_type
    WHEN 'regular' THEN prefix := 'O';
    WHEN 'pre_order' THEN prefix := 'P';
    WHEN 'delivery' THEN prefix := 'D';
  END CASE;

  -- Get next number
  next_number := get_next_order_number(NEW.order_type, NEW.created_date);
  
  -- Format order number with leading zeros
  NEW.order_number := prefix || LPAD(next_number::text, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();