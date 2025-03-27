/*
  # Create Test Users

  1. Changes
    - Create test users in auth.users table
    - Create corresponding profiles in public.profiles table
    
  2. Test Accounts
    - Cashier: cashier@test.com / test123456
    - Seller: seller@test.com / test123456
*/

DO $$ 
BEGIN
  -- First check if the users don't already exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email IN ('cashier@test.com', 'seller@test.com')
  ) THEN
    -- Create the users in auth.users
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
    ), (
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

    -- Create their profiles if they don't exist
    INSERT INTO public.profiles (id, full_name, role, created_at)
    SELECT 
      '11111111-1111-1111-1111-111111111111',
      'Test Cashier',
      'cashier',
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = '11111111-1111-1111-1111-111111111111'
    );

    INSERT INTO public.profiles (id, full_name, role, created_at)
    SELECT 
      '22222222-2222-2222-2222-222222222222',
      'Test Seller',
      'seller',
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = '22222222-2222-2222-2222-222222222222'
    );
  END IF;
END $$;