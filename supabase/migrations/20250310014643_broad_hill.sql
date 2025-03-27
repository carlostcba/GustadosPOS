/*
  # Add payment method to orders

  1. Changes
    - Add payment_method column to orders table
    - Add check constraint for valid payment methods
    - Set default value to null

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE orders
ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'credit', 'transfer'));

COMMENT ON COLUMN orders.payment_method IS 'The payment method selected by the seller when creating the order';