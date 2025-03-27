/*
  # Add employees and suppliers tables

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `name` (text)
      - `position` (text)
      - `created_at` (timestamp)
      - `active` (boolean)

    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `contact_name` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `active` (boolean)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read active records
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active suppliers"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Modify cash_register_expenses to reference employees and suppliers
ALTER TABLE cash_register_expenses 
ADD COLUMN employee_id uuid REFERENCES employees(id),
ADD COLUMN supplier_id uuid REFERENCES suppliers(id),
DROP COLUMN recipient;

-- Add constraint to ensure either employee_id or supplier_id is set based on type
ALTER TABLE cash_register_expenses
ADD CONSTRAINT expense_recipient_check 
CHECK (
  (type = 'employee_advance' AND employee_id IS NOT NULL AND supplier_id IS NULL) OR
  (type = 'supplier_payment' AND supplier_id IS NOT NULL AND employee_id IS NULL)
);