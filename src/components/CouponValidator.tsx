import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Percent, AlertCircle } from 'lucide-react';

type PaymentMethodType = 'cash' | 'credit' | 'transfer';

type CouponValidatorProps = {
  orderTotal: number;
  isPreorder: boolean;
  onDiscountApplied: (discountPercentage: number) => void;
  selectedPaymentMethod: PaymentMethodType;
};

export function CouponValidator({ 
  orderTotal, 
  isPreorder, 
  onDiscountApplied, 
  selectedPaymentMethod 
}: CouponValidatorProps) {
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_percentage: number;
  } | null>(null);

  // Efecto para limpiar el cupón cuando el método de pago cambia a uno no válido
  useEffect(() => {
    if (appliedCoupon && selectedPaymentMethod !== 'cash') {
      setCouponError("Los descuentos solo aplican a pagos en efectivo");
      setAppliedCoupon(null);
      onDiscountApplied(0);
    }
  }, [selectedPaymentMethod, appliedCoupon, onDiscountApplied]);

  const validateCoupon = async (code: string) => {
    // Verificar que el método de pago sea efectivo
    if (selectedPaymentMethod !== 'cash') {
      setCouponError("Los descuentos solo aplican a pagos en efectivo");
      return;
    }

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
      
      // Check if the coupon has minimum amount requirements
      if (data.min_order_amount && orderTotal < data.min_order_amount) {
        throw new Error(`Este cupón requiere un monto mínimo de $${data.min_order_amount.toFixed(2)}`);
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
      
      // Check if the coupon is within its valid date range
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        throw new Error('Este cupón aún no es válido');
      }
      
      if (data.valid_until && new Date(data.valid_until) < now) {
        throw new Error('Este cupón ha expirado');
      }
      
      // Apply the discount
      setAppliedCoupon({
        code: data.code,
        discount_percentage: data.discount_percentage
      });
      
      onDiscountApplied(data.discount_percentage);
      
    } catch (error: any) {
      setCouponError(error.message);
      setAppliedCoupon(null);
      onDiscountApplied(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const clearCoupon = () => {
    setCouponCode('');
    setCouponError(null);
    setAppliedCoupon(null);
    onDiscountApplied(0);
  };

  // Si el método de pago no es efectivo, mostrar un mensaje de advertencia
  if (selectedPaymentMethod !== 'cash') {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-amber-50 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-700 font-medium">Cupones solo disponibles para pagos en efectivo</p>
            <p className="text-sm text-amber-600">Cambie el método de pago a efectivo para aplicar descuentos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          Cupón de Descuento
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Ingrese código"
            className="flex-1 rounded-md border-gray-300 shadow-md focus:border-indigo-500 focus:ring-indigo-500 text-base"
            disabled={!!appliedCoupon}
          />
          {!appliedCoupon ? (
            <button
              type="button"
              onClick={() => validateCoupon(couponCode)}
              disabled={couponLoading || !couponCode.trim()}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearCoupon}
              className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Quitar
            </button>
          )}
        </div>
        {couponError && (
          <p className="mt-1 text-sm text-red-600">{couponError}</p>
        )}
      </div>

      {appliedCoupon && (
        <div className="text-sm bg-green-50 p-3 rounded-md">
          <p className="text-green-700 font-medium flex items-center">
            <Percent className="h-4 w-4 mr-1" />
            Cupón <span className="mx-1 font-bold">{appliedCoupon.code}</span> aplicado
          </p>
          <p className="text-green-600">
            Descuento: {appliedCoupon.discount_percentage}%
          </p>
        </div>
      )}
    </div>
  );
}