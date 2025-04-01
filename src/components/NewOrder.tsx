import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Package, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  AlertCircle,
  Clock
} from 'lucide-react';
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
      setError(error.message || 'Error al cargar los datos');
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
    if (!customerName.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }
    if (isPreorder) {
      if (!customerEmail.trim()) {
        setError('El email del cliente es requerido para pedidos anticipados');
        return;
      }
      if (!customerPhone.trim()) {
        setError('El teléfono del cliente es requerido para pedidos anticipados');
        return;
      }
      if (!deliveryDate) {
        setError('La fecha de entrega es requerida para pedidos anticipados');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const totalAmount = calculateTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName.trim(),
          customer_email: isPreorder ? customerEmail.trim() : null,
          customer_phone: isPreorder ? customerPhone.trim() : null,
          is_preorder: isPreorder,
          delivery_date: isPreorder ? deliveryDate : null,
          total_amount: totalAmount,
          deposit_amount: 0,
          remaining_amount: totalAmount, 
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
    <div className="h-[85vh] flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex-none bg-white shadow-sm py-2 px-4">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Nuevo Pedido</h1>
            <button
              onClick={() => navigate('/orders')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Products */}
        <div className="w-3/5 overflow-hidden flex flex-col p-2">
          {/* Search and filters */}
          <div className="bg-white rounded-md shadow-sm p-2 mb-2 flex items-center space-x-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-8 pr-2 py-1 text-sm border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 text-sm focus:ring-indigo-500 py-1"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto p-1">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white p-2 rounded-md shadow-sm hover:shadow-md transition-shadow text-left flex flex-col h-44"
                >
                  {/* Product image */}
                  <div className="aspect-square mb-1 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 h-24">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {product.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        ${product.price.toFixed(2)}/{product.unit_label}
                      </div>
                      {product.is_weighable && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          kg
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="col-span-5 text-center py-10 text-gray-500">
                  No se encontraron productos
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right panel - Order details */}
        <div className="w-2/5 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Customer details */}
          <div className="p-3 border-b border-gray-200 space-y-2 overflow-y-auto" style={{ maxHeight: '230px' }}>
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-800">Datos del Cliente</h2>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPreorder}
                  onChange={(e) => setIsPreorder(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                />
                <span className="text-xs text-gray-700 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Pedido anticipado
                </span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1"
                  placeholder="Nombre del cliente"
                />
              </div>

              {isPreorder && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Email del Cliente
                      </label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1"
                        placeholder="Email"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1"
                        placeholder="Teléfono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Fecha de Entrega
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Order items */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Detalle del Pedido</h2>
            
            {error && (
              <div className="mb-3 p-2 text-xs text-red-700 bg-red-50 rounded-md flex items-start">
                <AlertCircle className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 py-1 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.product_name}</div>
                    <div className="text-xs text-gray-500">
                      ${item.unit_price.toFixed(2)}/{item.unit_label}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(index, item.quantity - (item.is_weighable ? 0.1 : 1))}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <div className="w-16 text-center font-medium text-xs">
                      {item.is_weighable ? item.quantity.toFixed(3) : item.quantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(index, item.quantity + (item.is_weighable ? 0.1 : 1))}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="w-16 text-right font-medium text-xs">
                    ${item.total_price.toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No hay productos agregados
                </div>
              )}
            </div>
          </div>

          {/* Footer - Payment and total */}
          <div className="p-3 border-t border-gray-200 space-y-3">
            <div className="flex justify-between items-center pb-2">
              <div className="text-xs text-gray-500">Total a pagar:</div>
              <div className="text-lg font-bold text-gray-900">
                ${calculateTotal().toFixed(2)}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center justify-center px-2 py-1 border rounded-md text-xs font-medium transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 text-gray-700 hover:bg-green-50'
                  }`}
                >
                  <Banknote className="w-3 h-3 mr-1" />
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`flex items-center justify-center px-2 py-1 border rounded-md text-xs font-medium transition-colors ${
                    paymentMethod === 'credit'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 text-gray-700 hover:bg-green-50'
                  }`}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex items-center justify-center px-2 py-1 border rounded-md text-xs font-medium transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 text-gray-700 hover:bg-green-50'
                  }`}
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Transfer.
                </button>
              </div>
            </div>

            {isPreorder && (
              <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded text-center">
                El cajero establecerá el monto de la seña al procesar el pago
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || items.length === 0 || !paymentMethod || !customerName}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-yellow-500 border border-transparent rounded-md shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Pedido'}
            </button>
          </div>
        </div>
      </div>

      {/* Quantity modal for weighable products */}
      {showQuantityModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4">
            <div className="text-center space-y-3">
              <h3 className="text-md font-medium text-gray-900">
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
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(e.target.value)}
                    step="0.001"
                    min="0"
                    className="block w-28 text-center text-2xl py-2 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onMouseDown={() => startIncrementing(true)}
                    onMouseUp={stopIncrementing}
                    onMouseLeave={stopIncrementing}
                    onTouchStart={() => startIncrementing(true)}
                    onTouchEnd={stopIncrementing}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setTempQuantity(Math.max(1, parseInt(tempQuantity) - 1).toString())}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(e.target.value)}
                    min="1"
                    step="1"
                    className="block w-24 text-center text-2xl py-2 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTempQuantity((parseInt(tempQuantity) + 1).toString())}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="pt-2 flex space-x-3">
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