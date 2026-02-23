'use client'

import { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function BuscarMesaPage() {
  const [mesa, setMesa] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!mesa) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const q = query(collection(db, 'actas_procesadas'), where('nro_mesa', '==', mesa));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setError('No se encontraron actas para esta mesa.');
      } else {
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setResults(data);
      }
    } catch (err) {
      setError('Ocurrió un error al buscar.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Buscar Mesa</h1>
      <form onSubmit={handleSearch} className="mb-6 flex space-x-2">
        <input
          type="text"
          value={mesa}
          onChange={(e) => setMesa(e.target.value)}
          placeholder="Número de mesa"
          className="w-full max-w-xs px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Buscando...' : 'Buscar Mesa'}
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-4">
        {results.map((acta) => (
          <div key={acta.id} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Acta: {acta.id}</h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(acta).map(([key, value]) => {
                if (key !== 'id' && key !== 'gcs_uri') {
                  return (
                    <div key={key}>
                      <p className="font-semibold">{key}:</p>
                      <p>{String(value)}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            {acta.gcs_uri && (
              <div className="mt-4">
                 <h3 className="font-semibold">Imagen del Acta</h3>
                 <img src={acta.gcs_uri.replace("gs://", "https://storage.googleapis.com/")} alt="Acta" className="w-full h-auto rounded-lg" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
