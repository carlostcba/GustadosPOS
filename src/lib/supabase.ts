import { createClient } from '@supabase/supabase-js';
import type { Product, ProductImage } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const BUCKET_NAME = 'products';

type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

function isAllowedFileType(type: string): type is AllowedFileType {
  return ALLOWED_FILE_TYPES.includes(type as AllowedFileType);
}

export async function uploadProductImage(file: File, title: string, userId: string): Promise<ProductImage> {
  try {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('La imagen no debe superar los 2MB');
    }

    if (!isAllowedFileType(file.type)) {
      throw new Error('Solo se permiten imágenes JPG, PNG o WebP');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    if (!publicUrl) {
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      throw new Error('Error al generar la URL de la imagen');
    }

    const { data: imageData, error: dbError } = await supabase
      .from('product_images')
      .insert({
        name: fileName,
        title: title,
        url: publicUrl,
        created_by: userId,
      })
      .select()
      .single();

    if (dbError || !imageData) {
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      throw dbError || new Error('Error al guardar la imagen en la base de datos');
    }

    return imageData;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(error.message || 'Error al subir la imagen');
  }
}

export async function deleteProductImage(imageId: string): Promise<void> {
  try {
    const { data: image, error: fetchError } = await supabase
      .from('product_images')
      .select('name')
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      throw fetchError || new Error('Imagen no encontrada');
    }

    // Remove from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([image.name]);

    if (storageError) {
      throw storageError;
    }

    // Remove from database
    const { error: dbError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      throw dbError;
    }
  } catch (error: any) {
    console.error('Error deleting image:', error);
    throw new Error(error.message || 'Error al eliminar la imagen');
  }
}

export async function updateProductImage(productId: string, imageId: string | null): Promise<void> {
  if (!productId) {
    throw new Error('Se requiere el ID del producto');
  }

  try {
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        product_image_id: imageId,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) {
      throw updateError;
    }

    // Verify the update was successful
    const { data: updatedProduct, error: verifyError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (verifyError || !updatedProduct) {
      throw new Error('No se pudo verificar la actualización del producto');
    }
  } catch (error: any) {
    console.error('Error updating product image:', error);
    throw new Error(error.message || 'Error al actualizar la imagen del producto');
  }
}

export async function getProductImages(): Promise<ProductImage[]> {
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error('Error fetching product images:', error);
    throw new Error(error.message || 'Error al obtener las imágenes');
  }
}

export async function saveProduct(product: Partial<Product> & { name: string; price: number; category_id: string }): Promise<Product> {
  try {
    if (!product.name?.trim()) {
      throw new Error('El nombre del producto es requerido');
    }
    if (typeof product.price !== 'number' || product.price <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }
    if (!product.category_id) {
      throw new Error('La categoría es requerida');
    }

    const productData = {
      name: product.name.trim(),
      price: product.price,
      category_id: product.category_id,
      subcategory_id: product.subcategory_id || null,
      barcode: product.barcode?.trim() || null,
      is_weighable: product.is_weighable || false,
      unit_label: product.unit_label || 'unidad',
      stock: typeof product.stock === 'number' ? product.stock : 0,
      product_image_id: product.product_image_id || null,
      updated_at: new Date().toISOString()
    };

    let result;

    if (product.id) {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          created_by: product.created_by
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    if (!result) {
      throw new Error('No se pudo guardar el producto');
    }

    return result;
  } catch (error: any) {
    console.error('Error saving product:', error);
    
    if (error?.code === '23505') {
      throw new Error('Ya existe un producto con ese código de barras');
    }
    
    throw new Error(error.message || 'Error al guardar el producto');
  }
}