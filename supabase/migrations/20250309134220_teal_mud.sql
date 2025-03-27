/*
  # Import initial product catalog

  1. Changes
    - Insert all products with their categories, subcategories, and prices
    - Set appropriate unit labels and weighable flags
    
  2. Notes
    - Products in the "Panadería" category are set as weighable by default
    - Other products are set as non-weighable (sold by unit)
*/

-- Panadería - Panes de masa tradicional
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Baguette', 'Panadería', 'Panes de masa tradicional', 1000, true, 'kg'),
('Pan francés', 'Panadería', 'Panes de masa tradicional', 800, true, 'kg'),
('Pan de campo', 'Panadería', 'Panes de masa tradicional', 900, true, 'kg'),
('Felipe', 'Panadería', 'Panes de masa tradicional', 700, true, 'kg'),
('Flautitas', 'Panadería', 'Panes de masa tradicional', 800, true, 'kg');

-- Panadería - Panes integrales y especiales
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Pan integral', 'Panadería', 'Panes integrales y especiales', 1200, true, 'kg'),
('Pan de centeno', 'Panadería', 'Panes integrales y especiales', 1300, true, 'kg'),
('Pan de molde', 'Panadería', 'Panes integrales y especiales', 1100, true, 'kg');

-- Panadería - Otros panes
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Chipá', 'Panadería', 'Otros panes', 2500, true, 'kg');

-- Facturas - Medialunas
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Medialunas de manteca', 'Facturas', 'Medialunas', 300, false, 'unidad'),
('Medialunas de grasa', 'Facturas', 'Medialunas', 250, false, 'unidad');

-- Facturas - Otras facturas dulces
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Vigilantes', 'Facturas', 'Otras facturas dulces', 300, false, 'unidad'),
('Cañoncitos de dulce de leche', 'Facturas', 'Otras facturas dulces', 350, false, 'unidad'),
('Sacramentos', 'Facturas', 'Otras facturas dulces', 350, false, 'unidad'),
('Palmeritas', 'Facturas', 'Otras facturas dulces', 300, false, 'unidad'),
('Libritos', 'Facturas', 'Otras facturas dulces', 350, false, 'unidad');

-- Pastelería - Tortas
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Tortas de cumpleaños', 'Pastelería', 'Tortas', 5000, false, 'unidad'),
('Tortas de bodas', 'Pastelería', 'Tortas', 8000, false, 'unidad'),
('Tortas de chocolate', 'Pastelería', 'Tortas', 4500, false, 'unidad'),
('Tortas de frutas', 'Pastelería', 'Tortas', 4500, false, 'unidad');

-- Pastelería - Alfajores
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Alfajores de maicena', 'Pastelería', 'Alfajores', 300, false, 'unidad'),
('Alfajores de chocolate', 'Pastelería', 'Alfajores', 350, false, 'unidad'),
('Alfajores de dulce de leche', 'Pastelería', 'Alfajores', 300, false, 'unidad');

-- Pastelería - Budines
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Budines de pan', 'Pastelería', 'Budines', 2500, false, 'unidad'),
('Budines de vainilla', 'Pastelería', 'Budines', 2000, false, 'unidad'),
('Budines de chocolate', 'Pastelería', 'Budines', 2200, false, 'unidad');

-- Pastelería - Otros productos de pastelería
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Brownies', 'Pastelería', 'Otros productos de pastelería', 400, false, 'unidad'),
('Mini tortas', 'Pastelería', 'Otros productos de pastelería', 800, false, 'unidad'),
('Tartas de frutas', 'Pastelería', 'Otros productos de pastelería', 3500, false, 'unidad'),
('Tartas de crema', 'Pastelería', 'Otros productos de pastelería', 3000, false, 'unidad');

-- Sándwiches de miga - Pan Blanco
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Jamón y queso', 'Sándwiches de miga', 'Pan Blanco', 400, false, 'unidad'),
('Queso y tomate', 'Sándwiches de miga', 'Pan Blanco', 350, false, 'unidad'),
('Queso y Lechuga', 'Sándwiches de miga', 'Pan Blanco', 350, false, 'unidad'),
('Atún y queso', 'Sándwiches de miga', 'Pan Blanco', 450, false, 'unidad'),
('Pavita y queso', 'Sándwiches de miga', 'Pan Blanco', 450, false, 'unidad'),
('Roquefort y Jamón', 'Sándwiches de miga', 'Pan Blanco', 500, false, 'unidad');

-- Sándwiches de miga - Pan Negro
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Jamón y queso', 'Sándwiches de miga', 'Pan Negro', 450, false, 'unidad'),
('Queso y tomate', 'Sándwiches de miga', 'Pan Negro', 400, false, 'unidad'),
('Queso y Lechuga', 'Sándwiches de miga', 'Pan Negro', 400, false, 'unidad'),
('Atún y queso', 'Sándwiches de miga', 'Pan Negro', 500, false, 'unidad'),
('Pavita y queso', 'Sándwiches de miga', 'Pan Negro', 500, false, 'unidad'),
('Roquefort y Jamón', 'Sándwiches de miga', 'Pan Negro', 550, false, 'unidad');

-- Pizzas - Pizzas tradicionales
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Fugazzeta', 'Pizzas', 'Pizzas tradicionales', 3500, false, 'unidad'),
('Muzza', 'Pizzas', 'Pizzas tradicionales', 3000, false, 'unidad'),
('Jamón y morrones', 'Pizzas', 'Pizzas tradicionales', 3800, false, 'unidad'),
('Calabresa', 'Pizzas', 'Pizzas tradicionales', 3800, false, 'unidad');

-- Pizzas - Pizzetas
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Napolitana', 'Pizzas', 'Pizzetas', 1500, false, 'unidad'),
('Fugazzeta', 'Pizzas', 'Pizzetas', 1500, false, 'unidad');

-- Productos especiales
INSERT INTO products (name, category, subcategory, price, is_weighable, unit_label) VALUES
('Pan dulce', 'Productos especiales', null, 3500, false, 'unidad'),
('Rosca de Pascua', 'Productos especiales', null, 3000, false, 'unidad');