/*
  # Reset sales and cash register data

  1. Changes
    - Clear all cash register records and expenses
    - Remove all payment records
    - Reset order payment statuses
    - Clear coupon usage history
    - Clear order queue
    
  2. Security
    - Maintain existing RLS policies
    - Keep order history intact
*/

-- First clear dependent tables
TRUNCATE TABLE cash_register_expenses CASCADE;
TRUNCATE TABLE coupon_usages CASCADE;
TRUNCATE TABLE order_queue CASCADE;

-- Clear payments
TRUNCATE TABLE payments CASCADE;

-- Clear cash registers
TRUNCATE TABLE cash_registers CASCADE;

-- Reset all orders to pending status
UPDATE orders 
SET 
  status = CASE 
    WHEN is_preorder THEN 'pending'
    ELSE 'pending'
  END,
  cashier_id = NULL,
  payment_method = NULL;