import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Printer, Download, ChevronDown, ChevronUp, Search } from 'lucide-react';

type ProductSale = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_weighable: boolean;
  unit_label: string;
  total_with_discount?: number;
  has_discount?: boolean;
};

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
    expenses_total: number;
    cashier?: {
      id: string;
      full_name: string;
    };
  };
  onClose: () => void;
};

export function EnhancedCashRegisterReport({ register, onClose }: CashRegisterReportProps) {
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof ProductSale>('product_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'summary' | 'products'>('summary');

  const expectedCash = register.opening_amount + register.cash_sales - register.expenses_total;
  const difference = register.closing_amount - expectedCash;
  const totalSales = register.cash_sales + register.card_sales + register.transfer_sales;

  useEffect(() => {
    fetchProductSales();
  }, [register.id]);

  async function fetchProductSales() {
    try {
      setLoading(true);
      setError(null);

      // Find the start time and end time of this register to get all orders in that period
      const startTime = register.started_at;
      const endTime = register.closed_at || new Date().toISOString();

      console.log('Buscando órdenes entre:', startTime, 'y', endTime);

      // MÉTODO 1: Buscar directamente por órden_items usando una ventana de tiempo similar a la caja
      const { data: directItems, error: directError } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price,
          order_id,
          created_at
        `)
        .gte('created_at', startTime)
        .lte('created_at', endTime);
        
      if (!directError && directItems && directItems.length > 0) {
        console.log('Encontrados items directamente por fecha:', directItems.length);
        
        // Obtener los order_ids de los items
        const orderIds = [...new Set(directItems.map(item => item.order_id))];
        
        // Buscar información de órdenes para verificar descuentos
        const { data: ordersInfo, error: ordersInfoError } = await supabase
          .from('orders')
          .select('id, discount_percentage, total_amount, total_amount_with_discount')
          .in('id', orderIds);
          
        if (ordersInfoError) throw ordersInfoError;
        
        // Crear un map de órdenes con información de descuentos
        const ordersMap: Record<string, { 
          discount_percentage?: number, 
          has_discount: boolean,
          discount_ratio?: number // Proporción del descuento (para calcular precio con descuento)
        }> = {};
        
        if (ordersInfo) {
          ordersInfo.forEach(order => {
            const hasDiscount = !!order.discount_percentage || 
                               (order.total_amount_with_discount !== null && 
                                order.total_amount_with_discount < order.total_amount);
            
            // Calcular la proporción del descuento si es posible
            let discountRatio = 1; // Sin descuento por defecto
            if (hasDiscount && order.total_amount_with_discount && order.total_amount) {
              discountRatio = order.total_amount_with_discount / order.total_amount;
            }
            
            ordersMap[order.id] = {
              discount_percentage: order.discount_percentage,
              has_discount: hasDiscount,
              discount_ratio: discountRatio
            };
          });
        }
        
        // Para cada item, buscar información adicional del producto
        const enhancedItems = await Promise.all(
          directItems.map(async (item) => {
            let productInfo = { is_weighable: false, unit_label: 'un' };
            
            if (item.product_id) {
              const { data: product } = await supabase
                .from('products')
                .select('is_weighable, unit_label')
                .eq('id', item.product_id)
                .single();
                
              if (product) {
                productInfo = product;
              }
            }
            
            // Verificar si el pedido tiene descuento
            const orderInfo = ordersMap[item.order_id] || { has_discount: false, discount_ratio: 1 };
            let totalWithDiscount = item.total_price;
            
            if (orderInfo.has_discount && orderInfo.discount_ratio) {
              totalWithDiscount = item.total_price * orderInfo.discount_ratio;
            }
            
            return {
              ...item,
              is_weighable: productInfo.is_weighable,
              unit_label: productInfo.unit_label,
              has_discount: orderInfo.has_discount,
              total_with_discount: totalWithDiscount
            };
          })
        );
        
        setProductSales(enhancedItems);
        setLoading(false);
        return;
      }
        
      // MÉTODO 2: Buscar órdenes pagadas en este período
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, discount_percentage, total_amount, total_amount_with_discount')
        .gte('created_at', startTime)
        .lte('created_at', endTime)
        .eq('status', 'paid');

      if (!ordersError && ordersData && ordersData.length > 0) {
        console.log('Órdenes pagadas encontradas:', ordersData.length);
        
        // Extraer solo los IDs de órdenes para usar en la siguiente consulta
        const orderIds = ordersData.map(order => order.id);
        
        // Crear un mapa para los descuentos
        const orderDiscounts = ordersData.reduce((acc, order) => {
          const hasDiscount = !!order.discount_percentage || 
                             (order.total_amount_with_discount !== null && 
                              order.total_amount_with_discount < order.total_amount);
          
          // Calcular la proporción del descuento si es posible
          let discountRatio = 1; // Sin descuento por defecto
          if (hasDiscount && order.total_amount_with_discount && order.total_amount) {
            discountRatio = order.total_amount_with_discount / order.total_amount;
          }
          
          acc[order.id] = {
            has_discount: hasDiscount,
            discount_ratio: discountRatio
          };
          return acc;
        }, {} as Record<string, { has_discount: boolean, discount_ratio: number }>);
        
        await processOrders(orderIds, orderDiscounts);
        return;
      }
      
      // MÉTODO 3: Último recurso - buscar todas las órdenes en este período sin filtro de estado
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, discount_percentage, total_amount, total_amount_with_discount')
        .gte('created_at', startTime)
        .lte('created_at', endTime);
        
      if (!allOrdersError && allOrdersData && allOrdersData.length > 0) {
        console.log('Todas las órdenes (sin filtro de status):', allOrdersData.length);
        
        // Extraer solo los IDs de órdenes para usar en la siguiente consulta
        const orderIds = allOrdersData.map(order => order.id);
        
        // Crear un mapa para los descuentos
        const orderDiscounts = allOrdersData.reduce((acc, order) => {
          const hasDiscount = !!order.discount_percentage || 
                             (order.total_amount_with_discount !== null && 
                              order.total_amount_with_discount < order.total_amount);
          
          // Calcular la proporción del descuento si es posible
          let discountRatio = 1; // Sin descuento por defecto
          if (hasDiscount && order.total_amount_with_discount && order.total_amount) {
            discountRatio = order.total_amount_with_discount / order.total_amount;
          }
          
          acc[order.id] = {
            has_discount: hasDiscount,
            discount_ratio: discountRatio
          };
          return acc;
        }, {} as Record<string, { has_discount: boolean, discount_ratio: number }>);
        
        await processOrders(orderIds, orderDiscounts);
        return;
      }
      
      // Si llegamos aquí, no encontramos nada
      console.log('No se encontraron órdenes o pagos en este período');
      setProductSales([]);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching product sales:', error);
      setError('Error al cargar las ventas de productos: ' + (error.message || 'Error desconocido'));
      setLoading(false);
    }
  }
  
  async function processOrders(
    orderIds: string[], 
    discountInfo: Record<string, { has_discount: boolean, discount_ratio: number }>
  ) {
    try {
      if (orderIds.length === 0) {
        setProductSales([]);
        setLoading(false);
        return;
      }
      
      console.log('Buscando items para órdenes:', orderIds);
      
      // Obtener items de órdenes
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;
      
      if (!orderItemsData || orderItemsData.length === 0) {
        console.log('No se encontraron items para estas órdenes');
        setProductSales([]);
        setLoading(false);
        return;
      }
      
      console.log('Items encontrados:', orderItemsData.length);
      
      // Obtener información de productos
      const productIds = [...new Set(orderItemsData
        .filter(item => item.product_id)
        .map(item => item.product_id))];
        
      const { data: productsData } = await supabase
        .from('products')
        .select('id, is_weighable, unit_label')
        .in('id', productIds);
        
      // Crear mapa de productos
      const productMap: Record<string, { is_weighable: boolean, unit_label: string }> = {};
      if (productsData) {
        productsData.forEach(product => {
          productMap[product.id] = {
            is_weighable: product.is_weighable || false,
            unit_label: product.unit_label || 'un'
          };
        });
      }
      
      // Transformar datos de items
      const sales = orderItemsData.map(item => {
        const productInfo = item.product_id ? productMap[item.product_id] : null;
        const orderDiscount = discountInfo[item.order_id] || { has_discount: false, discount_ratio: 1 };
        
        // Calcular precio con descuento si aplica
        const totalWithDiscount = orderDiscount.has_discount ? 
                                 item.total_price * orderDiscount.discount_ratio : 
                                 item.total_price;
        
        return {
          id: item.id,
          product_id: item.product_id || '',
          product_name: item.product_name || 'Producto sin nombre',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          is_weighable: productInfo?.is_weighable || false,
          unit_label: productInfo?.unit_label || 'un',
          has_discount: orderDiscount.has_discount,
          total_with_discount: totalWithDiscount
        };
      });

      setProductSales(sales);
      
      if (sales.length === 0) {
        console.log('No se pudieron procesar ventas de productos para este período de caja.');
      } else {
        console.log('Se procesaron', sales.length, 'ventas de productos');
      }
    } catch (error) {
      console.error('Error procesando órdenes:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  // Filter product sales based on search query
  const filteredProductSales = productSales.filter(sale => {
    return !searchQuery || sale.product_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group and aggregate product sales
  const aggregatedSales = filteredProductSales.reduce((acc, sale) => {
    const key = sale.product_id + sale.product_name;
    if (!acc[key]) {
      acc[key] = {
        product_id: sale.product_id,
        product_name: sale.product_name,
        quantity: 0,
        total_price: 0,
        is_weighable: sale.is_weighable,
        unit_label: sale.unit_label,
        has_discount: false,
        total_with_discount: 0
      };
    }
    acc[key].quantity += sale.quantity;
    acc[key].total_price += sale.total_price;
    
    // Acumular totales con descuento
    if (sale.has_discount && sale.total_with_discount !== undefined) {
      acc[key].has_discount = true;
      acc[key].total_with_discount = (acc[key].total_with_discount || 0) + sale.total_with_discount;
    } else {
      // Si este item no tiene descuento, sumar el precio regular al total con descuento
      acc[key].total_with_discount = (acc[key].total_with_discount || 0) + sale.total_price;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Convert to array and sort
  const sortedSales = Object.values(aggregatedSales).sort((a, b) => {
    if (sortField === 'product_name') {
      return sortDirection === 'asc' 
        ? a.product_name.localeCompare(b.product_name)
        : b.product_name.localeCompare(a.product_name);
    } else if (sortField === 'quantity' || sortField === 'total_price') {
      return sortDirection === 'asc' 
        ? a[sortField] - b[sortField]
        : b[sortField] - a[sortField];
    }
    return 0;
  });

  const handleSort = (field: keyof ProductSale) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatQuantity = (sale: any) => {
    if (!sale.is_weighable) {
      return `${sale.quantity} ${sale.unit_label}`;
    }
    return sale.quantity < 1 
      ? `${(sale.quantity * 1000).toFixed(0)}g`
      : `${sale.quantity.toFixed(3)}kg`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Basic register summary
    let reportText = `
REPORTE DE CIERRE DE CAJA
========================

Fecha de Apertura: ${new Date(register.started_at).toLocaleString()}
Fecha de Cierre: ${register.closed_at ? new Date(register.closed_at).toLocaleString() : 'N/A'}
Cajero: ${register.cashier?.full_name || 'N/A'}

RESUMEN DE OPERACIONES
---------------------
Monto Inicial: $${register.opening_amount.toFixed(2)}

Ventas en Efectivo: $${register.cash_sales.toFixed(2)}
Ventas con Tarjeta: $${register.card_sales.toFixed(2)}
Ventas por Transferencia: $${register.transfer_sales.toFixed(2)}
Señas Recibidas: $${register.deposits_received.toFixed(2)}
Egresos: $${register.expenses_total.toFixed(2)}

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

    // Add product sales section
    reportText += `\n\nDETALLE DE PRODUCTOS VENDIDOS
---------------------------\n`;

    if (sortedSales.length === 0) {
      reportText += "No hay ventas de productos registradas en este período.\n";
    } else {
      reportText += `Producto | Cantidad | Total${'\n'}`;
      reportText += `------------------------------------${'\n'}`;
      
      sortedSales.forEach(sale => {
        const quantityStr = formatQuantity(sale);
        const totalStr = sale.has_discount ? 
                       `$${sale.total_with_discount.toFixed(2)} (con desc.)` : 
                       `$${sale.total_price.toFixed(2)}`;
        reportText += `${sale.product_name.padEnd(30)} | ${quantityStr.padEnd(10)} | ${totalStr}\n`;
      });
    }

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

  // Calcular totales para la tabla
  //const totalQuantity = sortedSales.reduce((acc, sale) => acc + sale.quantity, 0);
  const totalAmount = sortedSales.reduce((acc, sale) => {
    return acc + (sale.has_discount ? sale.total_with_discount : sale.total_price);
  }, 0);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Cierre de Caja</h2>
            <p className="mt-1 text-sm text-gray-500">
              {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
            </p>
            {register.cashier && (
              <p className="text-sm font-medium text-gray-700">
                Cajero: {register.cashier.full_name}
              </p>
            )}
          </div>

          <div className="flex justify-center space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'summary'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'products'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Productos Vendidos
            </button>
          </div>

          {activeTab === 'summary' && (
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
                  <div className="text-gray-500">Egresos:</div>
                  <div className="text-right text-red-600">-${register.expenses_total.toFixed(2)}</div>
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
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar productos..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-6 text-center text-gray-500">
                  Cargando datos de productos...
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
                      {error}
                    </div>
                  )}

                  {sortedSales.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">
                      No hay ventas de productos registradas en este período.
                      <p className="mt-2 text-sm text-gray-400">
                        Esto puede deberse a que las ventas no están correctamente vinculadas al período de esta caja 
                        o a que se ha cambiado la estructura de los datos desde que se realizó el cierre.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th 
                              scope="col" 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort('product_name')}
                            >
                              <div className="flex items-center">
                                Producto
                                {sortField === 'product_name' && (
                                  sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort('quantity')}
                            >
                              <div className="flex items-center justify-end">
                                Cantidad
                                {sortField === 'quantity' && (
                                  sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort('total_price')}
                            >
                              <div className="flex items-center justify-end">
                                Total
                                {sortField === 'total_price' && (
                                  sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortedSales.map((sale: any) => (
                            <tr key={sale.product_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {sale.product_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                {formatQuantity(sale)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                {sale.has_discount ? (
                                  <span className="text-green-600">
                                    ${sale.total_with_discount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span>${sale.total_price.toFixed(2)}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Total
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              ${totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
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
  );
}