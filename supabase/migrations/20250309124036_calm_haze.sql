/*
  # Remove test users

  1. Changes
    - Remove test users from auth.users table
    - Remove corresponding profiles from public.profiles table
*/

DO $$ 
BEGIN
  -- Delete profiles first due to foreign key constraints
  DELETE FROM public.profiles 
  WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );

  -- Delete users from auth.users
  DELETE FROM auth.users 
  WHERE email IN ('cashier@test.com', 'seller@test.com');
END $$;