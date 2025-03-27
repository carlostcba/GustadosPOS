/*
  # Update orders RLS policies

  1. Changes
    - Safely drop and recreate policies
    - Allow both sellers and cashiers to create orders
    - Update view and update permissions
    
  2. Security
    - Verify user role before allowing operations
    - Maintain proper security constraints
*/

DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Staff can create orders" ON orders;
  DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
  DROP POLICY IF EXISTS "Sellers can view their own orders" ON orders;
  DROP POLICY IF EXISTS "Cashiers can view all orders" ON orders;
  DROP POLICY IF EXISTS "Cashiers can update orders" ON orders;

  -- Create new policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Staff can create orders'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Sellers can view their own orders'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Cashiers can view all orders'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Cashiers can update orders'
  ) THEN
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
  END IF;
END $$;