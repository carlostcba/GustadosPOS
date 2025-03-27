/*
  # Add manager role and reporting views

  1. Changes
    - Add manager role to profiles
    - Create materialized views for reporting
    - Set up proper security for manager access
    
  2. Security
    - Use security definer functions for access control
    - Grant proper permissions to authenticated users
*/

-- Update role check constraint to include manager
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('seller', 'cashier', 'manager'));

-- Create security definer function to check manager role
CREATE OR REPLACE FUNCTION auth.is_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get sales data
CREATE OR REPLACE FUNCTION get_product_sales()
RETURNS TABLE (
  product_id uuid,
  product_name text,
  total_quantity numeric,
  total_sales numeric,
  orders_count bigint,
  first_sale timestamptz,
  last_sale timestamptz,
  category_id uuid,
  category_name text,
  subcategory_id uuid,
  subcategory_name text
) SECURITY DEFINER AS $$
BEGIN
  IF NOT auth.is_manager() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH sales AS (
    SELECT 
      oi.product_id,
      oi.product_name,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.total_price) as total_sales,
      COUNT(DISTINCT o.id) as orders_count,
      MIN(o.created_at) as first_sale,
      MAX(o.created_at) as last_sale
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'paid'
    GROUP BY oi.product_id, oi.product_name
  )
  SELECT 
    s.*,
    p.category_id,
    c.name as category_name,
    p.subcategory_id,
    sc.name as subcategory_name
  FROM sales s
  LEFT JOIN products p ON p.id = s.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN subcategories sc ON sc.id = p.subcategory_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get register reports
CREATE OR REPLACE FUNCTION get_register_reports()
RETURNS TABLE (
  id uuid,
  cashier_id uuid,
  opening_amount numeric,
  closing_amount numeric,
  cash_sales numeric,
  card_sales numeric,
  transfer_sales numeric,
  deposits_received numeric,
  started_at timestamptz,
  closed_at timestamptz,
  expenses_total numeric,
  cashier_name text,
  total_expenses numeric,
  expenses_detail json
) SECURITY DEFINER AS $$
BEGIN
  IF NOT auth.is_manager() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    cr.*,
    p.full_name as cashier_name,
    COALESCE(
      (SELECT SUM(amount) 
       FROM cash_register_expenses cre 
       WHERE cre.register_id = cr.id
      ), 0
    ) as total_expenses,
    (
      SELECT json_agg(json_build_object(
        'type', cre.type,
        'amount', cre.amount,
        'description', cre.description,
        'created_at', cre.created_at,
        'employee_name', e.name,
        'supplier_name', s.name
      ))
      FROM cash_register_expenses cre
      LEFT JOIN employees e ON e.id = cre.employee_id
      LEFT JOIN suppliers s ON s.id = cre.supplier_id
      WHERE cre.register_id = cr.id
    ) as expenses_detail
  FROM cash_registers cr
  JOIN profiles p ON p.id = cr.cashier_id;
END;
$$ LANGUAGE plpgsql;

-- Add policy for manager access to cash registers
CREATE POLICY "Managers can view all cash registers"
ON cash_registers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'manager'
  )
);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_product_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION get_register_reports() TO authenticated;