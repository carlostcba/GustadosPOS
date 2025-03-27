/*
  # Reset sales data

  1. Changes
    - Reset cash registers table
    - Reset payments table
    - Reset coupon usages
    - Reset order queue
    - Reset order payment status
    
  2. Security
    - Maintain existing RLS policies
    - Keep order history intact
*/

-- Reset cash registers
TRUNCATE TABLE cash_register_expenses CASCADE;
TRUNCATE TABLE cash_registers CASCADE;

-- Reset payments and related tables
TRUNCATE TABLE coupon_usages CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE order_queue CASCADE;

-- Reset order payment status
UPDATE orders 
SET 
  status = CASE 
    WHEN is_preorder THEN 'pending'
    ELSE 'pending'
  END,
  cashier_id = NULL,
  payment_method = NULL;