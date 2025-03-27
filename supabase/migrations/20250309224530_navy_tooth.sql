/*
  # Add coupons management system

  1. New Tables
    - `coupon_usages`
      - Tracks coupon usage in orders
      - Links coupons with payments
      - Records discount amounts

  2. Changes
    - Add coupon usage tracking
    - Add payment-coupon relationship
    - Add discount calculations

  3. Security
    - Enable RLS
    - Add policies for coupon management
*/

-- Add coupon usage tracking
CREATE TABLE IF NOT EXISTS coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  discount_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT coupon_usages_discount_check 
  CHECK (discount_amount > 0)
);

-- Enable RLS
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_payment_id ON coupon_usages(payment_id);
CREATE INDEX idx_coupon_usages_order_id ON coupon_usages(order_id);

-- Policies for coupon usage management
CREATE POLICY "Cashiers can manage coupon usage"
ON coupon_usages
FOR ALL
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

-- Add function to validate coupon usage
CREATE OR REPLACE FUNCTION validate_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if coupon is active
  IF NOT EXISTS (
    SELECT 1 FROM coupons
    WHERE id = NEW.coupon_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Coupon is not active';
  END IF;

  -- Check if payment is cash for pre-orders
  IF EXISTS (
    SELECT 1 FROM orders o
    JOIN payments p ON p.order_id = o.id
    WHERE p.id = NEW.payment_id
    AND o.is_preorder = true
    AND p.payment_method != 'cash'
  ) THEN
    RAISE EXCEPTION 'Coupons can only be used with cash payments for pre-orders';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for coupon validation
CREATE TRIGGER validate_coupon_usage_trigger
BEFORE INSERT ON coupon_usages
FOR EACH ROW
EXECUTE FUNCTION validate_coupon_usage();