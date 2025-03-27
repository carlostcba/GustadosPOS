/*
  # Add trigger for automatic profile creation
  
  1. Changes
    - Add trigger function to create profile on user signup
    - Add trigger to auth.users table
    
  2. Security
    - Profile creation happens automatically in a secure context
    - Default role is set to 'cashier'
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email), 'cashier');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();