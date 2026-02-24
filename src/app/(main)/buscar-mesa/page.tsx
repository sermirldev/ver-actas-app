'use client'

import { useState } from 'react';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { db, storage } from '../../../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

// Define a type for the document data
interface Acta extends DocumentData {
  id: string;
  nro_mesa: string;
  gcs_uri?: string;
  imageUrl?: string | null;
}

export default function BuscarMesaPage() {
  const [mesa, setMesa] = useState('');
  const [results, setResults] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
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
        const dataPromises = querySnapshot.docs.map(async (doc) => {
          const docData = doc.data() as DocumentData;
          const actaData: Acta = {
            id: doc.id,
            nro_mesa: docData.nro_mesa,
            gcs_uri: docData.gcs_uri,
            ...docData,
          };

          let imageUrl = null;

          if (actaData.gcs_uri) {
            try {
              const filePath = actaData.gcs_uri.replace(/gs:\/\/[^\/]+\//, '');
              const imageRef = ref(storage, filePath);
              imageUrl = await getDownloadURL(imageRef);
            } catch (storageError) {
              console.error("Error al obtener URL de la imagen: ", storageError);
              // Gracefully handle image loading errors
            }
          }
          return { ...actaData, imageUrl };
        });

        const resolvedData = await Promise.all(dataPromises);
        setResults(resolvedData);
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
                if (key !== 'id' && key !== 'gcs_uri' && key !== 'imageUrl') {
                  return (
                    <div key={key}>
                      <p className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</p>
                      <p>{String(value)}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            {acta.imageUrl ? (
              <div className="mt-4">
                 <h3 className="font-semibold">Imagen del Acta</h3>
                 <img src={acta.imageUrl} alt={`Acta de mesa ${acta.nro_mesa}`} className="w-full h-auto rounded-lg border" />
              </div>
            ) : (
              <div className="mt-4">
                <h3 className="font-semibold">Imagen del Acta</h3>
                <p className="text-gray-500">No se pudo cargar la imagen para esta acta.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
