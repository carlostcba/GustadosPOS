/*
  # Delete test accounts

  1. Changes
    - Delete test profiles and users for:
      - cashier@test.com
      - seller@test.com
    
  2. Security
    - No security changes
*/

-- First delete the profiles
DELETE FROM profiles
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('cashier@test.com', 'seller@test.com')
);

-- Then delete the users
DELETE FROM auth.users 
WHERE email IN ('cashier@test.com', 'seller@test.com');