import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, ChevronDown, ChevronUp, Search, Download, Printer, Eye } from 'lucide-react';
import { CashRegisterReport } from './CashRegisterReport';
import { EnhancedCashRegisterReport } from './EnhancedCashRegisterReport';

type CashRegister = {
  id: string;
  opening_amount: number;
  closing_amount: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  deposits_received: number;
  started_at: string;
  closed_at: string;
  expenses_total: number;
  cashier: {
    id: string;
    full_name: string;
  };
};

export function CashRegisterHistory() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<keyof CashRegister>('closed_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchCashRegisters();
  }, []);

  async function fetchCashRegisters() {
    try {
      setLoading(true);
      setError(null);

      // Usando Join para obtener el nombre del cajero
      const { data, error } = await supabase
        .from('cash_registers')
        .select(`
          *,
          cashier:cashier_id(
            id,
            full_name
          )
        `)
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false });

      if (error) throw error;
      setRegisters(data || []);
    } catch (error: any) {
      console.error('Error fetching cash registers:', error);
      setError('Error al cargar el historial de cajas: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  // Filtrar registros según los criterios de búsqueda
  const filteredRegisters = registers.filter(register => {
    const cashierName = register.cashier?.full_name?.toLowerCase() || '';
    const registerDate = new Date(register.closed_at).toLocaleDateString();
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery || 
      cashierName.includes(searchLower) || 
      registerDate.includes(searchLower);

    // Filtrar por rango de fechas si están establecidas
    const closedDate = new Date(register.closed_at);
    const matchesStartDate = !startDate || closedDate >= new Date(startDate);
    const endDateObj = endDate ? new Date(endDate) : null;
    if (endDateObj) endDateObj.setHours(23, 59, 59); // Establecer al final del día
    const matchesEndDate = !endDate || closedDate <= (endDateObj || new Date());

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Ordenar registros
  const sortedRegisters = [...filteredRegisters].sort((a, b) => {
    let fieldA: any = a[sortField];
    let fieldB: any = b[sortField];

    // Manejar casos especiales
    if (sortField === 'cashier') {
      fieldA = a.cashier?.full_name || '';
      fieldB = b.cashier?.full_name || '';
    }

    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortDirection === 'asc' 
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    }

    return sortDirection === 'asc' 
      ? (fieldA > fieldB ? 1 : -1)
      : (fieldA < fieldB ? 1 : -1);
  });

  const handleSort = (field: keyof CashRegister) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const calculateTotal = (field: 'cash_sales' | 'card_sales' | 'transfer_sales' | 'expenses_total' | 'deposits_received') => {
    return filteredRegisters.reduce((sum, register) => sum + (register[field] || 0), 0);
  };

  const calculateBalance = (register: CashRegister) => {
    return register.closing_amount - (register.opening_amount + register.cash_sales - register.expenses_total);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleExportCSV = () => {
    const headers = [
      'ID', 
      'Fecha Apertura', 
      'Fecha Cierre', 
      'Cajero', 
      'Monto Inicial', 
      'Ventas Efectivo', 
      'Ventas Tarjeta', 
      'Ventas Transferencia', 
      'Ventas Totales', 
      'Señas', 
      'Gastos', 
      'Saldo Final', 
      'Diferencia'
    ];

    const rows = filteredRegisters.map(register => [
      register.id,
      formatDateTime(register.started_at),
      formatDateTime(register.closed_at),
      register.cashier?.full_name || '',
      register.opening_amount.toFixed(2),
      register.cash_sales.toFixed(2),
      register.card_sales.toFixed(2),
      register.transfer_sales.toFixed(2),
      (register.cash_sales + register.card_sales + register.transfer_sales).toFixed(2),
      register.deposits_received.toFixed(2),
      register.expenses_total.toFixed(2),
      register.closing_amount.toFixed(2),
      calculateBalance(register).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cierres-caja-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando historial de cajas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Cierres de Caja</h1>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </button>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cajero o fecha..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="font-medium text-indigo-700 mb-2">Resumen del Período</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-500">Ventas en Efectivo</div>
              <div className="text-lg font-medium">${calculateTotal('cash_sales').toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ventas con Tarjeta</div>
              <div className="text-lg font-medium">${calculateTotal('card_sales').toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ventas por Transferencia</div>
              <div className="text-lg font-medium">${calculateTotal('transfer_sales').toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Señas Recibidas</div>
              <div className="text-lg font-medium">${calculateTotal('deposits_received').toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Gastos Totales</div>
              <div className="text-lg font-medium text-red-600">-${calculateTotal('expenses_total').toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('closed_at')}
                >
                  <div className="flex items-center">
                    Fecha
                    {sortField === 'closed_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('cashier')}
                >
                  <div className="flex items-center">
                    Cajero
                    {sortField === 'cashier' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('opening_amount')}
                >
                  <div className="flex items-center justify-end">
                    Monto Inicial
                    {sortField === 'opening_amount' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('cash_sales')}
                >
                  <div className="flex items-center justify-end">
                    Efectivo
                    {sortField === 'cash_sales' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('card_sales')}
                >
                  <div className="flex items-center justify-end">
                    Tarjeta
                    {sortField === 'card_sales' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('transfer_sales')}
                >
                  <div className="flex items-center justify-end">
                    Transferencia
                    {sortField === 'transfer_sales' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('closing_amount')}
                >
                  <div className="flex items-center justify-end">
                    Cierre
                    {sortField === 'closing_amount' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diferencia
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRegisters.map((register) => {
                const balance = calculateBalance(register);
                return (
                  <tr key={register.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(register.closed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {register.cashier?.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${register.opening_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${register.cash_sales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${register.card_sales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${register.transfer_sales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${register.closing_amount.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      balance === 0 ? 'text-gray-900' : 
                      balance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedRegister(register);
                          setShowReport(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedRegisters.length === 0 && (
          <div className="py-6 px-4 text-center text-gray-500">
            No hay registros que coincidan con los criterios de búsqueda.
          </div>
        )}
      </div>

      {showReport && selectedRegister && (
  <EnhancedCashRegisterReport
    register={{
      ...selectedRegister,
      closing_amount: selectedRegister.closing_amount
    }}
    onClose={() => {
      setShowReport(false);
      setSelectedRegister(null);
    }}
  />
)}
    </div>
  );
}