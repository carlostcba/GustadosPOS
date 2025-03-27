/*
  # Create test accounts if they don't exist

  1. Changes
    - Create test users for:
      - cashier@test.com
      - seller@test.com
    - Create corresponding profiles with roles
    - Add safety checks to prevent duplicate entries

  2. Security
    - No security changes
*/

DO $$
BEGIN
  -- Create users in auth.users if they don't exist
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
      '11111111-1111-1111-1111-111111111111',
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
      '22222222-2222-2222-2222-222222222222',
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
    SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'
  ) THEN
    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Test Cashier', 'cashier', now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'
  ) THEN
    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Test Seller', 'seller', now());
  END IF;
END $$;