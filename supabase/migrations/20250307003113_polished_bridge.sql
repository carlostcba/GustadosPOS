/*
  # Initial schema setup for POS system

  1. Tables Created:
    - profiles: User profiles with roles
    - orders: Order management
    - order_items: Individual items in orders
    - payments: Payment transactions
    - coupons: Discount coupons
    - cash_registers: Cash register sessions

  2. Security:
    - RLS enabled on all tables
    - Policies for authenticated access
    - Role-based access control
*/

-- Create tables
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('cashier', 'seller')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number serial,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  is_preorder boolean DEFAULT false,
  delivery_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  deposit_amount decimal(10,2) DEFAULT 0,
  remaining_amount decimal(10,2) DEFAULT 0,
  seller_id uuid REFERENCES profiles NOT NULL,
  cashier_id uuid REFERENCES profiles,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders NOT NULL,
  product_name text NOT NULL,
  quantity decimal(10,3) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit', 'transfer')),
  is_deposit boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percentage decimal(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id uuid REFERENCES profiles NOT NULL,
  opening_amount decimal(10,2) NOT NULL,
  closing_amount decimal(10,2),
  cash_sales decimal(10,2) DEFAULT 0,
  card_sales decimal(10,2) DEFAULT 0,
  transfer_sales decimal(10,2) DEFAULT 0,
  deposits_received decimal(10,2) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

-- Create policies
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

CREATE POLICY "Staff can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Staff can view their cash registers"
  ON cash_registers FOR SELECT
  TO authenticated
  USING (cashier_id = auth.uid());

CREATE POLICY "Cashiers can create cash registers"
  ON cash_registers FOR INSERT
  TO authenticated
  WITH CHECK (cashier_id = auth.uid());

-- Add update policies for orders
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
  WITH CHECK (true);

-- Add update policies for cash registers
CREATE POLICY "Cashiers can update their registers"
  ON cash_registers FOR UPDATE
  TO authenticated
  USING (cashier_id = auth.uid())
  WITH CHECK (cashier_id = auth.uid());