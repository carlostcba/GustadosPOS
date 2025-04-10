import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  XCircle,
  Loader2,
  PlusCircle,
  MinusCircle,
  Receipt,
  Search,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { OrderDetails } from './OrderDetails';
import { CashRegisterReport } from './CashRegisterReport';
import { CashRegisterExpenses } from './CashRegisterExpenses';
import { PaymentProcessor } from './PaymentProcessor';

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
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
      setShowOpenForm(false);
    } catch (error: any) {
      console.error('Error starting cash register:', error);
      setError('Error al abrir la caja. Por favor intente nuevamente.');
    }
  }

  async function closeRegister(amount: number) {
    if (!user || !activeRegister) return;
    setError(null);

    try {
      const closeTime = new Date().toISOString();
      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: amount,
          closed_at: closeTime
        })
        .eq('id', activeRegister.id)
        .select()
        .single();

      if (error) throw error;

      // Create a CashRegister object with closing_amount as a number
      const closedRegisterData: CashRegister = {
        ...activeRegister,
        closing_amount: amount,
        closed_at: closeTime
      };

      setClosedRegister(closedRegisterData);
      setShowReport(true);
      setIsClosing(false);
      setShowConfirmation(false);
      setActiveRegister(null);
    } catch (error: any) {
      console.error('Error closing register:', error);
      setError('Error al cerrar la caja. Por favor intente nuevamente.');
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

  // Handle payment processed by payment processor component
  const handlePaymentProcessed = async () => {
    setShowPaymentMenu(null);
    // Refresh data
    await Promise.all([fetchOrders(), fetchActiveRegister()]);
  };

  // Handle closing the report and showing the open form
  const handleReportClosed = () => {
    setShowReport(false);
    setClosedRegister(null);
    setShowOpenForm(true);
  };

  // Validate closing amount and show confirmation
  const handleValidateClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const amount = parseFloat(form.amount.value);
    
    // Debug logs
    console.log("Formulario enviado, valor:", form.amount.value);
    
    if (isNaN(amount) || amount < 0) {
      setError('El monto de cierre debe ser un número válido mayor o igual a 0');
      return;
    }
    
    setClosingAmount(amount);
    setShowConfirmation(true);
    
    // Debug logs
    console.log("showConfirmation establecido a:", true);
    console.log("closingAmount establecido a:", amount);
  };

  // Calculate difference between expected and actual closing amount
  const calculateDifference = () => {
    const expectedAmount = calculateTotalInRegister();
    return closingAmount - expectedAmount;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  // Mostrar reporte de cierre cuando corresponda
  if (showReport && closedRegister) {
    return (
      <CashRegisterReport
        register={{
          ...closedRegister,
          closing_amount: closedRegister.closing_amount || 0
        }}
        onClose={handleReportClosed}
      />
    );
  }

  // Mostrar formulario de apertura cuando no hay caja activa
  if (!activeRegister || showOpenForm) {
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

  // Renderiza el componente principal incluyendo todas las vistas modales
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
      
      {/* Panel de cierre de caja */}
      {isClosing && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
              onSubmit={handleValidateClosing}
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
                  Verificar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Diálogo de confirmación de cierre */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Cierre de Caja
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Esta acción no tiene vuelta atrás. Verifique que el monto sea correcto.
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Monto Esperado:</div>
                <div className="text-right font-medium">${calculateTotalInRegister().toFixed(2)}</div>
                <div className="font-medium">Monto Declarado:</div>
                <div className="text-right font-medium">${closingAmount.toFixed(2)}</div>
                <div className="font-medium pt-2 border-t mt-2">Diferencia:</div>
                <div className={`text-right font-medium pt-2 border-t mt-2 ${
                  calculateDifference() === 0 ? 'text-green-600' : 
                  calculateDifference() > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  ${calculateDifference().toFixed(2)}
                </div>
              </div>
              
              <div className="mt-4">
                <div className={`flex items-center ${
                  calculateDifference() === 0 ? 'text-green-700' : 
                  calculateDifference() > 0 ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {calculateDifference() === 0 ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      <span>El cierre coincide con lo esperado</span>
                    </>
                  ) : calculateDifference() > 0 ? (
                    <>
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <span>Hay un sobrante de ${calculateDifference().toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <span>Hay un faltante de ${Math.abs(calculateDifference()).toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Volver y Revisar
              </button>
              <button
                onClick={() => closeRegister(closingAmount)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
              >
                Confirmar y Cerrar Caja
              </button>
            </div>
          </div>
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
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
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
        <PaymentProcessor
          order={orders.find(o => o.id === showPaymentMenu)!}
          registerId={activeRegister.id}
          onClose={() => setShowPaymentMenu(null)}
          onPaymentProcessed={handlePaymentProcessed}
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