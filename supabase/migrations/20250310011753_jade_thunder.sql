/*
  # Reset and update order numbers

  1. Changes
    - Drop existing function and trigger
    - Reset order numbers and types
    - Create new function for getting next number
    - Regenerate order numbers with new format
    - Create new trigger for automatic numbering

  2. Details
    - Regular orders: O001-O999 (resets daily)
    - Pre-orders: P001-P999 (continuous)
    - Delivery orders: D001-D999 (resets daily)
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
DROP FUNCTION IF EXISTS generate_order_number();
DROP FUNCTION IF EXISTS get_next_order_number(text, date);

-- Temporarily allow null order_numbers
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;

-- Reset all order numbers and ensure order_type is set
UPDATE orders SET 
  order_number = NULL,
  order_type = CASE 
    WHEN is_preorder THEN 'pre_order'
    ELSE 'regular'
  END;

-- Create function to get next number for each type
CREATE OR REPLACE FUNCTION get_next_order_number(p_order_type text, p_created_date date)
RETURNS integer AS $$
DECLARE
  last_number integer;
BEGIN
  -- For regular and delivery orders, only count numbers from the same day
  -- For pre-orders, count all numbers regardless of date
  SELECT COALESCE(MAX(REGEXP_REPLACE(order_number, '^[OPD]', '', 'g')::integer), 0)
  INTO last_number
  FROM orders
  WHERE orders.order_type = p_order_type
    AND (
      CASE 
        WHEN p_order_type = 'pre_order' THEN true
        ELSE orders.created_date = p_created_date
      END
    );
    
  RETURN last_number + 1;
END;
$$ LANGUAGE plpgsql;

-- Regenerate order numbers for existing orders
WITH numbered_orders AS (
  SELECT 
    id,
    order_type,
    created_date,
    CASE order_type
      WHEN 'regular' THEN 'O'
      WHEN 'pre_order' THEN 'P'
      WHEN 'delivery' THEN 'D'
    END || LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY 
          order_type,
          CASE 
            WHEN order_type = 'pre_order' THEN NULL -- Group all pre-orders together
            ELSE created_date -- Separate regular/delivery orders by date
          END
        ORDER BY created_at
      )::text,
      3,
      '0'
    ) as new_number
  FROM orders
)
UPDATE orders o
SET order_number = no.new_number
FROM numbered_orders no
WHERE o.id = no.id;

-- Restore not-null constraint
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;

-- Create trigger function for new orders
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
BEGIN
  -- Set created_date if not already set
  IF NEW.created_date IS NULL THEN
    NEW.created_date := CURRENT_DATE;
  END IF;

  -- Get prefix based on order type
  CASE NEW.order_type
    WHEN 'regular' THEN prefix := 'O';
    WHEN 'pre_order' THEN prefix := 'P';
    WHEN 'delivery' THEN prefix := 'D';
  END CASE;

  -- Get next number
  next_number := get_next_order_number(NEW.order_type, NEW.created_date);
  
  -- Ensure number doesn't exceed 999
  IF next_number > 999 THEN
    RAISE EXCEPTION 'Maximum order number reached for the day';
  END IF;
  
  -- Format order number with leading zeros
  NEW.order_number := prefix || LPAD(next_number::text, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();