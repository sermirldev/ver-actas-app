'use client'

import { useState } from 'react';
import { collection, query, where, getDocs, DocumentData, Timestamp } from 'firebase/firestore';
import { db, storage } from '../../../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

// --- TYPE DEFINITIONS ---
interface Property {
    confiabilidad: number;
    votos?: string | number;
    valor?: string;
    x?: number;
    y?: number;
    valor_normalizado?: string | null;
}

interface ElectionCategory {
    propiedades?: Record<string, Property | null>;
}

interface DatosJson {
    [key: string]: Property | ElectionCategory | any | null;
}

interface Acta extends DocumentData {
  id: string;
  nro_mesa: string;
  gcs_uri?: string;
  imageUrl?: string | null;
  estado?: string;
  usuario?: string;
  fecha_completado?: Timestamp;
  fecha_ingreso?: Timestamp;
  fecha_procesamiento?: Timestamp;
  datos_json?: DatosJson;
}

// --- HELPER COMPONENTS ---
const PropertyField = ({ label, data }: { label: string, data: Property | null }) => {
    if (!data || Array.isArray(data)) {
        return (
            <div className="bg-white p-3 rounded-md border">
                <p className="font-bold capitalize text-gray-800">{label.replace(/_/g, ' ')}</p>
                <p className="text-sm"><span className="font-semibold">Valor:</span> N/A (Ver JSON)</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-3 rounded-md border">
            <p className="font-bold capitalize text-gray-800">{label.replace(/_/g, ' ')}</p>
            <p className="text-sm"><span className="font-semibold">Valor:</span> {data.votos ?? data.valor}</p>
            {data.confiabilidad !== undefined && <p className="text-sm"><span className="font-semibold">Confiabilidad:</span> {data.confiabilidad.toFixed(2)}%</p>}
            {data.x !== undefined && <p className="text-sm"><span className="font-semibold">X:</span> {data.x.toFixed(4)}</p>}
            {data.y !== undefined && <p className="text-sm"><span className="font-semibold">Y:</span> {data.y.toFixed(4)}</p>}
        </div>
    )
};

const ElectionCategorySection = ({ categoryName, data }: { categoryName: string, data: ElectionCategory }) => {
    const { propiedades } = data;
    if (!propiedades) return null;

    const allProps = Object.entries(propiedades);
    const summaryKeys = ['blancos', 'nulos', 'validos'];

    const summaryProps = allProps.filter(([key]) => {
        const prefix = key.split('_')[0];
        return summaryKeys.includes(prefix);
    });

    const candidateProps = allProps.filter(([key]) => {
        const prefix = key.split('_')[0];
        return !summaryKeys.includes(prefix);
    });

    return (
        <div className="border rounded-lg p-4 space-y-5 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800 capitalize">Resultados para: {categoryName}</h3>
            
            {summaryProps.length > 0 && (
                 <div>
                    <h4 className="font-semibold text-md mb-3 text-gray-600 pl-2">Resumen de Votos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {summaryProps.map(([key, value]) => <PropertyField key={key} label={key} data={value} />)}
                    </div>
                </div>
            )}
            
            {candidateProps.length > 0 && (
                 <div>
                    <h4 className="font-semibold text-md mb-3 text-gray-600 pl-2">Votos por Candidatura</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {candidateProps.map(([key, value]) => <PropertyField key={key} label={key} data={value} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---
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
          const docData = doc.data() as Acta;
          let imageUrl = null;
          if (docData.gcs_uri) {
            try {
              const filePath = docData.gcs_uri.replace(/gs:\/\/[^\/]+\//, '');
              const imageRef = ref(storage, filePath);
              imageUrl = await getDownloadURL(imageRef);
            } catch (storageError) {
              console.error("Error al obtener URL de la imagen: ", storageError);
            }
          }
          return { ...docData, id: doc.id, imageUrl };
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

      <div className="space-y-8">
        {results.map((acta) => {
            if (!acta.datos_json) return <p>No hay datos de formulario para mostrar.</p>;

            const generalFields: [string, Property | null][] = [];
            const electionCategories: [string, ElectionCategory][] = [];
            let observaciones_texto: string | null = null;

            Object.entries(acta.datos_json).forEach(([key, value]) => {
                if (key === 'observaciones') {
                    if (value && typeof value === 'object' && 'valor' in value && typeof (value as any).valor === 'string') {
                        observaciones_texto = (value as any).valor;
                    } else if (typeof value === 'string') {
                        observaciones_texto = value;
                    }
                } else if (value && typeof value === 'object' && !Array.isArray(value) && !('confiabilidad' in value)) {
                    const categoryData: ElectionCategory = { propiedades: value as Record<string, Property | null> };
                    electionCategories.push([key, categoryData]);
                } else {
                    generalFields.push([key, value as Property | null]);
                }
            });

            return (
              <div key={acta.id} className="bg-white p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Acta de Mesa: {acta.nro_mesa}</h2>

                {/* General Information */}
                <div className="border rounded-lg p-4 bg-gray-100">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">Información General del Sistema</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="font-semibold text-gray-600">Estado</p> 
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${acta.estado === 'DONE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{acta.estado}</span>
                        </div>
                        <div><p className="font-semibold text-gray-600">Usuario:</p> <p className="text-gray-800">{acta.usuario}</p></div>
                        <div><p className="font-semibold text-gray-600">ID Documento:</p> <p className="text-gray-800 text-xs">{acta.id}</p></div>
                        <div><p className="font-semibold text-gray-600">Fecha Ingreso:</p> <p className="text-gray-800">{acta.fecha_ingreso?.toDate().toLocaleString()}</p></div>
                        <div><p className="font-semibold text-gray-600">Fecha Procesamiento:</p> <p className="text-gray-800">{acta.fecha_procesamiento?.toDate().toLocaleString()}</p></div>
                        <div><p className="font-semibold text-gray-600">Fecha Completado:</p> <p className="text-gray-800">{acta.fecha_completado?.toDate().toLocaleString()}</p></div>
                    </div>
                </div>
                
                {/* General Form Fields */}
                {generalFields.length > 0 && (
                    <div className="border rounded-lg p-4 bg-gray-50/50">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Datos Generales del Formulario</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {generalFields.map(([key, value]) => (
                                <PropertyField key={key} label={key} data={value} />
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Observaciones Section */}
                {observaciones_texto && (
                     <div className="border rounded-lg p-4 bg-gray-50/50">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Observaciones</h3>
                        <p className="text-gray-800 whitespace-pre-wrap">{observaciones_texto}</p>
                     </div>
                )}

                {/* Election Categories */}
                <div className="space-y-6">
                    {electionCategories.map(([category, data]) => (
                        <ElectionCategorySection key={category} categoryName={category} data={data} />
                    ))}
                </div>

                {/* Image */}
                {acta.imageUrl ? (
                  <div className="mt-4">
                     <h3 className="font-semibold text-lg mb-2 text-gray-700">Imagen del Acta</h3>
                     <img src={acta.imageUrl} alt={`Acta de mesa ${acta.nro_mesa}`} className="w-full h-auto rounded-lg border-2 border-gray-200" />
                  </div>
                ) : (
                  <div className="mt-4">
                    <h3 className="font-semibold text-lg mb-2 text-gray-700">Imagen del Acta</h3>
                    <div className="border-dashed border-2 border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                        <p className="text-gray-500">No se pudo cargar la imagen para esta acta.</p>
                    </div>
                  </div>
                )}

                {/* datos_json display */}
                {acta.datos_json && (() => {
                    const orderedJson: DatosJson = {};
                    if (acta.datos_json.Alcalde) {
                        orderedJson.Alcalde = acta.datos_json.Alcalde;
                    }
                    if (acta.datos_json.Concejal) {
                        orderedJson.Concejal = acta.datos_json.Concejal;
                    }
                    for (const key in acta.datos_json) {
                        if (key !== 'Alcalde' && key !== 'Concejal') {
                            orderedJson[key] = acta.datos_json[key];
                        }
                    }

                    return (
                        <div className="mt-4">
                            <h3 className="font-semibold text-lg mb-2 text-gray-700">Datos JSON</h3>
                            <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                                <code>{JSON.stringify(orderedJson, null, 2)}</code>
                            </pre>
                        </div>
                    );
                })()}
              </div>
            )}
        )}
      </div>
    </div>
  );
}
