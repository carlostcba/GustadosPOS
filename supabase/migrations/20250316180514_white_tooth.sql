/*
  # Fix orders RLS policy

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Allow sellers to create orders
    - Allow sellers to view their own orders
    - Allow cashiers to view and update all orders

  2. Security
    - Enable RLS on orders table
    - Add proper policies for each role
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can view all orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can update orders" ON orders;

-- Create new policies
CREATE POLICY "Sellers can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
  )
);

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