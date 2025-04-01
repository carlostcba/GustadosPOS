import React, { useState } from 'react';
import { AlertTriangle, DollarSign } from 'lucide-react';

type DepositManagerProps = {
  order: {
    id: string;
    total_amount: number;
    deposit_amount: number;
    remaining_amount: number;
    status: string;
  };
  onChange: (depositAmount: number) => void;
};

export function DepositManager({ order, onChange }: DepositManagerProps) {
  const [depositAmount, setDepositAmount] = useState<number>(order.deposit_amount || 0);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Ensure deposit is at least 10% of total
  const minDepositAmount = Math.max(order.total_amount * 0.1, 10); // Mínimo 10% o $10
  
  // Calculate remaining amount after deposit
  const remainingAmount = order.total_amount - depositAmount;
  
  // Check if deposit is reasonable compared to total
  const depositPercentage = (depositAmount / order.total_amount) * 100;

  // Process preset percentage selections
  const applyPercentage = (percentage: number) => {
    const newAmount = order.total_amount * (percentage / 100);
    setDepositAmount(newAmount);
    onChange(newAmount);
    
    // Clear any previous error
    setError(null);
    setSuggestion(null);
  };

  // Handle manual input
  const handleInputChange = (value: string) => {
    const parsed = parseFloat(value);
    
    // Validate input
    if (isNaN(parsed)) {
      setDepositAmount(0);
      onChange(0);
      return;
    }
    
    setDepositAmount(parsed);
    onChange(parsed);
    
    // Validate amount
    if (parsed < minDepositAmount) {
      setError(`La seña debe ser al menos $${minDepositAmount.toFixed(2)} (10% del total)`);
    } else if (parsed > order.total_amount) {
      setError(`La seña no puede superar el monto total de $${order.total_amount.toFixed(2)}`);
      setSuggestion("¿Quizás desea cobrar el total en vez de tomar una seña?");
    } else {
      setError(null);
      setSuggestion(null);
      
      // Provide helpful feedback on deposit amount
      if (depositPercentage < 30) {
        setSuggestion("Sugerencia: La seña es menor al 30% recomendado");
      } else if (depositPercentage > 70) {
        setSuggestion("La seña es mayor al 70% del total");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-green-700 mb-1">
          Monto de Seña a Cobrar
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            min="0"
            max={order.total_amount}
            step="0.01"
            value={depositAmount}
            onChange={(e) => handleInputChange(e.target.value)}
            className={`block w-full pl-10 pr-12 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 ${
              error ? 'border-red-300' : depositPercentage >= 30 && depositPercentage <= 70 ? 'border-green-300' : ''
            }`}
          />
          
          {/* Show percentage indicator */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={`inline-block px-2 py-1 text-xs rounded ${
              depositPercentage < 30 ? 'bg-yellow-100 text-yellow-800' : 
              depositPercentage > 70 ? 'bg-purple-100 text-purple-800' : 
              'bg-green-100 text-green-800'
            }`}>
              {depositPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
        
        {suggestion && !error && (
          <p className="mt-1 text-sm text-amber-600">
            {suggestion}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <button 
          type="button"
          onClick={() => applyPercentage(30)}
          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium hover:bg-green-200"
        >
          30%
        </button>
        <button 
          type="button"
          onClick={() => applyPercentage(50)}
          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium hover:bg-green-200"
        >
          50%
        </button>
        <button 
          type="button"
          onClick={() => applyPercentage(70)}
          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium hover:bg-green-200"
        >
          70%
        </button>
        <button 
          type="button"
          onClick={() => applyPercentage(100)}
          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200"
        >
          100% (Pago Total)
        </button>
      </div>

      <div className="flex justify-between text-sm text-gray-500 pt-2">
        <span>Total: ${order.total_amount.toFixed(2)}</span>
        <span>Restante: ${remainingAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}