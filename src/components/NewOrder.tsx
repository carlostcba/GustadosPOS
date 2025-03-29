import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Minus, Trash2, Search, Package, Filter, CreditCard, Banknote, ArrowRight } from 'lucide-react';
import type { Product, Category } from '../lib/types';

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_label: string;
  is_weighable: boolean;
};

type PaymentMethod = 'cash' | 'credit' | 'transfer';

export function NewOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPreorder, setIsPreorder] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // Refs for handling long press
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const pressStartTime = useRef<number>(0);
  const incrementInterval = useRef<NodeJS.Timeout | null>(null);
  const currentIncrement = useRef<number>(0.01);
  const isIncrementing = useRef<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Cleanup timers on unmount
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (incrementInterval.current) clearInterval(incrementInterval.current);
    };
  }, []);

  async function fetchInitialData() {
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
      console.error('Error loading data:', error);
    }
  }

  const handleWeightIncrement = (isIncrease: boolean) => {
    if (!selectedProduct?.is_weighable) return;
    
    const currentValue = parseFloat(tempQuantity) || 0;
    const newValue = isIncrease 
      ? currentValue + currentIncrement.current
      : Math.max(0, currentValue - currentIncrement.current);
    
    setTempQuantity(newValue.toFixed(3));
  };

  const startIncrementing = (isIncrease: boolean) => {
    if (!selectedProduct?.is_weighable) return;

    isIncrementing.current = true;
    pressStartTime.current = Date.now();
    currentIncrement.current = 0.01; // Start with 10g

    // Initial increment
    handleWeightIncrement(isIncrease);

    // Set up continuous increment
    pressTimer.current = setTimeout(() => {
      // Switch to 100g after 1 second
      currentIncrement.current = 0.1;
      
      incrementInterval.current = setInterval(() => {
        if (Date.now() - pressStartTime.current > 2000) {
          // Switch to 1kg after 2 seconds
          currentIncrement.current = 1;
        }
        handleWeightIncrement(isIncrease);
      }, 100);
    }, 1000);
  };

  const stopIncrementing = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (incrementInterval.current) clearInterval(incrementInterval.current);
    isIncrementing.current = false;
    currentIncrement.current = 0.01;
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleProductClick = (product: Product) => {
    if (product.is_weighable) {
      setSelectedProduct(product);
      setTempQuantity('0.000');
      setShowQuantityModal(true);
    } else {
      // Automatically add non-weighable products with quantity 1
      const existingItem = items.find(item => item.product_id === product.id);
      
      if (existingItem) {
        // If item exists, increment quantity by 1
        setItems(items.map(item =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price
              }
            : item
        ));
      } else {
        // If item doesn't exist, add it with quantity 1
        setItems([...items, {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          total_price: product.price,
          unit_label: product.unit_label,
          is_weighable: product.is_weighable
        }]);
      }
    }
  };

  const handleQuantityConfirm = () => {
    if (!selectedProduct) return;

    const quantity = parseFloat(tempQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    const existingItem = items.find(item => item.product_id === selectedProduct.id);
    
    if (existingItem) {
      setItems(items.map(item =>
        item.product_id === selectedProduct.id
          ? {
              ...item,
              quantity: quantity,
              total_price: quantity * item.unit_price
            }
          : item
      ));
    } else {
      setItems([...items, {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: quantity,
        unit_price: selectedProduct.price,
        total_price: quantity * selectedProduct.price,
        unit_label: selectedProduct.unit_label,
        is_weighable: selectedProduct.is_weighable
      }]);
    }
    
    setShowQuantityModal(false);
    setSelectedProduct(null);
    setTempQuantity('');
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(index);
      return;
    }

    setItems(items.map((item, i) =>
      i === index
        ? {
            ...item,
            quantity: newQuantity,
            total_price: newQuantity * item.unit_price
          }
        : item
    ));
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;
    if (items.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }
    if (!paymentMethod) {
      setError('Debe seleccionar un método de pago');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const totalAmount = calculateTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName,
          customer_email: isPreorder ? customerEmail : null,
          customer_phone: isPreorder ? customerPhone : null,
          is_preorder: isPreorder,
          delivery_date: isPreorder ? deliveryDate : null,
          total_amount: totalAmount,
          // No calculamos la seña, esto lo hará el cajero
          deposit_amount: 0,
          remaining_amount: totalAmount, // El monto pendiente inicialmente es el total
          seller_id: user.id,
          status: 'pending',
          order_type: isPreorder ? 'pre_order' : 'regular',
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      navigate('/orders');
    } catch (error: any) {
      console.error('Error creating order:', error);
      setError(error.message || 'Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-none p-4 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
            <button
              onClick={() => navigate('/orders')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-2/3 bg-gray-50 p-4 overflow-auto">
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
                <div className="flex items-center space-x-4">
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
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
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
            </div>
          </div>

          <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isPreorder}
                      onChange={(e) => setIsPreorder(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Pedido anticipado</span>
                  </label>
                </div>

                {isPreorder && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email del Cliente
                      </label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Teléfono del Cliente
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Fecha de Entrega
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 py-2 border-b border-gray-200">
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-gray-500">
                        ${item.unit_price.toFixed(2)}/{item.unit_label}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(index, item.quantity - (item.is_weighable ? 0.1 : 1))}
                        className="p-2 text-gray-500 hover:text-gray-700"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="w-20 text-center font-medium">
                        {item.is_weighable ? item.quantity.toFixed(3) : item.quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(index, item.quantity + (item.is_weighable ? 0.1 : 1))}
                        className="p-2 text-gray-500 hover:text-gray-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="w-24 text-right font-medium">
                      ${item.total_price.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No hay productos agregados
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="space-y-4">
                <div className="text-right">
                  <div className="text-lg font-medium">
                    Total: ${calculateTotal().toFixed(2)}
                  </div>
                  {isPreorder && (
                    <div className="text-sm text-gray-500">
                      El cajero establecerá el monto de la seña
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'cash'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'credit'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Tarjeta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'transfer'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Transfer.
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || items.length === 0 || !paymentMethod}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-yellow-500 border border-transparent rounded-md shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando...' : 'Crear Pedido'}
                </button>

                {error && (
                  <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQuantityModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedProduct.name}
              </h3>
              <p className="text-sm text-gray-500">
                ${selectedProduct.price.toFixed(2)}/{selectedProduct.unit_label}
              </p>
              
              {selectedProduct.is_weighable ? (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    type="button"
                    onMouseDown={() => startIncrementing(false)}
                    onMouseUp={stopIncrementing}
                    onMouseLeave={stopIncrementing}
                    onTouchStart={() => startIncrementing(false)}
                    onTouchEnd={stopIncrementing}
                    className="p-2 text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(e.target.value)}
                    step="0.001"
                    min="0"
                    className="block w-32 text-center text-3xl py-3 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onMouseDown={() => startIncrementing(true)}
                    onMouseUp={stopIncrementing}
                    onMouseLeave={stopIncrementing}
                    onTouchStart={() => startIncrementing(true)}
                    onTouchEnd={stopIncrementing}
                    className="p-2 text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setTempQuantity(Math.max(1, parseInt(tempQuantity) - 1).toString())}
                    className="p-2 text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(e.target.value)}
                    min="1"
                    step="1"
                    className="block w-24 text-center text-3xl py-3 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTempQuantity((parseInt(tempQuantity) + 1).toString())}
                    className="p-2 text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuantityModal(false);
                    setSelectedProduct(null);
                    setTempQuantity('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleQuantityConfirm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}