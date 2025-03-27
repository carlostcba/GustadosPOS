import React from 'react';
import { Printer, Download } from 'lucide-react';

type CashRegisterReportProps = {
  register: {
    id: string;
    opening_amount: number;
    closing_amount: number;
    cash_sales: number;
    card_sales: number;
    transfer_sales: number;
    deposits_received: number;
    started_at: string;
    closed_at: string | null;
  };
  onClose: () => void;
};

export function CashRegisterReport({ register, onClose }: CashRegisterReportProps) {
  const expectedCash = register.opening_amount + register.cash_sales;
  const difference = register.closing_amount - expectedCash;
  const totalSales = register.cash_sales + register.card_sales + register.transfer_sales;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const reportText = `
REPORTE DE CIERRE DE CAJA
========================

Fecha de Apertura: ${new Date(register.started_at).toLocaleString()}
Fecha de Cierre: ${register.closed_at ? new Date(register.closed_at).toLocaleString() : 'N/A'}

RESUMEN DE OPERACIONES
---------------------
Monto Inicial: $${register.opening_amount.toFixed(2)}

Ventas en Efectivo: $${register.cash_sales.toFixed(2)}
Ventas con Tarjeta: $${register.card_sales.toFixed(2)}
Ventas por Transferencia: $${register.transfer_sales.toFixed(2)}
Señas Recibidas: $${register.deposits_received.toFixed(2)}

Total de Ventas: $${totalSales.toFixed(2)}

CIERRE DE CAJA
-------------
Efectivo Esperado: $${expectedCash.toFixed(2)}
Efectivo en Caja: $${register.closing_amount.toFixed(2)}
Diferencia: $${difference.toFixed(2)}

Observaciones:
${difference === 0 ? 'El cierre coincide con lo esperado' : 
  difference > 0 ? `Sobrante de $${difference.toFixed(2)}` : 
  `Faltante de $${Math.abs(difference).toFixed(2)}`}
`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-caja-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Cierre de Caja</h2>
            <p className="mt-1 text-sm text-gray-500">
              {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-t border-b border-gray-200 py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Información General</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Apertura:</div>
                <div className="text-right">{new Date(register.started_at).toLocaleString()}</div>
                <div className="text-gray-500">Cierre:</div>
                <div className="text-right">
                  {register.closed_at ? new Date(register.closed_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen de Operaciones</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Monto Inicial:</div>
                <div className="text-right">${register.opening_amount.toFixed(2)}</div>
                <div className="text-gray-500">Ventas en Efectivo:</div>
                <div className="text-right">${register.cash_sales.toFixed(2)}</div>
                <div className="text-gray-500">Ventas con Tarjeta:</div>
                <div className="text-right">${register.card_sales.toFixed(2)}</div>
                <div className="text-gray-500">Ventas por Transferencia:</div>
                <div className="text-right">${register.transfer_sales.toFixed(2)}</div>
                <div className="text-gray-500">Señas Recibidas:</div>
                <div className="text-right">${register.deposits_received.toFixed(2)}</div>
                <div className="font-medium text-gray-900 pt-2 border-t">Total de Ventas:</div>
                <div className="text-right font-medium text-gray-900 pt-2 border-t">
                  ${totalSales.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Cierre de Caja</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Efectivo Esperado:</div>
                <div className="text-right">${expectedCash.toFixed(2)}</div>
                <div className="text-gray-500">Efectivo en Caja:</div>
                <div className="text-right">${register.closing_amount.toFixed(2)}</div>
                <div className="font-medium text-gray-900 pt-2 border-t">Diferencia:</div>
                <div className={`text-right font-medium pt-2 border-t ${
                  difference === 0 ? 'text-gray-900' :
                  difference > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${difference.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Observaciones</h3>
              <p className="text-sm text-gray-600">
                {difference === 0 ? 'El cierre coincide con lo esperado' :
                 difference > 0 ? `Sobrante de $${difference.toFixed(2)}` :
                 `Faltante de $${Math.abs(difference).toFixed(2)}`}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}