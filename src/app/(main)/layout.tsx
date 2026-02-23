'use client'

import { AuthProvider, useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

function AuthenticatedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // El hook de AuthContext se encarga de la redirección
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function MainLayout({ children }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
