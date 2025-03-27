/*
  # Update role-based policies and constraints

  1. Changes
    - Add role-based policies for sellers and cashiers
    - Add constraints for payment methods and order status
    - Update existing tables with new constraints

  2. Security
    - Drop existing policies to avoid conflicts
    - Re-create policies with proper permissions
    - Add necessary indexes for performance
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can update orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can create payments" ON payments;
DROP POLICY IF EXISTS "Cashiers can view payments" ON payments;

-- Add role check constraint to profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('seller', 'cashier'));

-- Update orders table constraints
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'paid', 'cancelled'));

-- Update payments table constraints
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_payment_method_check;

ALTER TABLE payments
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IN ('cash', 'credit', 'transfer'));

-- Recreate policies for sellers
CREATE POLICY "Sellers can create orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
  )
);

CREATE POLICY "Sellers can view their orders"
ON orders
FOR SELECT
TO authenticated
USING (
  seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
);

-- Recreate policies for cashiers
CREATE POLICY "Cashiers can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
);

CREATE POLICY "Cashiers can create payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
);

CREATE POLICY "Cashiers can view payments"
ON payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'cashier' OR profiles.role = 'seller')
  )
);

-- Add indexes for better performance
DROP INDEX IF EXISTS idx_orders_seller_id;
DROP INDEX IF EXISTS idx_orders_cashier_id;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_delivery_date;
DROP INDEX IF EXISTS idx_payments_order_id;

CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_cashier_id ON orders(cashier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_payments_order_id ON payments(order_id);