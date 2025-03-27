/*
  # Initial Schema Setup

  1. New Tables
    - profiles
      - id (uuid, primary key)
      - full_name (text)
      - role (text, check constraint: 'cashier' or 'seller')
      - created_at (timestamptz)
    - orders
      - id (uuid, primary key)
      - order_number (serial)
      - customer_name (text)
      - customer_email (text, nullable)
      - customer_phone (text, nullable)
      - is_preorder (boolean)
      - delivery_date (timestamptz, nullable)
      - status (text, check constraint: 'pending', 'paid', 'cancelled')
      - total_amount (numeric)
      - deposit_amount (numeric)
      - remaining_amount (numeric)
      - seller_id (uuid, references profiles)
      - cashier_id (uuid, references profiles, nullable)
      - created_at (timestamptz)
    - order_items, payments, cash_registers (with appropriate columns)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

DO $$ 
BEGIN
  -- Create tables if they don't exist
  CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY,
    full_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('cashier', 'seller')),
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number serial,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    is_preorder boolean DEFAULT false,
    delivery_date timestamptz,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    total_amount numeric(10,2) NOT NULL DEFAULT 0,
    deposit_amount numeric(10,2) DEFAULT 0,
    remaining_amount numeric(10,2) DEFAULT 0,
    seller_id uuid NOT NULL REFERENCES profiles(id),
    cashier_id uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id),
    product_name text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id),
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit', 'transfer')),
    is_deposit boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS cash_registers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id uuid NOT NULL REFERENCES profiles(id),
    opening_amount numeric(10,2) NOT NULL,
    closing_amount numeric(10,2),
    cash_sales numeric(10,2) DEFAULT 0,
    card_sales numeric(10,2) DEFAULT 0,
    transfer_sales numeric(10,2) DEFAULT 0,
    deposits_received numeric(10,2) DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    closed_at timestamptz
  );

  -- Enable RLS on all tables if not already enabled
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
  DROP POLICY IF EXISTS "Sellers can create orders" ON orders;
  DROP POLICY IF EXISTS "Cashiers can update orders" ON orders;
  DROP POLICY IF EXISTS "Staff can view all order items" ON order_items;
  DROP POLICY IF EXISTS "Sellers can create order items" ON order_items;
  DROP POLICY IF EXISTS "Staff can view all payments" ON payments;
  DROP POLICY IF EXISTS "Cashiers can create payments" ON payments;
  DROP POLICY IF EXISTS "Staff can view their cash registers" ON cash_registers;
  DROP POLICY IF EXISTS "Cashiers can create cash registers" ON cash_registers;
  DROP POLICY IF EXISTS "Cashiers can update their registers" ON cash_registers;

  -- Create new policies
  CREATE POLICY "Staff can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Staff can view all orders"
    ON orders FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Sellers can create orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = seller_id);

  CREATE POLICY "Cashiers can update orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    ));

  CREATE POLICY "Staff can view all order items"
    ON order_items FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Sellers can create order items"
    ON order_items FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.seller_id = auth.uid()
    ));

  CREATE POLICY "Staff can view all payments"
    ON payments FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Cashiers can create payments"
    ON payments FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.cashier_id = auth.uid()
    ));

  CREATE POLICY "Staff can view their cash registers"
    ON cash_registers FOR SELECT
    TO authenticated
    USING (cashier_id = auth.uid());

  CREATE POLICY "Cashiers can create cash registers"
    ON cash_registers FOR INSERT
    TO authenticated
    WITH CHECK (cashier_id = auth.uid());

  CREATE POLICY "Cashiers can update their registers"
    ON cash_registers FOR UPDATE
    TO authenticated
    USING (cashier_id = auth.uid())
    WITH CHECK (cashier_id = auth.uid());
END $$;