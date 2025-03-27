/*
  # Add sample employees and suppliers data

  This migration adds:
  1. 10 sample employees with different positions
  2. 5 sample suppliers with contact information
*/

-- Sample Employees
INSERT INTO employees (name, position, active) VALUES
  ('Juan Pérez', 'Vendedor', true),
  ('María González', 'Cajera', true),
  ('Carlos Rodríguez', 'Vendedor', true),
  ('Ana Martínez', 'Supervisora', true),
  ('Luis García', 'Vendedor', true),
  ('Laura Torres', 'Cajera', true),
  ('Diego Sánchez', 'Vendedor', true),
  ('Sofía Ramírez', 'Supervisora', true),
  ('Pablo Flores', 'Vendedor', true),
  ('Valentina López', 'Cajera', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Suppliers
INSERT INTO suppliers (name, contact_name, phone, active) VALUES
  ('Distribuidora ABC', 'Roberto Álvarez', '+54 9 351 123-4567', true),
  ('Mayorista XYZ', 'Patricia Mendoza', '+54 9 351 234-5678', true),
  ('Importadora del Sur', 'Miguel Ángel Ruiz', '+54 9 351 345-6789', true),
  ('Alimentos Premium', 'Carolina Vega', '+54 9 351 456-7890', true),
  ('Productos Nacionales', 'Fernando Silva', '+54 9 351 567-8901', true)
ON CONFLICT (id) DO NOTHING;