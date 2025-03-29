import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OrderList } from './components/OrderList';
import { NewOrder } from './components/NewOrder';
import { CashierDashboard } from './components/CashierDashboard';
import { ProductManagement } from './components/ProductManagement';
import { CashRegisterHistory } from './components/CashRegisterHistory';
import { Auth } from './components/Auth';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="cashier" element={<CashierDashboard />} />
          <Route path="register-history" element={<CashRegisterHistory />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;