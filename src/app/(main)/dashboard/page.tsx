'use client'

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_done: 0,
    total_error: 0,
    total_pending: 0,
    total_processing: 0,
    total_received: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const docRef = doc(db, 'estadisticas', 'totales');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStats(docSnap.data());
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching stats: ', error);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  const cardInfo = [
    { title: 'Total Recibido', value: stats.total_received, key: 'total_received' },
    { title: 'Total Procesando', value: stats.total_processing, key: 'total_processing' },
    { title: 'Total Finalizado', value: stats.total_done, key: 'total_done' },
    { title: 'Total Pendiente', value: stats.total_pending, key: 'total_pending' },
    { title: 'Total con Error', value: stats.total_error, key: 'total_error' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {cardInfo.map((card) => (
          <div key={card.key} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">{card.title}</h2>
            {loading ? (
              <p className="text-3xl font-bold text-gray-900 animate-pulse">...</p>
            ) : (
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}