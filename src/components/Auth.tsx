import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

export function Auth() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Clear any existing session on mount
    supabase.auth.signOut();
  }, []);

  const handleEmailSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        if (signInError.message.includes('Email logins are disabled')) {
          throw new Error('El sistema está en mantenimiento. Por favor contacte al administrador para obtener acceso.');
        } else if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Email o contraseña inválidos. Por favor intente nuevamente.');
        }
        throw signInError;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Iniciar Sesión
        </h1>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4F46E5',
                  brandAccent: '#4338CA',
                },
              },
            },
            className: {
              container: 'w-full',
              button: `w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`,
              input: 'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
              label: 'block text-sm font-medium text-gray-700 mb-1',
              loader: 'border-indigo-600',
              message: 'text-sm text-red-600',
            },
          }}
          providers={[]}
          view="sign_in"
          showLinks={false}
          redirectTo={window.location.origin}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Contraseña',
                button_label: 'Iniciar Sesión',
              },
            },
          }}
          onSubmit={(formData) => {
            if (formData.email && formData.password) {
              handleEmailSignIn(formData.email, formData.password);
            }
          }}
        />

        <div className="mt-6">
          <p className="text-sm text-center text-gray-600">
            Por favor contacte al administrador para obtener acceso al sistema.
          </p>
        </div>
      </div>
    </div>
  );
}