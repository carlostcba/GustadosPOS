import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { CircleDollarSign, PlusCircle, LogOut, Store, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type UserProfile = {
  id: string;
  role: 'seller' | 'cashier' | 'manager';
  full_name: string;
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);

      // Redirect cashiers to cashier if they try to access new-order
      if (data.role === 'cashier' && location.pathname === '/new-order') {
        navigate('/cashier');
      }
      
      // Redirect cashiers to cashier if they try to access products
      if (data.role === 'cashier' && location.pathname === '/products') {
        navigate('/cashier');
      }

      // Make cashier the default page for cashiers
      if (data.role === 'cashier' && location.pathname === '/') {
        navigate('/cashier');
      }

      // Make new-order the default page for sellers
      if (data.role === 'seller' && location.pathname === '/') {
        navigate('/new-order');
      }

      // Redirect sellers to new-order if they try to access restricted pages
      if (data.role === 'seller' && 
          (location.pathname === '/products' || location.pathname === '/cashier')) {
        navigate('/new-order');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <Store className="h-6 w-6 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold">Sistema POS</span>
              </Link>
              
              <div className="ml-10 flex items-center space-x-4">
                <Link
                  to="/orders"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/orders'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Órdenes
                </Link>

                {profile?.role === 'seller' && (
                  <Link
                    to="/new-order"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/new-order'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <PlusCircle className="h-5 w-5 inline-block mr-1" />
                    Nuevo Pedido
                  </Link>
                )}

                {profile?.role === 'cashier' && (
                  <Link
                    to="/cashier"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/cashier'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CircleDollarSign className="h-5 w-5 inline-block mr-1" />
                    Caja
                  </Link>
                )}
                
                {/* Acceso a Productos solo para gerentes */}
                {profile?.role === 'manager' && (
                  <Link
                    to="/products"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/products'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Package className="h-5 w-5 inline-block mr-1" />
                    Productos
                  </Link>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {profile?.full_name}
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {profile?.role === 'seller' 
                    ? 'Vendedor' 
                    : profile?.role === 'manager' 
                      ? 'Gerente' 
                      : 'Cajero'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}