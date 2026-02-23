'use client'

import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <div>
        {/* Puedes agregar un título o logo aquí */}
      </div>
      <div className="flex items-center space-x-4">
        <p className="text-gray-700">Hola, {user?.email}</p>
      </div>
    </header>
  );
}
