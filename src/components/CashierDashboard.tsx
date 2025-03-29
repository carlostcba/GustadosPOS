import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  XCircle,
  ChevronDown,
  Percent,
  Receipt,
  Loader2,
  PlusCircle,
  MinusCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { OrderDetails } from './OrderDetails';
import { CashRegisterReport } from './CashRegisterReport';
import { CashRegisterExpenses } from './CashRegisterExpenses';

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  is_preorder: boolean;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  deposit_amount: number;
  remaining_amount: number;
  created_at: string;
  payment_method: string | null;
};

type CashRegister = {
  id: string;
  opening_amount: number;
  closing_amount: number | null;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  deposits_received: number;
  started_at: string;
  closed_at: string | null;
  expenses_total: number;
};

type PaymentMethodType = 'cash' | 'credit' | 'transfer';

type PaymentMenuProps = {
  order: Order;
  onProcess: (method: PaymentMethodType, discount?: number, customDepositAmount?: number) => void;
  onClose: () => void;
};

function PaymentMenu({ order, onProcess, onClose }: PaymentMenuProps) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>(
    (order.payment_method as PaymentMethodType) || 'cash'
  );
  
  // Para pedidos anticipados con estado 'pending', permitimos cambiar el monto de la seña
  const [depositAmount, setDepositAmount] = useState<number>(
    order.is_preorder && order.status === 'pending' ? order.deposit_amount : 0
  );
  
  // Determine the base amount to be paid based on order status and custom deposit
  const baseAmount = order.is_preorder ? 
    order.status === 'pending' ? depositAmount : order.remaining_amount 
    : order.total_amount;
  
  // Calculate final amount after discount
  const discountAmount = (baseAmount * discountPercent) / 100;
  const finalAmount = baseAmount - discountAmount;

  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponError("Ingrese un código de cupón");
      return;
    }
    
    try {
      setCouponLoading(true);
      setCouponError(null);
      
      // Check if coupon exists and is active
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error('Cupón no encontrado o inactivo');
      }
      
      // Check if the coupon can be applied to this order type
      if (order.is_preorder && !data.applies_to_preorders) {
        throw new Error('Este cupón no es válido para pedidos anticipados');
      }
      
      // Check if the coupon has reached its usage limit
      if (data.usage_limit > 0) {
        const { count, error: usageError } = await supabase
          .from('coupon_usages')
          .select('*', { count: 'exact' })
          .eq('coupon_id', data.id);
          
        if (usageError) throw usageError;
        
        if (count && count >= data.usage_limit) {
          throw new Error('Este cupón ha alcanzado su límite de uso');
        }
      }
      
      // Apply the discount
      setDiscountPercent(data.discount_percentage);
      
    } catch (error: any) {
      setCouponError(error.message);
      setDiscountPercent(0);
    } finally {
      setCouponLoading(false);
    }
  };

  // Don't allow payment if order is already paid
  if (order.status === 'paid') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">Pedido ya pagado</h3>
            <p className="text-gray-500 mb-4">Este pedido ya ha sido pagado completamente.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Cobrar Pedido</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">
              Pedido #{order.order_number}
            </p>
            <p className="text-sm text-gray-500">
              Cliente: {order.customer_name}
            </p>
            <p className="font-medium">
              Total: ${order.total_amount.toFixed(2)}
            </p>
            {order.is_preorder && (
              <>
                {order.status === 'pending' ? (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      Monto de Seña a Cobrar
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={order.total_amount}
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= order.total_amount) {
                            setDepositAmount(value);
                          }
                        }}
                        className="block w-full pl-7 pr-12 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button 
                          type="button"
                          onClick={() => setDepositAmount(order.total_amount * 0.5)}
                          className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                        >
                          50%
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Restante: ${(order.total_amount - depositAmount).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      Seña pagada: ${order.deposit_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Restante: ${order.remaining_amount.toFixed(2)}
                    </p>
                    <p className="text-sm font-medium text-brand-green">
                      Cobrando saldo restante
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Only show coupon section for regular orders or when paying the remaining balance */}
        {(!order.is_preorder || order.status !== 'pending') && (
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cupón de Descuento
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Ingrese código"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => validateCoupon(couponCode)}
                    disabled={couponLoading}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-1 text-sm text-red-600">{couponError}</p>
                )}
              </div>

              {discountPercent > 0 && (
                <div className="text-sm text-gray-500 bg-green-50 p-3 rounded-md">
                  <p className="text-green-700 font-medium">Descuento aplicado: {discountPercent}%</p>
                  <p>Descuento: -${discountAmount.toFixed(2)}</p>
                  <p className="font-medium">Final: ${finalAmount.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Método de Pago</p>
          
          <div className="grid grid-cols-3 gap-2">
            <label className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer ${selectedPaymentMethod === 'cash' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="cash" 
                checked={selectedPaymentMethod === 'cash'} 
                onChange={() => setSelectedPaymentMethod('cash')}
                className="sr-only"
              />
              <Banknote className="h-5 w-5 text-gray-600 mb-1" />
              <span className="text-sm">Efectivo</span>
            </label>

            <label className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer ${selectedPaymentMethod === 'credit' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="credit" 
                checked={selectedPaymentMethod === 'credit'} 
                onChange={() => setSelectedPaymentMethod('credit')}
                className="sr-only"
              />
              <CreditCard className="h-5 w-5 text-gray-600 mb-1" />
              <span className="text-sm">Tarjeta</span>
            </label>

            <label className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer ${selectedPaymentMethod === 'transfer' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="transfer" 
                checked={selectedPaymentMethod === 'transfer'} 
                onChange={() => setSelectedPaymentMethod('transfer')}
                className="sr-only"
              />
              <ArrowRight className="h-5 w-5 text-gray-600 mb-1" />
              <span className="text-sm">Transferencia</span>
            </label>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-md text-center">
            <p className="text-sm text-gray-500">Total a pagar</p>
            <p className="text-xl font-bold text-gray-900">${finalAmount.toFixed(2)}</p>
          </div>

          <button
            onClick={() => onProcess(
              selectedPaymentMethod, 
              discountPercent,
              order.is_preorder && order.status === 'pending' ? depositAmount : undefined
            )}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={order.is_preorder && order.status === 'pending' && depositAmount <= 0}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Procesar Pago
          </button>
        </div>
      </div>
    </div>
  );
}

export function CashierDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [closedRegister, setClosedRegister] = useState<CashRegister | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentMenu, setShowPaymentMenu] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'regular' | 'preorder'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchActiveRegister();

      // Set up realtime subscriptions
      const ordersChannel = supabase
        .channel('orders-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => fetchOrders()
        )
        .subscribe();

      const registerChannel = supabase
        .channel('register-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cash_registers' },
          () => fetchActiveRegister()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(registerChannel);
      };
    }
  }, [user]);

  // Apply filters when orders or filter settings change
  useEffect(() => {
    if (orders) {
      let result = [...orders];

      // Apply order type filter
      if (orderFilter !== 'all') {
        result = result.filter(order => 
          orderFilter === 'preorder' ? order.is_preorder : !order.is_preorder
        );
      }

      // Apply search filter
      if (searchTerm) {
        const lowercaseSearch = searchTerm.toLowerCase();
        result = result.filter(order => 
          order.order_number.toLowerCase().includes(lowercaseSearch) ||
          order.customer_name.toLowerCase().includes(lowercaseSearch)
        );
      }

      // Sort orders: pre-orders by delivery date, regular orders by creation date
      result.sort((a, b) => {
        if (a.is_preorder && b.is_preorder) {
          // Both are pre-orders, sort by delivery date
          return new Date(a.delivery_date!).getTime() - new Date(b.delivery_date!).getTime();
        }
        if (a.is_preorder) return -1; // Preorders first
        if (b.is_preorder) return 1;
        // For regular orders, sort by creation date
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setFilteredOrders(result);
    }
  }, [orders, orderFilter, searchTerm]);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing']) // Get pending and processing orders
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError('Error al cargar los pedidos: ' + error.message);
    }
  }

  async function fetchActiveRegister() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('cashier_id', user.id)
        .is('closed_at', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setActiveRegister(data);
    } catch (error: any) {
      console.error('Error fetching active register:', error);
      setError('Error al cargar el estado de la caja: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function startCashRegister(openingAmount: number) {
    if (!user) return;
    setError(null);

    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          cashier_id: user.id,
          opening_amount: openingAmount,
          cash_sales: 0,
          card_sales: 0,
          transfer_sales: 0,
          deposits_received: 0,
          expenses_total: 0
        })
        .select()
        .single();

      if (error) throw error;
      setActiveRegister(data);
    } catch (error: any) {
      console.error('Error starting cash register:', error);
      setError('Error al abrir la caja. Por favor intente nuevamente.');
    }
  }

  async function closeRegister(closingAmount: number) {
    if (!user || !activeRegister) return;
    setError(null);

    try {
      const closeTime = new Date().toISOString();
      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: closingAmount,
          closed_at: closeTime
        })
        .eq('id', activeRegister.id)
        .select()
        .single();

      if (error) throw error;

      // Create a CashRegister object with closing_amount as a number
      const closedRegisterData: CashRegister = {
        ...activeRegister,
        closing_amount: closingAmount,
        closed_at: closeTime
      };

      setClosedRegister(closedRegisterData);
      setShowReport(true);
      setIsClosing(false);
      setActiveRegister(null);
    } catch (error: any) {
      console.error('Error closing register:', error);
      setError('Error al cerrar la caja. Por favor intente nuevamente.');
    }
  }

  async function processPayment(order: Order, paymentMethod: PaymentMethodType, discountPercent: number = 0, customDepositAmount?: number) {
    if (!user || !activeRegister) return;
    setError(null);

    try {
      // Determine payment amount based on order status and custom deposit if provided
      let baseAmount = order.is_preorder ? 
        order.status === 'pending' ? 
          // Si se proporciona un monto de seña personalizado, usarlo; de lo contrario, usar el valor predeterminado
          (customDepositAmount !== undefined ? customDepositAmount : order.deposit_amount) 
          : order.remaining_amount
        : order.total_amount;
      
      // Apply discount if any
      let discountAmount = 0;
      if (discountPercent > 0) {
        discountAmount = (baseAmount * discountPercent) / 100;
        baseAmount = baseAmount - discountAmount;
      }

      // Si es un pedido anticipado y estamos cobrando la seña con un monto personalizado,
      // necesitamos actualizar el registro de la orden con los nuevos montos
      if (order.is_preorder && order.status === 'pending' && customDepositAmount !== undefined) {
        const newRemaining = order.total_amount - customDepositAmount;
        
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            deposit_amount: customDepositAmount,
            remaining_amount: newRemaining
          })
          .eq('id', order.id);
          
        if (updateOrderError) throw updateOrderError;
      }
      
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: baseAmount,
          payment_method: paymentMethod,
          is_deposit: order.is_preorder && order.status === 'pending',
          discount_percentage: discountPercent > 0 ? discountPercent : null,
          discount_amount: discountAmount > 0 ? discountAmount : null
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // If there's a discount, create coupon usage record
      if (discountPercent > 0) {
        // Intentamos encontrar el cupón que se aplicó
        const { data: coupons, error: couponsError } = await supabase
          .from('coupons')
          .select('id')
          .eq('discount_percentage', discountPercent)
          .limit(1);
          
        if (!couponsError && coupons && coupons.length > 0) {
          // Registramos el uso del cupón
          const { error: usageError } = await supabase
            .from('coupon_usages')
            .insert({
              order_id: order.id,
              payment_id: payment.id,
              coupon_id: coupons[0].id,
              discount_amount: discountAmount,
            });

          if (usageError) console.error('Error registrando uso de cupón:', usageError);
        }
      }

      // Update order status and payment info
      const newStatus = order.is_preorder ? 
        order.status === 'pending' ? 'processing' : 'paid' : 'paid';
        
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          cashier_id: user.id,
          payment_method: paymentMethod,
          // Update the last_payment_date
          last_payment_date: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Update cash register totals based on payment method
      let updateObject: Record<string, any> = {};
      
      if (paymentMethod === 'cash') {
        updateObject.cash_sales = activeRegister.cash_sales + baseAmount;
      } else if (paymentMethod === 'credit') {
        updateObject.card_sales = activeRegister.card_sales + baseAmount;
      } else if (paymentMethod === 'transfer') {
        updateObject.transfer_sales = activeRegister.transfer_sales + baseAmount;
      }
      
      // If this is a deposit payment, track it separately
      if (order.is_preorder && order.status === 'pending') {
        updateObject.deposits_received = activeRegister.deposits_received + baseAmount;
      }
      
      const { error: registerError } = await supabase
        .from('cash_registers')
        .update(updateObject)
        .eq('id', activeRegister.id);
        
      if (registerError) throw registerError;

      // Add to order queue if payment completes the order
      if (newStatus === 'paid') {
        const { error: queueError } = await supabase
          .from('order_queue')
          .insert({
            order_id: order.id,
            priority: order.is_preorder ? 1 : 0, // Pre-orders get higher priority
            status: 'waiting'
          });

        if (queueError) throw queueError;
      }

      setShowPaymentMenu(null);
      
      // Refresh data
      await Promise.all([fetchOrders(), fetchActiveRegister()]);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError('Error al procesar el pago: ' + error.message);
    }
  }

  // Calculate total sales and balance
  const calculateTotalSales = () => {
    if (!activeRegister) return 0;
    return activeRegister.cash_sales + activeRegister.card_sales + activeRegister.transfer_sales;
  };

  const calculateTotalInRegister = () => {
    if (!activeRegister) return 0;
    return activeRegister.opening_amount + activeRegister.cash_sales - activeRegister.expenses_total;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  if (!activeRegister) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Abrir Nueva Caja
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(
                (e.target as HTMLFormElement).amount.value
              );
              if (amount > 0) {
                startCashRegister(amount);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Monto Inicial
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  required
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Abrir Caja
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isClosing) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Cerrar Caja
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="mb-6 space-y-2">
            <p className="text-sm text-gray-600 font-medium">Resumen de Caja:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Monto Inicial:</div>
              <div className="text-right">${activeRegister.opening_amount.toFixed(2)}</div>
              <div>Ventas en Efectivo:</div>
              <div className="text-right">${activeRegister.cash_sales.toFixed(2)}</div>
              <div>Ventas con Tarjeta:</div>
              <div className="text-right">${activeRegister.card_sales.toFixed(2)}</div>
              <div>Ventas por Transferencia:</div>
              <div className="text-right">${activeRegister.transfer_sales.toFixed(2)}</div>
              <div>Señas Recibidas:</div>
              <div className="text-right">${activeRegister.deposits_received.toFixed(2)}</div>
              <div>Egresos:</div>
              <div className="text-right text-red-600">-${activeRegister.expenses_total.toFixed(2)}</div>
              <div className="font-medium pt-2 border-t mt-2">Total Esperado:</div>
              <div className="text-right font-medium pt-2 border-t mt-2">
                ${calculateTotalInRegister().toFixed(2)}
              </div>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(
                (e.target as HTMLFormElement).amount.value
              );
              if (amount >= 0) {
                closeRegister(amount);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Monto de Cierre (Efectivo en Caja)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={calculateTotalInRegister().toFixed(2)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setIsClosing(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cerrar Caja
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-800 hover:text-red-900 font-medium"
          >
            Cerrar
          </button>
        </div>
      )}
      
      {/* Resumen de Caja */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Resumen de Caja
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowExpenseForm(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <MinusCircle className="w-4 h-4 mr-1" />
              Registrar Egreso
            </button>
            <button
              onClick={() => setIsClosing(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cerrar Caja
            </button>
          </div>
        </div>
        
        {/* Primera fila: valores clave */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-700">Monto Inicial</div>
            <div className="mt-1 flex items-center">
              <PlusCircle className="w-5 h-5 text-blue-600 mr-1" />
              <span className="text-xl font-semibold">
                ${activeRegister.opening_amount.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-700">Egresos</div>
            <div className="mt-1 flex items-center">
              <MinusCircle className="w-5 h-5 text-red-600 mr-1" />
              <span className="text-xl font-semibold">
                ${activeRegister.expenses_total.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-700">Total Recaudado</div>
            <div className="mt-1 flex items-center">
              <DollarSign className="w-5 h-5 text-green-600 mr-1" />
              <span className="text-xl font-semibold">
                ${calculateTotalSales().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Segunda fila: desglose de ventas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Ventas en Efectivo</div>
            <div className="mt-1 flex items-center">
              <Banknote className="w-5 h-5 text-green-600 mr-1" />
              <span className="text-xl font-semibold">
                ${activeRegister.cash_sales.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Ventas con Tarjeta</div>
            <div className="mt-1 flex items-center">
              <CreditCard className="w-5 h-5 text-blue-600 mr-1" />
              <span className="text-xl font-semibold">
                ${activeRegister.card_sales.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Ventas por Transferencia</div>
            <div className="mt-1 flex items-center">
              <ArrowRight className="w-5 h-5 text-purple-600 mr-1" />
              <span className="text-xl font-semibold">
                ${activeRegister.transfer_sales.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Señas Recibidas</div>
            <div className="mt-1 flex items-center">
              <DollarSign className="w-5 h-5 text-yellow-600 mr-1" />
              <span className="text-xl font-semibold">
                ${activeRegister.deposits_received.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Tercera fila: balance actual en caja */}
        <div className="mt-4 bg-indigo-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Banknote className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-indigo-700">Balance Actual en Caja (Efectivo)</span>
            </div>
            <span className="text-xl font-bold text-indigo-700">
              ${calculateTotalInRegister().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda para la cola de pedidos */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Cola de Pedidos</h2>
          
          <div className="flex space-x-2">
            {/* Filtros de tipo de pedido */}
            <div className="inline-flex rounded-md shadow-sm">
              <button 
                onClick={() => setOrderFilter('all')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  orderFilter === 'all' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button 
                onClick={() => setOrderFilter('regular')}
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  orderFilter === 'regular' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Órdenes
              </button>
              <button 
                onClick={() => setOrderFilter('preorder')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                  orderFilter === 'preorder' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Pedidos Anticipados
              </button>
            </div>
            
            {/* Búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por # o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="divide-y divide-gray-200">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-medium text-gray-900">
                        #{order.order_number}
                      </span>
                      <span className="text-lg text-gray-900">{order.customer_name}</span>
                      {order.is_preorder && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {order.status === 'pending' ? 'Seña pendiente' : 'Saldo pendiente'}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 space-y-1">
                      <p>Creado: {new Date(order.created_at).toLocaleString()}</p>
                      {order.delivery_date && (
                        <p className="text-brand-green font-medium">
                          Entrega: {new Date(order.delivery_date).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">
                        ${order.total_amount.toFixed(2)}
                      </p>
                      {order.is_preorder && (
                        <p className="mt-1 text-sm text-gray-500">
                          {order.status === 'pending' ? (
                            <>
                              <span className="font-medium">A cobrar (seña):</span> ${order.deposit_amount.toFixed(2)}
                            </>
                          ) : (
                            <>
                              <span className="font-medium">A cobrar (saldo):</span> ${order.remaining_amount.toFixed(2)}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Ver Detalle
                      </button>
                      <button
                        onClick={() => setShowPaymentMenu(order.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Cobrar {order.is_preorder && order.status === 'pending' ? 'Seña' : 
                               order.is_preorder && order.status === 'processing' ? 'Saldo' : ''}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              No hay pedidos pendientes de cobro
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {selectedOrderId && (
        <OrderDetails
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          userRole="cashier"
        />
      )}

      {showPaymentMenu && (
        <PaymentMenu
          order={orders.find(o => o.id === showPaymentMenu)!}
          onProcess={(method, discount, customDepositAmount) => {
            const order = orders.find(o => o.id === showPaymentMenu)!;
            processPayment(order, method, discount, customDepositAmount);
          }}
          onClose={() => setShowPaymentMenu(null)}
        />
      )}

      {showReport && closedRegister && (
        <CashRegisterReport
          register={{
            ...closedRegister,
            closing_amount: closedRegister.closing_amount || 0
          }}
          onClose={() => {
            setShowReport(false);
            setClosedRegister(null);
          }}
        />
      )}

      {showExpenseForm && activeRegister && (
        <CashRegisterExpenses
          registerId={activeRegister.id}
          onClose={() => setShowExpenseForm(false)}
          onSuccess={() => {
            setShowExpenseForm(false);
            fetchActiveRegister();
          }}
        />
      )}
    </div>
  );
}