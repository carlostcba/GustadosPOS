# Sistema de Punto de Venta - Componentes de Caja

Este conjunto de componentes maneja la funcionalidad de caja registradora en el sistema de Punto de Venta, incluyendo la gestión de pagos, cupones de descuento y señas para pedidos anticipados.

## Componentes Principales

### CashierDashboard.tsx

Este componente actúa como el panel principal para el cajero, mostrando:
- Resumen de la caja actual (efectivo inicial, ventas, egresos)
- Estado de ventas por diferentes métodos de pago (efectivo, tarjeta, transferencia)
- Cola de pedidos pendientes de cobro
- Funcionalidades para abrir/cerrar caja y registrar egresos

El componente se integra con Supabase para mantener los datos sincronizados en tiempo real a través de canales de suscripción.

### PaymentProcessor.tsx

Maneja el proceso de cobro de una orden o pedido específico:
- Permite seleccionar el método de pago (efectivo, tarjeta, transferencia)
- Gestiona cupones de descuento a través del componente CouponValidator
- Para pedidos anticipados (preorders), permite configurar el monto de la seña utilizando el componente DepositManager
- Procesa el pago y actualiza el estado de la orden en la base de datos

### CouponValidator.tsx

Componente especializado en:
- Validación de códigos de cupón
- Verificación de requisitos del cupón (monto mínimo, fechas, límites de uso)
- Aplicación de descuentos al total del pedido
- Opción para aplicar descuentos manuales

### DepositManager.tsx

Gestiona los montos de señas para pedidos anticipados:
- Permite configurar el monto de la seña con validaciones
- Ofrece preselecciones de porcentajes comunes (30%, 50%, 70%, 100%)
- Muestra información útil como el porcentaje que representa la seña del total
- Proporciona sugerencias y validaciones para asegurar montos razonables

## Flujo de Trabajo

1. El cajero visualiza los pedidos pendientes en el CashierDashboard
2. Al seleccionar "Cobrar" en un pedido, se abre el PaymentProcessor
3. Si el pedido es anticipado (preorder) se utiliza el DepositManager para gestionar la seña
4. Se pueden aplicar descuentos mediante el CouponValidator
5. Se selecciona el método de pago y se procesa la transacción
6. El estado del pedido y los totales de caja se actualizan automáticamente

## Funcionalidades Adicionales

- **Tiempo Real**: Los cambios en órdenes y estados de caja se reflejan inmediatamente para todos los usuarios
- **Validación Robusta**: Controles para evitar entradas incorrectas o montos inválidos
- **Reportes de Cierre**: Generación de reportes completos al cerrar la caja
- **Gestión de Egresos**: Control de salidas de efectivo para pagos a proveedores o adelantos a empleados

## Mejoras Futuras

- Integración con impresoras de tickets
- Sistema de fidelización de clientes
- Más opciones de descuentos y promociones
- Estadísticas avanzadas de ventas