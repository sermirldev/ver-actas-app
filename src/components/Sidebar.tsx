'use client'

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 text-2xl font-bold">Mi App</div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        <Link href="/dashboard" className="block px-4 py-2 rounded-md hover:bg-gray-700">Dashboard</Link>
        <Link href="/buscar-mesa" className="block px-4 py-2 rounded-md hover:bg-gray-700">Buscar Mesa</Link>
      </nav>
      <div className="p-4">
        <button
          onClick={logout}
          className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
