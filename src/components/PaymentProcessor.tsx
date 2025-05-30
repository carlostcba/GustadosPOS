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
import { PaymentConfirmationDialog } from './PaymentConfirmationDialog';

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
  discount_total?: number; // opcional para tener guardado el descuento aplicado a la seña (si se paga previamente)
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
  const [cashPaidBefore, setCashPaidBefore] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [couponResetKey, setCouponResetKey] = useState(0); // para resetear cupón al cambiar el método de pago
  
  // Para pedidos anticipados en estado 'pending' se permite cambiar el monto de la seña
  const [depositAmount, setDepositAmount] = useState<number>(() => {
    if (!order) return 0;
    return order.is_preorder && order.status === 'pending' ? order.deposit_amount : 0;
  });
  
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

  useEffect(() => {
    const fetchPreviousCashPayments = async () => {
      if (!order?.id) return;
  
      const { data, error } = await supabase
        .from('payments')
        .select('pay_cash')
        .eq('order_id', order.id);
  
      if (!error && data) {
        const totalCash = data.reduce((sum, p) => sum + (p.pay_cash || 0), 0);
        setCashPaidBefore(totalCash);
      }
    };
  
    fetchPreviousCashPayments();
  }, [order?.id]);
  
  // Detectar tipo de operación
  const isPayingDeposit = order?.is_preorder && order.status === 'pending';
  const isPayingRemaining = order?.is_preorder && order.status !== 'pending';

  // Calcular el monto base actual
  const baseAmount = order ? (
    isPayingDeposit
      ? depositAmount
      : isPayingRemaining
        ? order.remaining_amount
        : order.total_amount
  ) : 0;

  // Calcular el monto sobre el cual aplicar el descuento según el escenario
  let discountableAmount = 0;

  if (isPayingRemaining) {
    if (cashPaidBefore > 0 && selectedPaymentMethod !== 'cash') {
      // Seña fue en efectivo, saldo ahora con tarjeta => aplicar sobre la seña
      discountableAmount = cashPaidBefore;
    } else if (selectedPaymentMethod === 'cash') {
      // Saldo ahora en efectivo => aplicar sobre todo el efectivo (anterior + actual)
      discountableAmount = cashPaidBefore + (order!.remaining_amount || 0);
    }
  } else if (isPayingDeposit && selectedPaymentMethod === 'cash') {
    // Seña en efectivo
    discountableAmount = depositAmount;
  } else if (!order?.is_preorder && selectedPaymentMethod === 'cash') {
    // Pedido común en efectivo
    discountableAmount = order!.total_amount;
  }

  const discountAmount = (discountableAmount * discountPercent) / 100;
  const totalWithDiscount = order!.total_amount - discountAmount;
  const finalAmount = isPayingDeposit
    ? Math.max(0, depositAmount - discountAmount)
    : isPayingRemaining
      ? Math.max(0, order!.remaining_amount - discountAmount)
      : Math.max(0, order!.total_amount - discountAmount);

  // Determinar el tipo de pago para mostrar en la confirmación
  const getPaymentType = (): 'full' | 'deposit' | 'remaining' => {
    if (!order) return 'full';
    if (order.is_preorder) {
      return order.status === 'pending' ? 'deposit' : 'remaining';
    }
    return 'full';
  };

  const handleDiscountApplied = (percentage: number) => {
    setDiscountPercent(percentage);
  };

  const handlePaymentRequest = () => {
    setShowConfirmation(true);
  };

  const processPayment = async () => {
    if (!user || !order) return;
    setError(null);
    setLoading(true);
    setShowConfirmation(false);

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
      if (discountPercent > 0 && selectedPaymentMethod !== 'cash' && cashPaidBefore === 0) {
        throw new Error('Los descuentos solo aplican a pagos en efectivo');
      }

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
      
      const isDeposit = order.is_preorder && order.status === 'pending';
      const payCash = selectedPaymentMethod === 'cash' ? finalAmount : 0;
      const payNonCash = selectedPaymentMethod !== 'cash' ? finalAmount : 0;

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: finalAmount,
          payment_method: selectedPaymentMethod,
          is_deposit: isDeposit,
          discount_percentage: discountPercent > 0 ? discountPercent : null,
          discount_amount: discountAmount > 0 ? discountAmount : null,
          pay_cash: payCash,
          pay_non_cash: payNonCash
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      if (discountPercent > 0) {
        const { data: coupons, error: couponsError } = await supabase
          .from('coupons')
          .select('id')
          .eq('discount_percentage', discountPercent)
          .limit(1);
          
        if (!couponsError && coupons && coupons.length > 0) {
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

      const newStatus = order.is_preorder ? 
        order.status === 'pending' ? 'processing' : 'paid' : 'paid';
      
      let updateOrderData: Record<string, any> = {
        status: newStatus,
        cashier_id: user.id,
        payment_method: selectedPaymentMethod,
        last_payment_date: new Date().toISOString()
      };

      if (discountPercent > 0) {
        updateOrderData.discount_percentage = discountPercent;
        updateOrderData.discount_total = discountAmount;
        updateOrderData.total_amount_with_discount = order.total_amount - discountAmount;
      }

      if (order.is_preorder && order.status === 'pending' && depositAmount > 0) {
        updateOrderData.deposit_amount = depositAmount;
        updateOrderData.remaining_amount = order.total_amount - depositAmount;
      }
       
      const { error: orderError } = await supabase
        .from('orders')
        .update(updateOrderData)
        .eq('id', order.id);

      if (orderError) throw orderError;

      const { data: registerData, error: fetchError } = await supabase
        .from('cash_registers')
        .select('cash_sales, card_sales, transfer_sales, deposits_received')
        .eq('id', registerId)
        .single();
        
      if (fetchError) throw fetchError;
      
      let updateObject: Record<string, any> = {};
      
      const currentCashSales = registerData.cash_sales || 0;
      const currentCardSales = registerData.card_sales || 0;
      const currentTransferSales = registerData.transfer_sales || 0;
      const currentDeposits = registerData.deposits_received || 0;
      
      if (selectedPaymentMethod === 'cash') {
        updateObject.cash_sales = currentCashSales + finalAmount;
      } else if (selectedPaymentMethod === 'credit') {
        updateObject.card_sales = currentCardSales + finalAmount;
      } else if (selectedPaymentMethod === 'transfer') {
        updateObject.transfer_sales = currentTransferSales + finalAmount;
      }
      
      if (order.is_preorder && order.status === 'pending') {
        updateObject.deposits_received = currentDeposits + finalAmount;
      }
      
      console.log("Actualizando caja registradora:", {
        original: registerData,
        nuevos: updateObject,
        finalAmount
      });
      
      const { error: registerError } = await supabase
        .from('cash_registers')
        .update(updateObject)
        .eq('id', registerId);
        
      if (registerError) throw registerError;

      if (newStatus === 'paid') {
        const { error: queueError } = await supabase
          .from('order_queue')
          .insert({
            order_id: order.id,
            priority: order.is_preorder ? 1 : 0,
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
    <>
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
              {discountPercent > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  Total con descuento: ${(order.total_amount - discountAmount).toFixed(2)}
                </p>
              )}
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
                        Seña {order.status === 'pending' ? 'a cobrar' : 'pagada'}: $
                        {(order.status === 'pending'
                          ? depositAmount - discountAmount
                          : order.deposit_amount - (order.discount_total || 0)
                        ).toFixed(2)} (
                        {cashPaidBefore >= (order.status === 'pending'
                          ? depositAmount - discountAmount
                          : order.deposit_amount - (order.discount_total || 0)
                        ) ? 'efectivo' : 'tarjeta'})
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
                  onChange={() => {
                    setSelectedPaymentMethod('cash');
                    setCouponResetKey((prev) => prev + 1);
                  }}
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
                  onChange={() => {
                    setSelectedPaymentMethod('credit');
                    setCouponResetKey((prev) => prev + 1);
                  }}                  
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
                  onChange={() => {
                    setSelectedPaymentMethod('transfer');
                    setCouponResetKey((prev) => prev + 1);
                  }}                  
                  className="sr-only"
                />
                <ArrowRight className="h-5 w-5 text-gray-600 mb-1" />
                <span className="text-sm">Transferencia</span>
              </label>
            </div>
          </div>

          {(!order.is_preorder || order.status !== 'pending' || (order.status === 'pending' && depositAmount === order.total_amount)) && (
            <div className="p-4 border-b border-gray-200">
              <CouponValidator
                orderTotal={baseAmount}
                selectedPaymentMethod={selectedPaymentMethod}
                onDiscountApplied={handleDiscountApplied}
                prepaidCashExists={!!(cashPaidBefore > 0 || (isPayingDeposit && selectedPaymentMethod === 'cash'))}
                discountAmount={discountAmount}
                resetTrigger={couponResetKey}
              />
            </div>
          )}

          <div className="p-4 space-y-4">
            <div className="mt-4 p-4 bg-gray-50 rounded-md text-center">
              <p className="text-sm text-gray-500">Total a pagar</p>
              <p className="text-xl font-bold text-gray-900">${finalAmount.toFixed(2)}</p>

              {discountPercent > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  (Incluye descuento del {discountPercent}%: -${discountAmount.toFixed(2)})
                </div>
              )}

              {discountPercent > 0 && selectedPaymentMethod !== 'cash' && (
                <div className="mt-2 text-xs text-yellow-600 italic">
                  El descuento solo aplica para pagos en efectivo.
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                {error}
              </div>
            )}

            <button
              onClick={handlePaymentRequest}
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

      {showConfirmation && (
        <PaymentConfirmationDialog
          paymentMethod={selectedPaymentMethod}
          finalAmount={finalAmount}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          originalAmount={baseAmount}
          isPreorder={order.is_preorder}
          paymentType={getPaymentType()}
          onConfirm={processPayment}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </>
  );
}
