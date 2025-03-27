/*
  # Create initial users for testing

  1. Changes
    - Insert test users for cashier and seller roles
    - Set up secure passwords
    - Create corresponding profile records

  2. Security
    - Passwords are hashed using Supabase Auth
    - Users are created with specific roles
*/

-- Create users with hashed passwords
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES
-- Cashier user
(
  'e9f747d4-6c76-4b5c-b82e-66627a7e6a87',
  'cashier@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
),
-- Seller user
(
  'f9a6c4b3-7d8e-5f2a-9b1c-4d3e2f1e0a9b',
  'seller@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
);

-- Create corresponding profiles
INSERT INTO public.profiles (id, full_name, role, created_at)
VALUES
  ('e9f747d4-6c76-4b5c-b82e-66627a7e6a87', 'Test Cashier', 'cashier', now()),
  ('f9a6c4b3-7d8e-5f2a-9b1c-4d3e2f1e0a9b', 'Test Seller', 'seller', now());