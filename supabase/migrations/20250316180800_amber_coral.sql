/*
  # Update orders RLS policies to allow cashiers to create orders

  1. Changes
    - Allow both sellers and cashiers to create orders
    - Maintain existing view and update permissions
    - Ensure proper role checks
    
  2. Security
    - Verify user role before allowing operations
    - Keep existing security constraints
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can view all orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can update orders" ON orders;

-- Create new policies
CREATE POLICY "Staff can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'seller' OR profiles.role = 'cashier')
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