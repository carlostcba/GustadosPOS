# Sistema POS Gustados

Sistema de Punto de Venta (POS) desarrollado para gestionar ventas, pedidos anticipados, inventario de productos y cajas registradoras, con roles diferenciados para vendedores y cajeros.

## Tecnologías

- Frontend: React con TypeScript
- Estilos: Tailwind CSS
- Backend: Supabase (API REST, Auth, Storage y Realtime)
- Despliegue: Vite

## Flujo de la Aplicación

### 1. Autenticación

- Los usuarios inician sesión con su correo y contraseña
- El sistema identifica automáticamente el rol del usuario (vendedor, cajero o administrador)
- Cada rol tiene una pantalla inicial predeterminada y acceso a funciones específicas

### 2. Creación de Órdenes (Rol: Vendedor)

1. **Nuevo Pedido**:
   - El vendedor crea una orden seleccionando productos del catálogo
   - El sistema distingue entre productos pesables (por kg) y productos por unidad
   - Se captura información del cliente (nombre, y en caso de pedidos anticipados: email, teléfono y fecha de entrega)
   - Se selecciona el método de pago preferido (efectivo, tarjeta o transferencia)

2. **Tipos de Órdenes**:
   - **Órdenes Regulares (O001-O999)**: Para ventas inmediatas
   - **Pedidos Anticipados (P001-P999)**: Requieren una seña y tienen fecha futura de entrega
   - **Delivery (D001-D999)**: Para envíos a domicilio (implementación pendiente)

3. **Visualización de Órdenes**:
   - El vendedor puede ver todas sus órdenes pendientes
   - Puede realizar modificaciones limitadas a órdenes que aún no han sido pagadas

### 3. Proceso de Cobro (Rol: Cajero)

1. **Panel de Caja**:
   - El cajero debe primero abrir la caja registradora con un monto inicial
   - Visualiza todas las órdenes pendientes de cobro

2. **Procesamiento de Pagos**:
   - Para órdenes regulares: cobro del monto total
   - Para pedidos anticipados:
     - Primer cobro: registra la seña (mínimo 10%, típicamente 30-50%)
     - Segundo cobro: registra el pago del saldo al retirar el pedido

3. **Opciones de Pago**:
   - Efectivo (permite aplicar descuentos con cupones)
   - Tarjeta de crédito/débito
   - Transferencia bancaria

4. **Descuentos**:
   - Sistema de validación de cupones (solo para pagos en efectivo)
   - Los cupones pueden tener restricciones (monto mínimo, fecha de expiración, etc.)

5. **Egresos de Caja**:
   - Registro de pagos a proveedores
   - Registro de adelantos a empleados
   - Control de salidas de dinero

6. **Cierre de Caja**:
   - Balance de operaciones (ventas por método de pago, egresos, etc.)
   - Conciliación de efectivo físico versus el calculado por el sistema
   - Generación de reportes detallados de cierre

### 4. Gestión de Productos (Rol: Administrador)

1. **Catálogo de Productos**:
   - CRUD completo de productos
   - Organización por categorías y subcategorías
   - Soporte para productos pesables (por kg) y por unidad
   - Gestión de imágenes para productos

2. **Historial de Ventas**:
   - Reportes históricos de cierres de caja
   - Análisis de ventas por producto, categoría, método de pago, etc.

## Estado Actual y Funcionalidades Pendientes

### Implementado:
- ✅ Sistema de autenticación y gestión de roles
- ✅ Catálogo de productos con categorías/subcategorías
- ✅ Gestión de imágenes para productos
- ✅ Creación de órdenes regulares y pedidos anticipados
- ✅ Panel de cajero con apertura/cierre de caja
- ✅ Procesamiento de pagos con diferentes métodos
- ✅ Sistema de descuentos con cupones
- ✅ Gestión de egresos de caja
- ✅ Reportes básicos de cierre de caja
- ✅ Actualizaciones en tiempo real con Supabase Realtime

### Pendiente:
- ❌ Sistema completo de delivery
- ❌ Impresión de comprobantes/tickets para clientes
- ❌ Dashboard de estadísticas para administradores
- ❌ Gestión avanzada de inventario con control de stock
- ❌ Sistema de fidelización de clientes
- ❌ Integración con sistemas fiscales/impositivos
- ❌ Aplicación móvil para seguimiento de pedidos
- ❌ Importación/exportación masiva de productos
- ❌ Historial completo de modificaciones de órdenes

## Estructura del Proyecto

```
src/
├── components/        # Componentes React de la UI
│   ├── Auth.tsx            # Componente de autenticación
│   ├── CashierDashboard.tsx # Panel principal del cajero
│   ├── CashRegisterExpenses.tsx # Gestión de egresos
│   ├── CashRegisterReport.tsx # Reportes de caja
│   ├── CouponValidator.tsx # Validación de cupones
│   ├── DepositManager.tsx  # Gestión de señas
│   ├── ExpenseForm.tsx     # Formulario de egresos
│   ├── Layout.tsx          # Layout principal con navegación
│   ├── NewOrder.tsx        # Creación de nuevas órdenes
│   ├── OrderDetails.tsx    # Detalles de una orden
│   ├── OrderList.tsx       # Lista de órdenes
│   ├── PaymentConfirmationDialog.tsx # Confirmación de pagos
│   ├── PaymentProcessor.tsx # Procesador de pagos
│   └── ProductManagement.tsx # Gestión de productos
├── hooks/             # Custom hooks
│   └── useAuth.ts          # Hook para autenticación
├── lib/               # Utilidades y configuración
│   ├── supabase.ts         # Cliente de Supabase
│   └── types.ts            # Tipos TypeScript
└── App.tsx            # Componente principal
```

## Instalación y Ejecución

1. Clonar el repositorio
```bash
git clone https://github.com/carlostellocba/pos-gustados.git
cd pos-gustados
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
Crear un archivo `.env` basado en `.env.example` con las credenciales de Supabase:
```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

4. Ejecutar en modo desarrollo
```bash
npm run dev
```

## Licencia

Este proyecto es propiedad privada y su uso está restringido.