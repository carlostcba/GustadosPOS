/*
  # Add profiles for existing users

  1. Changes
    - Add profile for carlostellocba@gmail.com as cashier
    - Add profile for ctello@lasalle.edu.ar as seller
*/

-- Add profile for carlostellocba@gmail.com (cashier)
INSERT INTO public.profiles (id, full_name, role, created_at)
SELECT 
  id,
  'Carlos Tello',
  'cashier',
  CURRENT_TIMESTAMP
FROM auth.users 
WHERE email = 'carlostellocba@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'cashier';

-- Add profile for ctello@lasalle.edu.ar (seller)
INSERT INTO public.profiles (id, full_name, role, created_at)
SELECT 
  id,
  'Carlos Tello',
  'seller',
  CURRENT_TIMESTAMP
FROM auth.users 
WHERE email = 'ctello@lasalle.edu.ar'
ON CONFLICT (id) DO UPDATE 
SET role = 'seller';