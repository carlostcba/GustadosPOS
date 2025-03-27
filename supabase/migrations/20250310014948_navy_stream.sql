/*
  # Fix order visibility and filtering

  1. Changes
    - Add index on orders.seller_id for faster filtering
    - Add index on orders.status for faster filtering
    - Add index on orders.order_type for faster filtering
    - Add index on orders.created_at for faster sorting

  2. Security
    - Update RLS policies to ensure proper visibility
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Drop existing policies
DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can update orders" ON orders;

-- Create new policies
CREATE POLICY "Sellers can view their own orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
    AND orders.seller_id = auth.uid()
  )
);

CREATE POLICY "Cashiers can view all orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
);

CREATE POLICY "Sellers can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
  )
  AND seller_id = auth.uid()
);

CREATE POLICY "Cashiers can update orders"
ON orders FOR UPDATE
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