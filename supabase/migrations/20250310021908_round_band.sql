/*
  # Add cash register expenses functionality

  1. New Tables
    - `cash_register_expenses`
      - `id` (uuid, primary key)
      - `register_id` (uuid, references cash_registers)
      - `amount` (numeric(10,2))
      - `type` (text) - Either 'supplier_payment' or 'employee_advance'
      - `description` (text)
      - `recipient` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Add expenses_total column to cash_registers table
    - Add trigger to automatically update expenses_total

  3. Security
    - Enable RLS on cash_register_expenses table
    - Add policy for cashiers to manage expenses
*/

-- Create expenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS cash_register_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('supplier_payment', 'employee_advance')),
  description text NOT NULL,
  recipient text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cash_register_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Cashiers can manage expenses" ON cash_register_expenses;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policy
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

-- Add expenses_total column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_registers' 
    AND column_name = 'expenses_total'
  ) THEN
    ALTER TABLE cash_registers 
    ADD COLUMN expenses_total numeric(10,2) DEFAULT 0 CHECK (expenses_total >= 0);
  END IF;
END $$;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_register_expenses_trigger ON cash_register_expenses;
DROP FUNCTION IF EXISTS update_register_expenses();

-- Create or replace trigger function
CREATE FUNCTION update_register_expenses() RETURNS TRIGGER AS $$
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

-- Create trigger
CREATE TRIGGER update_register_expenses_trigger
AFTER INSERT OR DELETE ON cash_register_expenses
FOR EACH ROW
EXECUTE FUNCTION update_register_expenses();