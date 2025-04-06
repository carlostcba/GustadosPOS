import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Package, Truck, Calendar, Pencil, X, Trash2, AlertTriangle, Eye, DollarSign, CreditCard, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { OrderDetails } from './OrderDetails';

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  is_preorder: boolean;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  deposit_amount: number;
  remaining_amount: number;
  created_at: string;
  order_type: 'regular' | 'pre_order' | 'delivery';
  seller_id: string;
  payment_method: 'cash' | 'credit' | 'transfer' | null;
};

type UserProfile = {
  id: string;
  role: 'seller' | 'cashier';
  full_name: string;
};

export function OrderList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'regular' | 'pre_order' | 'delivery'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  
  // Usar useRef para mantener la referencia al canal entre renderizados
  const channelRef = useRef<any>(null);
  
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchOrders();
      
      // Crear un canal solo si no existe ya
      try {
        if (!channelRef.current) {
          console.log('Inicializando canal de Supabase...');
          
          channelRef.current = supabase
            .channel('orders-changes')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'orders' },
              (payload) => {
                console.log('Cambios en tabla orders detectados:', payload);
                fetchOrders();
              }
            )
            .subscribe((status) => {
              console.log('Estado de suscripción:', status);
            });
        }
      } catch (err) {
        console.error('Error al crear canal de Supabase:', err);
      }
    }
    
    // Limpiar el canal cuando el componente se desmonta
    return () => {
      if (channelRef.current) {
        console.log('Limpiando canal de Supabase...');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  async function fetchOrders() {
    if (!user || !profile) return;

    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile.role === 'seller') {
        query = query
          .eq('seller_id', user.id)
          .neq('status', 'paid');
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: editingOrder.customer_name,
          customer_email: editingOrder.customer_email,
          customer_phone: editingOrder.customer_phone,
          delivery_date: editingOrder.delivery_date
        })
        .eq('id', editingOrder.id);

      if (error) throw error;

      setEditingOrder(null);
      await fetchOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      setError('Error al actualizar el pedido: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      setConfirmingDelete(null);
      await fetchOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      setError('Error al cancelar el pedido: ' + (error.message || 'Error desconocido'));
    }
  };

  const filteredOrders = orders.filter(order => {
    if (selectedType === 'all') return true;
    return order.order_type === selectedType;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="w-4 h-4" />;
      case 'credit':
        return <CreditCard className="w-4 h-4" />;
      case 'transfer':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPaymentMethodText = (method: string | null) => {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'credit':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return 'No especificado';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              selectedType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedType('regular')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              selectedType === 'regular'
                ? 'bg-blue-900 text-white'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            <Package className="w-4 h-4 mr-1" />
            Regular (O001-O999)
          </button>
          <button
            onClick={() => setSelectedType('pre_order')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              selectedType === 'pre_order'
                ? 'bg-[#006134] text-white'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            <Clock className="w-4 h-4 mr-1" />
            Pre-order (P001-P999)
          </button>
          <button
            onClick={() => setSelectedType('delivery')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              selectedType === 'delivery'
                ? 'bg-yellow-900 text-white'
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            <Truck className="w-4 h-4 mr-1" />
            Delivery (D001-D999)
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        {filteredOrders.map((order) => (
          <div 
            key={order.id} 
            className="p-6 hover:bg-gray-50 transition duration-150"
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Order Info - 7 columns */}
              <div className="col-span-7">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-medium text-gray-900">
                    {order.order_number}
                  </span>
                  <span className="text-lg text-gray-900">{order.customer_name}</span>
                  {order.order_type === 'pre_order' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-[#006134]">
                      <Clock className="w-3 h-3 mr-1" />
                      Pre-order
                    </span>
                  )}
                  {order.order_type === 'delivery' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Truck className="w-3 h-3 mr-1" />
                      Delivery
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.status === 'paid' ? 'Pagado' : 
                     order.status === 'cancelled' ? 'Cancelado' : 
                     order.status === 'pending' ? 'Pendiente' : 'Procesando'}
                  </span>
                  {order.payment_method && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getPaymentMethodIcon(order.payment_method)}
                      <span className="ml-1">{getPaymentMethodText(order.payment_method)}</span>
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Creado: {formatDate(order.created_at)}
                  </div>
                  {order.delivery_date && (
                    <div className="flex items-center text-[#006134]">
                      <Clock className="w-4 h-4 mr-1" />
                      Entrega: {formatDate(order.delivery_date)}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Info - 2 columns */}
              <div className="col-span-2 text-right">
                <p className="text-lg font-medium text-gray-900">
                  ${order.total_amount.toFixed(2)}
                </p>
                {order.is_preorder && order.status !== 'paid' && (
                  <p className="mt-1 text-sm text-gray-500">
                    Seña: ${order.deposit_amount.toFixed(2)}
                    <br />
                    Restante: ${order.remaining_amount.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Action Buttons - 3 columns */}
              <div className="col-span-3 flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedOrderId(order.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </button>
                {profile?.role === 'seller' && order.status !== 'cancelled' && order.status !== 'paid' && (
                  <button
                    onClick={() => setEditingOrder(order)}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-150"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {order.status !== 'cancelled' && order.status !== 'paid' && (
                  <button
                    onClick={() => setConfirmingDelete(order.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-150"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No se encontraron órdenes
          </div>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetails
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          userRole={profile?.role || 'cashier'}
        />
      )}

      {editingOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Editar Pedido #{editingOrder.order_number}
              </h2>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={editingOrder.customer_name}
                  onChange={(e) => setEditingOrder({
                    ...editingOrder,
                    customer_name: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {editingOrder.is_preorder && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email del Cliente
                    </label>
                    <input
                      type="email"
                      value={editingOrder.customer_email || ''}
                      onChange={(e) => setEditingOrder({
                        ...editingOrder,
                        customer_email: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Teléfono del Cliente
                    </label>
                    <input
                      type="tel"
                      value={editingOrder.customer_phone || ''}
                      onChange={(e) => setEditingOrder({
                        ...editingOrder,
                        customer_phone: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha de Entrega
                    </label>
                    <input
                      type="datetime-local"
                      value={editingOrder.delivery_date?.slice(0, 16) || ''}
                      onChange={(e) => setEditingOrder({
                        ...editingOrder,
                        delivery_date: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateOrder}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Cancelación
                </h3>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-sm text-gray-500">
                ¿Está seguro que desea cancelar este pedido? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmingDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                No, mantener
              </button>
              <button
                onClick={() => confirmingDelete && handleDeleteOrder(confirmingDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
              >
                Sí, cancelar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}