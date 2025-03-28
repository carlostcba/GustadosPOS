import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Search, Package, Filter, Trash2, Save, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../lib/types';

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_weighable: boolean;
  unit_label: string;
};

type Order = {
  id: string;
  status: string;
  // Otros campos que puedan ser necesarios
};

type OrderDetailsProps = {
  orderId: string;
  onClose: () => void;
  userRole: 'seller' | 'cashier';
};

export function OrderDetails({ orderId, onClose, userRole }: OrderDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [tempItems, setTempItems] = useState<OrderItem[]>([]);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const itemsPerPage = 8;

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    setTempItems(items);
  }, [items]);

  async function fetchOrderDetails() {
    try {
      setLoading(true);
      setError(null);

      // Primero obtenemos la información básica de la orden para conocer su estado
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      // Guardamos el estado de la orden
      setOrderStatus(orderData.status);

      // Luego obtenemos los items de la orden
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price,
          products (
            is_weighable,
            unit_label
          )
        `)
        .eq('order_id', orderId)
        .order('id');

      if (error) throw error;

      const transformedData = (data || []).map(item => {
        // En Supabase, cuando usamos join de tablas con (), la relación viene como un array
        // Necesitamos extraer el primer elemento (si existe)
        const productData = item.products && Array.isArray(item.products) && item.products.length > 0 
          ? item.products[0] 
          : { is_weighable: false, unit_label: 'un' };
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_weighable: productData.is_weighable || false,
          unit_label: productData.unit_label || 'un'
        };
      });

      setItems(transformedData);
      setTempItems(transformedData);
      setUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setError('Error al cargar los detalles del pedido');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError('Error al cargar los productos: ' + (error.message || 'Error desconocido'));
    }
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setTempItems(tempItems.filter(i => i.id !== itemId));
    } else {
      setTempItems(tempItems.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: newQuantity * item.unit_price
            }
          : item
      ));
    }
    setUnsavedChanges(true);
  };

  const handleAddProduct = (product: Product) => {
    const existingItem = tempItems.find(item => item.product_id === product.id);
    
    if (existingItem) {
      handleUpdateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem = {
        id: `temp-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        is_weighable: product.is_weighable,
        unit_label: product.unit_label
      };
      setTempItems([...tempItems, newItem]);
      setUnsavedChanges(true);
    }
    setShowProductSelector(false);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      const itemsToRemove = items.filter(item => 
        !tempItems.some(temp => temp.id === item.id)
      );

      const itemsToUpdate = tempItems.filter(temp => 
        temp.id.startsWith('temp-') ? false :
        items.some(item => item.id === temp.id && item.quantity !== temp.quantity)
      );

      const itemsToAdd = tempItems.filter(temp => temp.id.startsWith('temp-'));

      if (itemsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .in('id', itemsToRemove.map(item => item.id));

        if (deleteError) throw deleteError;
      }

      for (const item of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('order_items')
          .update({
            quantity: item.quantity,
            total_price: item.total_price
          })
          .eq('id', item.id);

        if (updateError) throw updateError;
      }

      for (const item of itemsToAdd) {
        const { error: insertError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          });

        if (insertError) throw insertError;
      }

      const newTotal = tempItems.reduce((sum, item) => sum + item.total_price, 0);
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await fetchOrderDetails();
      setUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setError('Error al guardar los cambios: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const formatQuantity = (item: OrderItem) => {
    if (!item.is_weighable) {
      return item.quantity.toString();
    }
    return item.quantity < 1 
      ? `${(item.quantity * 1000).toFixed(0)}g`
      : `${item.quantity.toFixed(3)}kg`;
  };

  const handleClose = () => {
    if (unsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      onClose();
    }
  };

  // Determinar si se puede editar:
  // - Solo los vendedores pueden editar, y únicamente cuando la orden NO está cancelada
  // - Los cajeros nunca pueden editar
  const isEditable = userRole === 'seller' && orderStatus !== 'cancelled';

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Detalles del Pedido
          </h2>
          <div className="flex items-center space-x-4">
            {isEditable && unsavedChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 transform hover:scale-105"
              >
                <Save className="h-4 w-4 mr-1" />
                Guardar Cambios
              </button>
            )}
            {isEditable && (
              <button
                onClick={() => {
                  setShowProductSelector(true);
                  fetchProducts();
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 transform hover:scale-105"
                disabled={saving}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Producto
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-600">Cargando detalles...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    {isEditable && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tempItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="flex items-center justify-end space-x-2">
                          {isEditable && (
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - (item.is_weighable ? 0.1 : 1))}
                              className="p-1 text-gray-500 hover:text-gray-700 transition-colors duration-150"
                              disabled={saving}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                          <span className="w-20 text-center">
                            {formatQuantity(item)}
                          </span>
                          {isEditable && (
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + (item.is_weighable ? 0.1 : 1))}
                              className="p-1 text-gray-500 hover:text-gray-700 transition-colors duration-150"
                              disabled={saving}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">
                        ${item.unit_price.toFixed(2)}/{item.unit_label}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">
                        ${item.total_price.toFixed(2)}
                      </td>
                      {isEditable && (
                        <td className="px-4 py-4 text-sm text-right">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 0)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-150"
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                      ${tempItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                    </td>
                    {isEditable && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCloseConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Cambios sin guardar
                </h3>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Hay cambios sin guardar. ¿Desea descartarlos?
              </p>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowCloseConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors duration-150"
              >
                No, mantener cambios
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirmation(false);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 transition-colors duration-150"
              >
                Sí, descartar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {showProductSelector && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Agregar Producto
              </h2>
              <button
                onClick={() => setShowProductSelector(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors duration-150"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4 sticky top-0 bg-white pb-4 z-10">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 text-left transform hover:scale-105"
                      disabled={saving}
                    >
                      <div className="aspect-square mb-2 bg-gray-100 rounded-lg overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900 truncate">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${product.price.toFixed(2)}/{product.unit_label}
                        </div>
                        {product.is_weighable && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Por kg
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {filteredProducts.length > itemsPerPage && (
                  <div className="flex justify-center items-center space-x-4 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {filteredProducts.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    No se encontraron productos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}