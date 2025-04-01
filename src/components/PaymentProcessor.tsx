import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  XCircle, 
  Receipt, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  Loader2, 
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { CouponValidator } from './CouponValidator';
import { DepositManager } from './DepositManager';

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

type PaymentMethodType = 'cash' | 'credit' | 'transfer';

type PaymentProcessorProps = {
  order: Order | null;
  registerId: string;
  onClose: () => void;
  onPaymentProcessed: () => void;
};

export function PaymentProcessor({ order, registerId, onClose, onPaymentProcessed }: PaymentProcessorProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Verificar que order exista antes de acceder a sus propiedades
  // Para pedidos anticipados con estado 'pending', permitimos cambiar el monto de la seña
  const [depositAmount, setDepositAmount] = useState<number>(() => {
    if (!order) return 0;
    return order.is_preorder && order.status === 'pending' ? order.deposit_amount : 0;
  });
  
  // También verificar que order exista antes de acceder a payment_method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>(() => {
    if (!order) return 'cash';
    return (order.payment_method as PaymentMethodType) || 'cash';
  });

  // Limpiar el descuento si el método de pago cambia a uno que no permite descuentos
  useEffect(() => {
    if (selectedPaymentMethod !== 'cash' && discountPercent > 0) {
      setDiscountPercent(0);
    }
  }, [selectedPaymentMethod]);

  // Verify that order exists before accessing properties
  // Determine the base amount to be paid based on order status and custom deposit
  const baseAmount = order ? (
    order.is_preorder ? 
      order.status === 'pending' ? depositAmount : order.remaining_amount 
      : order.total_amount
  ) : 0;
  
  // Calculate final amount after discount
  const discountAmount = (baseAmount * discountPercent) / 100;
  const finalAmount = baseAmount - discountAmount;

  const handleDiscountApplied = (percentage: number) => {
    setDiscountPercent(percentage);
  };

  const processPayment = async () => {
    if (!user || !order) return;
    setError(null);
    setLoading(true);

    // Log de depuración para verificar valores iniciales
    console.log("Iniciando proceso de pago con valores:", {
      baseAmount,
      discountPercent,
      discountAmount,
      finalAmount,
      depositAmount,
      isPreorder: order.is_preorder,
      orderStatus: order.status,
      paymentMethod: selectedPaymentMethod
    });

    try {
      // Verificar que si hay descuento, el método de pago sea efectivo
      if (discountPercent > 0 && selectedPaymentMethod !== 'cash') {
        throw new Error('Los descuentos solo aplican a pagos en efectivo');
      }

      // Si es un pedido anticipado y estamos cobrando la seña con un monto personalizado,
      // necesitamos actualizar el registro de la orden con los nuevos montos
      if (order.is_preorder && order.status === 'pending' && depositAmount > 0) {
        const newRemaining = order.total_amount - depositAmount;
        
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            deposit_amount: depositAmount,
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
          amount: finalAmount,
          payment_method: selectedPaymentMethod,
          is_deposit: order.is_preorder && order.status === 'pending',
          discount_percentage: discountPercent > 0 ? discountPercent : null,
          discount_amount: discountAmount > 0 ? discountAmount : null
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // If there's a discount and it's from a coupon, create coupon usage record
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
      
      // Si hay descuento, actualizar el monto total de la orden
      let updateOrderData: Record<string, any> = {
        status: newStatus,
        cashier_id: user.id,
        payment_method: selectedPaymentMethod,
        last_payment_date: new Date().toISOString()
      };
      
      // Si es un pago final con descuento, actualizar el monto total
      if (discountPercent > 0 && (newStatus === 'paid' || (order.is_preorder && order.status === 'pending'))) {
        if (order.is_preorder && order.status === 'pending') {
          // Si es un pago de seña con descuento
          updateOrderData.deposit_amount = finalAmount;
          updateOrderData.remaining_amount = order.total_amount - finalAmount;
        } else if (newStatus === 'paid') {
          // Si es un pago final con descuento
          updateOrderData.total_amount = order.is_preorder ? 
            order.deposit_amount + finalAmount : 
            finalAmount;
        }
      }
        
      const { error: orderError } = await supabase
        .from('orders')
        .update(updateOrderData)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Obtener los valores actuales del registro
      const { data: registerData, error: fetchError } = await supabase
        .from('cash_registers')
        .select('cash_sales, card_sales, transfer_sales, deposits_received')
        .eq('id', registerId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Crear una transacción para actualizar tanto la orden como la caja registradora
      // Calcular los nuevos valores
      let updateObject: Record<string, any> = {};
      
      // Asegurarnos de usar valores iniciales correctos
      const currentCashSales = registerData.cash_sales || 0;
      const currentCardSales = registerData.card_sales || 0;
      const currentTransferSales = registerData.transfer_sales || 0;
      const currentDeposits = registerData.deposits_received || 0;
      
      // Actualizar según el método de pago
      if (selectedPaymentMethod === 'cash') {
        updateObject.cash_sales = currentCashSales + finalAmount;
      } else if (selectedPaymentMethod === 'credit') {
        updateObject.card_sales = currentCardSales + finalAmount;
      } else if (selectedPaymentMethod === 'transfer') {
        updateObject.transfer_sales = currentTransferSales + finalAmount;
      }
      
      // Si es un pago de seña, actualizar el registro de señas
      if (order.is_preorder && order.status === 'pending') {
        updateObject.deposits_received = currentDeposits + finalAmount;
      }
      
      console.log("Actualizando caja registradora:", {
        original: registerData,
        nuevos: updateObject,
        finalAmount
      });
      
      // Actualizar el registro
      const { error: registerError } = await supabase
        .from('cash_registers')
        .update(updateObject)
        .eq('id', registerId);
        
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

      onPaymentProcessed();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError('Error al procesar el pago: ' + error.message);
      setLoading(false);
    }
  };

  // Verify that order exists before proceeding
  if (!order) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">Error al cargar el pedido</h3>
            <p className="text-gray-500 mb-4">No se pudo cargar la información del pedido.</p>
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
                    <DepositManager 
                      order={order} 
                      onChange={(amount) => setDepositAmount(amount)} 
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      Seña pagada: ${order.deposit_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Restante: ${order.remaining_amount.toFixed(2)}
                    </p>
                    <p className="text-sm font-medium text-green-700">
                      Cobrando saldo restante
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-gray-200">
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
        </div>

        {/* Only show coupon section for regular orders or when paying the remaining balance */}
        {(!order.is_preorder || order.status !== 'pending') && (
          <div className="p-4 border-b border-gray-200">
            <CouponValidator 
              orderTotal={baseAmount}
              isPreorder={order.is_preorder}
              onDiscountApplied={handleDiscountApplied}
              selectedPaymentMethod={selectedPaymentMethod}
            />

            {discountPercent > 0 && (
              <div className="mt-3 text-sm text-gray-500 bg-green-50 p-3 rounded-md">
                <p className="text-green-700 font-medium">Descuento aplicado: {discountPercent}%</p>
                <p>Descuento: -${discountAmount.toFixed(2)}</p>
                <p className="font-medium">Final: ${finalAmount.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="mt-4 p-4 bg-gray-50 rounded-md text-center">
            <p className="text-sm text-gray-500">Total a pagar</p>
            <p className="text-xl font-bold text-gray-900">${finalAmount.toFixed(2)}</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
              {error}
            </div>
          )}

          <button
            onClick={processPayment}
            disabled={loading || (order.is_preorder && order.status === 'pending' && depositAmount <= 0)}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Procesar Pago
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}