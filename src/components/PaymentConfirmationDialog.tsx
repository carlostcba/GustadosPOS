import React from 'react';
import { AlertTriangle, Banknote, CreditCard, ArrowRight, X, Check } from 'lucide-react';

type PaymentMethodType = 'cash' | 'credit' | 'transfer';

type PaymentConfirmationDialogProps = {
  paymentMethod: PaymentMethodType;
  finalAmount: number;
  discountPercent: number;
  discountAmount: number;
  originalAmount: number;
  isPreorder: boolean;
  paymentType: 'full' | 'deposit' | 'remaining';
  onConfirm: () => void;
  onCancel: () => void;
};

export function PaymentConfirmationDialog({
  paymentMethod,
  finalAmount,
  discountPercent,
  discountAmount,
  originalAmount,
  isPreorder,
  paymentType,
  onConfirm,
  onCancel
}: PaymentConfirmationDialogProps) {
  
  // Función para obtener el ícono del método de pago
  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case 'cash':
        return <Banknote className="h-5 w-5 text-green-600" />;
      case 'credit':
        return <CreditCard className="h-5 w-5 text-blue-600" />;
      case 'transfer':
        return <ArrowRight className="h-5 w-5 text-purple-600" />;
      default:
        return null;
    }
  };

  // Función para obtener el texto del método de pago
  const getPaymentMethodText = () => {
    switch (paymentMethod) {
      case 'cash':
        return 'Efectivo';
      case 'credit':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return 'Desconocido';
    }
  };

  // Función para obtener el texto del tipo de pago
  const getPaymentTypeText = () => {
    switch (paymentType) {
      case 'full':
        return 'Pago completo';
      case 'deposit':
        return 'Pago de seña';
      case 'remaining':
        return 'Pago de saldo restante';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 bg-amber-100 rounded-full p-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">Confirmar pago</h3>
            <p className="mt-1 text-sm text-gray-500">
              Estás a punto de procesar un pago. Una vez confirmado, no habrá posibilidad de reembolso.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Resumen de la transacción</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tipo de operación:</span>
              <span className="text-sm font-medium">{getPaymentTypeText()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Método de pago:</span>
              <span className="flex items-center text-sm font-medium">
                {getPaymentMethodIcon()}
                <span className="ml-1">{getPaymentMethodText()}</span>
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monto original:</span>
              <span className="text-sm font-medium">${originalAmount.toFixed(2)}</span>
            </div>
            
            {discountPercent > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Descuento ({discountPercent}%):</span>
                  <span className="text-sm font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                </div>
                
                <div className="h-px bg-gray-200 my-2"></div>
              </>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Monto total a pagar:</span>
              <span className="text-base font-bold text-gray-900">${finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
          <p className="font-medium">Importante:</p>
          <p>Por favor, asegúrate de haber aplicado todos los cupones necesarios y de haber seleccionado el método de pago correcto.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}