/*
  # Create test accounts

  1. Changes
    - Create test users for:
      - cashier@test.com (Test Cashier)
      - seller@test.com (Test Seller)
    - Create corresponding profiles with roles
    - Add safety checks to prevent duplicate entries

  2. Security
    - No security changes
*/

-- Create test accounts if they don't exist
DO $$
DECLARE
  cashier_id uuid := '11111111-1111-1111-1111-111111111111';
  seller_id uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Create users if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'cashier@test.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      cashier_id,
      'authenticated',
      'authenticated',
      'cashier@test.com',
      crypt('test123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'seller@test.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      seller_id,
      'authenticated',
      'authenticated',
      'seller@test.com',
      crypt('test123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Create profiles if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = cashier_id
  ) THEN
    INSERT INTO profiles (id, full_name, role)
    VALUES (cashier_id, 'Test Cashier', 'cashier');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = seller_id
  ) THEN
    INSERT INTO profiles (id, full_name, role)
    VALUES (seller_id, 'Test Seller', 'seller');
  END IF;
END $$;