'use client'

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function DashboardPage() {
  const [actasCount, setActasCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActasCount = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'actas_procesadas'));
        setActasCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching actas count: ", error);
      }
      setLoading(false);
    };

    fetchActasCount();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Total de Actas</h2>
          {loading ? (
            <p className="text-3xl font-bold text-gray-900 animate-pulse">...</p>
          ) : (
            <p className="text-3xl font-bold text-gray-900">{actasCount}</p>
          )}
        </div>
      </div>
    </div>
  );
}
