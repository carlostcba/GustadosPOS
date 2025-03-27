/*
  # Add sample employees and suppliers data

  This migration adds:
  1. 10 sample employees with different positions
  2. 5 sample suppliers with contact information
*/

-- Sample Employees
INSERT INTO employees (name, position) VALUES
  ('Juan Pérez', 'Vendedor'),
  ('María González', 'Cajera'),
  ('Carlos Rodríguez', 'Vendedor'),
  ('Ana Martínez', 'Supervisora'),
  ('Luis García', 'Vendedor'),
  ('Laura Torres', 'Cajera'),
  ('Diego Sánchez', 'Vendedor'),
  ('Sofía Ramírez', 'Supervisora'),
  ('Pablo Flores', 'Vendedor'),
  ('Valentina López', 'Cajera')
ON CONFLICT (id) DO NOTHING;

-- Sample Suppliers
INSERT INTO suppliers (name, contact_name, phone) VALUES
  ('Distribuidora ABC', 'Roberto Álvarez', '+54 9 351 123-4567'),
  ('Mayorista XYZ', 'Patricia Mendoza', '+54 9 351 234-5678'),
  ('Importadora del Sur', 'Miguel Ángel Ruiz', '+54 9 351 345-6789'),
  ('Alimentos Premium', 'Carolina Vega', '+54 9 351 456-7890'),
  ('Productos Nacionales', 'Fernando Silva', '+54 9 351 567-8901')
ON CONFLICT (id) DO NOTHING;