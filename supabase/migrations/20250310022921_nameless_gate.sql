/*
  # Fix orders RLS and add expenses tracking
  
  1. Updates
    - Fix orders RLS policy to allow sellers to create orders
    - Add cash register expenses table and related functionality
    
  2. Security
    - Enable RLS on cash_register_expenses
    - Add policy for cashiers to manage expenses
*/

-- Fix orders RLS policy
DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
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

-- Create cash register expenses table
CREATE TABLE IF NOT EXISTS cash_register_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('supplier_payment', 'employee_advance')),
  description text NOT NULL,
  employee_id uuid REFERENCES employees(id),
  supplier_id uuid REFERENCES suppliers(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT expense_recipient_check CHECK (
    (type = 'employee_advance' AND employee_id IS NOT NULL AND supplier_id IS NULL) OR
    (type = 'supplier_payment' AND supplier_id IS NOT NULL AND employee_id IS NULL)
  )
);

-- Enable RLS on cash_register_expenses
ALTER TABLE cash_register_expenses ENABLE ROW LEVEL SECURITY;

-- Add policy for cashiers to manage expenses
DROP POLICY IF EXISTS "Cashiers can manage expenses" ON cash_register_expenses;
CREATE POLICY "Cashiers can manage expenses"
  ON cash_register_expenses
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

-- Add expenses_total column to cash_registers if not exists
ALTER TABLE cash_registers 
ADD COLUMN IF NOT EXISTS expenses_total numeric(10,2) DEFAULT 0 CHECK (expenses_total >= 0);

-- Update trigger function to recalculate totals
CREATE OR REPLACE FUNCTION update_register_expenses() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE cash_registers 
    SET expenses_total = COALESCE(expenses_total, 0) + NEW.amount
    WHERE id = NEW.register_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE cash_registers 
    SET expenses_total = COALESCE(expenses_total, 0) - OLD.amount
    WHERE id = OLD.register_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_register_expenses_trigger ON cash_register_expenses;

-- Create trigger for expenses
CREATE TRIGGER update_register_expenses_trigger
AFTER INSERT OR DELETE ON cash_register_expenses
FOR EACH ROW
EXECUTE FUNCTION update_register_expenses();