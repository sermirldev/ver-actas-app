'use client'

import { useState } from 'react';
import { collection, query, where, getDocs, DocumentData, Timestamp } from 'firebase/firestore';
import { db, storage } from '../../../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

// --- TYPE DEFINITIONS ---
interface Property {
    confianza: number;
    valor: string;
    valor_normalizado?: string | null;
}

interface ElectionCategory {
    confianza?: number;
    propiedades?: Record<string, Property>;
}

interface CamposFormulario {
    [key: string]: Property | ElectionCategory;
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
  campos_formulario?: CamposFormulario;
}

// --- HELPER COMPONENTS ---
const PropertyField = ({ label, data }: { label: string, data: Property }) => (
    <div className="bg-white p-3 rounded-md border">
        <p className="font-bold capitalize text-gray-800">{label.replace(/_/g, ' ')}</p>
        <p className="text-sm"><span className="font-semibold">Valor:</span> {data.valor}</p>
        {data.confianza !== undefined && <p className="text-sm"><span className="font-semibold">Confianza:</span> {(data.confianza * 100).toFixed(2)}%</p>}
        {data.valor_normalizado && <p className="text-sm"><span className="font-semibold">Valor Normalizado:</span> {data.valor_normalizado}</p>}
    </div>
);

const ElectionCategorySection = ({ categoryName, data }: { categoryName: string, data: ElectionCategory }) => {
    const { propiedades, confianza } = data;
    if (!propiedades) return null;

    const siglaProps = Object.entries(propiedades).filter(([key]) => key.startsWith('sigla_'));

    return (
        <div className="border rounded-lg p-4 space-y-5 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800 capitalize">Resultados para: {categoryName}</h3>

            {confianza !== undefined && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <p className="font-semibold text-blue-800">Confianza General ({categoryName}): 
                        <span className="font-bold text-lg ml-2">{(confianza * 100).toFixed(2)}%</span>
                    </p>
                </div>
            )}
            
            {siglaProps.length > 0 && (
                 <div>
                    <h4 className="font-semibold text-md mb-3 text-gray-600 pl-2">Votos por Candidatura</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {siglaProps.map(([key, value]) => <PropertyField key={key} label={key} data={value} />)}
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
            if (!acta.campos_formulario) return <p>No hay datos de formulario para mostrar.</p>;

            const generalFields: [string, Property][] = [];
            const electionCategories: [string, ElectionCategory][] = [];

            Object.entries(acta.campos_formulario).forEach(([key, value]) => {
                if ('propiedades' in value) {
                    electionCategories.push([key, value as ElectionCategory]);
                } else {
                    generalFields.push([key, value as Property]);
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
              </div>
            )}
        )}
      </div>
    </div>
  );
}
