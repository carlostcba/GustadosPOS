/*
  # Add RLS policies for order_items table

  1. Security Changes
    - Add policy allowing sellers to create order items for their own orders
    - Add policy allowing cashiers to view order items for processing
    - Add policy allowing sellers to view their own order items
*/

-- Sellers can create order items for their own orders
CREATE POLICY "Sellers can create order items for own orders"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.seller_id = auth.uid()
  )
);

-- Sellers can view their own order items
CREATE POLICY "Sellers can view their order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.seller_id = auth.uid()
  )
);

-- Cashiers can view all order items
CREATE POLICY "Cashiers can view all order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
);