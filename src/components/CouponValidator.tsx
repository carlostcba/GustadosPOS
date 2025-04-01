import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Percent, AlertCircle, Tag, X } from 'lucide-react';

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

  // Manejador para la tecla Enter en el campo de texto
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevenir el comportamiento por defecto
      if (couponCode.trim() && !couponLoading && !appliedCoupon) {
        validateCoupon(couponCode);
      }
    }
  };

  // Si el método de pago no es efectivo, mostrar un mensaje de advertencia
  if (selectedPaymentMethod !== 'cash') {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
          <Tag className="w-5 h-5 mr-2 text-indigo-600" />
          Cupón de Descuento
        </label>
        
        {appliedCoupon ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex justify-between items-center">
            <div>
              <span className="font-medium text-green-800">{appliedCoupon.code}</span>
              <span className="ml-2 text-green-600">({appliedCoupon.discount_percentage}% descuento)</span>
            </div>
            <button
              onClick={clearCoupon}
              className="text-green-700 hover:text-green-800"
              aria-label="Quitar cupón"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex space-x-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ingrese código de descuento"
                className="flex-1 rounded-md border-2 border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-12 px-4"
              />
              <button
                type="button"
                onClick={() => validateCoupon(couponCode)}
                disabled={couponLoading || !couponCode.trim()}
                className="px-5 py-2 rounded-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
              >
                {couponLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Validar'}
              </button>
            </div>
            
            {couponError && (
              <p className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
                {couponError}
              </p>
            )}
            
            <p className="mt-2 text-xs text-gray-500">
              Ingrese un código de cupón válido
            </p>
          </>
        )}
      </div>

      {appliedCoupon && (
        <div className="text-sm bg-green-50 border border-green-200 p-3 rounded-md">
          <p className="text-green-700 font-medium flex items-center">
            <Percent className="h-4 w-4 mr-1" />
            Descuento del {appliedCoupon.discount_percentage}% aplicado
          </p>
          <p className="text-green-600 mt-1">
            Ahorro: ${((orderTotal * appliedCoupon.discount_percentage) / 100).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}