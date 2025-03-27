import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Employee, Supplier } from '../lib/types';

type ExpenseFormProps = {
  registerId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ExpenseForm({ registerId, onClose, onSuccess }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'supplier_payment' | 'employee_advance'>('supplier_payment');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    fetchEmployeesAndSuppliers();
  }, []);

  async function fetchEmployeesAndSuppliers() {
    try {
      const [employeesResult, suppliersResult] = await Promise.all([
        supabase
          .from('employees')
          .select('*')
          .eq('active', true)
          .order('name'),
        supabase
          .from('suppliers')
          .select('*')
          .eq('active', true)
          .order('name')
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (suppliersResult.error) throw suppliersResult.error;

      setEmployees(employeesResult.data || []);
      setSuppliers(suppliersResult.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Error al cargar los datos: ' + (error.message || 'Error desconocido'));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || (type === 'employee_advance' && !selectedEmployeeId) || (type === 'supplier_payment' && !selectedSupplierId)) {
      setError('Por favor complete todos los campos');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: expenseError } = await supabase
        .from('cash_register_expenses')
        .insert({
          register_id: registerId,
          amount: numAmount,
          type,
          description,
          employee_id: type === 'employee_advance' ? selectedEmployeeId : null,
          supplier_id: type === 'supplier_payment' ? selectedSupplierId : null
        });

      if (expenseError) throw expenseError;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating expense:', error);
      setError('Error al registrar el egreso: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Registrar Egreso
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Egreso
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'supplier_payment' | 'employee_advance');
                setSelectedEmployeeId('');
                setSelectedSupplierId('');
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="supplier_payment">Pago a Proveedor</option>
              <option value="employee_advance">Adelanto a Empleado</option>
            </select>
          </div>

          {type === 'supplier_payment' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Proveedor
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'employee_advance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Empleado
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Seleccionar empleado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.position}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Monto
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Detalle del egreso..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}