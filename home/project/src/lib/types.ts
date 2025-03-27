export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Subcategory = {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  subcategory_id: string | null;
  barcode: string | null;
  is_weighable: boolean;
  unit_label: string;
  stock: number;
  created_at: string;
  image_url: string | null;
  product_image_id: string | null;
};

export type ProductImage = {
  id: string;
  name: string;
  title: string;
  url: string;
  created_at: string;
};