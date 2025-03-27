/*
  # Fix orders RLS policy for sellers

  1. Changes
    - Drop existing policies
    - Create new policy allowing sellers to create orders with their own seller_id
    - Keep other policies intact
    
  2. Security
    - Ensure sellers can only create orders where they are the seller
    - Maintain existing view/update permissions
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
  AND seller_id = auth.uid()
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