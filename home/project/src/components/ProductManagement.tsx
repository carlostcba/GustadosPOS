import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Pencil,
  X,
  Filter,
  Image as ImageIcon,
  Loader2,
  Search,
  Upload,
  ImagePlus,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Product, Category, Subcategory, ProductImage } from '../lib/types';

export function ProductManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [updatingImage, setUpdatingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageTitle, setImageTitle] = useState('');

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchInitialData() {
    try {
      setError(null);
      setLoading(true);

      const [productsResult, categoriesResult, subcategoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .order('name'),
        supabase
          .from('subcategories')
          .select('*')
          .order('name')
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (subcategoriesResult.error) throw subcategoriesResult.error;

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
      setSubcategories(subcategoriesResult.data || []);
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setError('Error al cargar los datos: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error al cargar productos:', error);
      setError('Error al cargar los productos: ' + (error.message || 'Error desconocido'));
    }
  }

  async function fetchGalleryImages() {
    try {
      setLoadingGallery(true);
      setError(null);

      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryImages(data || []);
    } catch (error: any) {
      console.error('Error loading gallery:', error);
      setError('Error al cargar la galería: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoadingGallery(false);
    }
  }

  async function handleImageSelect(image: ProductImage) {
    if (!selectedProductForImage?.id) {
      setError('No se ha seleccionado ningún producto');
      return;
    }

    try {
      setError(null);
      setUpdatingImage(true);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_url: image.url,
          product_image_id: image.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProductForImage.id);

      if (updateError) throw updateError;

      setProducts(products.map(p => 
        p.id === selectedProductForImage.id 
          ? { ...p, image_url: image.url, product_image_id: image.id }
          : p
      ));

      setShowGallery(false);
      setSelectedProductForImage(null);
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error updating product image:', error);
      setError('Error al actualizar la imagen: ' + (error.message || 'Error desconocido'));
    } finally {
      setUpdatingImage(false);
    }
  }

  async function uploadImage(file: File, title: string) {
    try {
      setUploadingImage(true);
      setError(null);

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('La imagen no debe superar los 2MB');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(fileExt || '')) {
        throw new Error('Solo se permiten imágenes JPG, PNG o WebP');
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          name: fileName,
          title: title,
          url: publicUrl,
          created_by: user?.id,
        });

      if (dbError) throw dbError;

      await fetchGalleryImages();
      setImageTitle('');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setError('Error al subir la imagen: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.category_id) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const productData = {
        name: editingProduct.name,
        price: editingProduct.price,
        category_id: editingProduct.category_id,
        subcategory_id: editingProduct.subcategory_id,
        barcode: editingProduct.barcode,
        is_weighable: editingProduct.is_weighable || false,
        unit_label: editingProduct.unit_label || 'unidad',
        stock: editingProduct.stock || 0,
        updated_at: new Date().toISOString(),
        product_image_id: editingProduct.product_image_id,
        image_url: editingProduct.image_url,
      };

      if (editingProduct.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      setIsEditing(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      setError('Error al guardar el producto: ' + (error.message || 'Error desconocido'));
    }
  }

  const filteredProducts = products.filter((product) => {
    if (selectedCategory && product.category_id !== selectedCategory) {
      return false;
    }
    if (selectedSubcategory && product.subcategory_id !== selectedSubcategory) {
      return false;
    }
    return true;
  });

  const filteredGalleryImages = galleryImages.filter((image) =>
    image.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || '';
  };

  const getSubcategoryName = (subcategoryId: string | null) => {
    return subcategoryId ? subcategories.find(sub => sub.id === subcategoryId)?.name || '' : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setShowGallery(true);
              fetchGalleryImages();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ImagePlus className="h-4 w-4 mr-1" />
            Gestionar Imágenes
          </button>
          <button
            onClick={() => {
              setIsEditing(true);
              setEditingProduct({});
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Producto
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      {showGallery && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Galería de Imágenes
              </h2>
              <button
                onClick={() => {
                  setShowGallery(false);
                  setSelectedProductForImage(null);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-500"
                disabled={updatingImage}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar imágenes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="border-t border-b border-gray-200 py-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fileInput = e.currentTarget.querySelector(
                      'input[type="file"]'
                    ) as HTMLInputElement;
                    const file = fileInput.files?.[0];
                    if (file && imageTitle) {
                      await uploadImage(file, imageTitle);
                      fileInput.value = '';
                    }
                  }}
                  className="flex items-center space-x-4"
                >
                  <input
                    type="text"
                    placeholder="Título de la imagen"
                    value={imageTitle}
                    onChange={(e) => setImageTitle(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={uploadingImage}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Subir'
                    )}
                  </button>
                </form>
              </div>
            </div>

            {loadingGallery ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredGalleryImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageSelect(image)}
                    className="relative aspect-square group hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={updatingImage}
                  >
                    <img
                      src={image.url}
                      alt={image.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm truncate rounded-b-lg">
                      {image.title}
                    </div>
                    {updatingImage && (
                      <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                        <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {filteredGalleryImages.length === 0 && !loadingGallery && (
              <div className="text-center text-gray-500 py-12">
                No se encontraron imágenes
              </div>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingProduct?.name || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código de barras
                </label>
                <input
                  type="text"
                  value={editingProduct?.barcode || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      barcode: e.target.value,
                    })
                  }
                  placeholder="Escanee o ingrese el código"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <select
                  value={editingProduct?.category_id || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category_id: e.target.value,
                      subcategory_id: null,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {editingProduct?.category_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subcategoría
                  </label>
                  <select
                    value={editingProduct?.subcategory_id || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        subcategory_id: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar subcategoría</option>
                    {getSubcategoriesForCategory(editingProduct.category_id).map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingProduct?.is_weighable || false}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_weighable: e.target.checked,
                        unit_label: e.target.checked ? 'kg' : 'unidad',
                      })
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Producto pesable (por kg)
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct?.stock || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Precio por {editingProduct?.is_weighable ? 'kg' : 'unidad'}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct?.price || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-4 space-y-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Filter className="h-4 w-4" />
          <span>Filtros:</span>
        </div>
        <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('');
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && getSubcategoriesForCategory(selectedCategory).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Subcategoría
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Todas las subcategorías</option>
                {getSubcategoriesForCategory(selectedCategory).map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Imagen
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nombre
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Categoría
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Subcategoría
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Precio
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Stock
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Editar</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSelectedProductForImage(product);
                      setShowGallery(true);
                      fetchGalleryImages();
                    }}
                    className="relative group"
                  >
                    {product.image_url ? (
                      <div className="relative w-12 h-12">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                      {product.is_weighable && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Por kg
                        </span>
                      )}
                    </div>
                    {product.barcode && (
                      <div className="text-sm text-gray-500">
                        Código: {product.barcode}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {getCategoryName(product.category_id)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {getSubcategoryName(product.subcategory_id) || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm text-gray-900">
                    ${product.price.toFixed(2)}/{product.unit_label}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm text-gray-900">{product.stock}</div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditingProduct(product);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No hay productos que coincidan con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
}