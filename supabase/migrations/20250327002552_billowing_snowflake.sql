/*
  # Update RLS policies for orders

  1. Changes
    - Remove cashier's ability to update orders
    - Keep cashier's ability to view orders
    - Keep seller's ability to create and view their orders
    
  2. Security
    - Remove update policy for cashiers
    - Maintain existing view permissions
*/

DO $$ 
BEGIN
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
      AND auth.uid() = seller_id
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

  -- Note: No update policy for cashiers anymore
END $$;