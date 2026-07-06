import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Contrat {
  id: number
  client: number
  bateau: number
  groupe_contrat: number
  date_arrivee: string
  date_depart: string
  prix_total: string | null
  statut_signature: string
}

const SIGNATURE_LABELS: Record<string, string> = {
  a_envoyer: 'À envoyer',
  envoye: 'Envoyé',
  signe: 'Signé',
  archive: 'Archivé',
  resilie: 'Résilié',
}

const SIGNATURE_COLORS: Record<string, string> = {
  a_envoyer: 'bg-yellow-100 text-yellow-800',
  envoye: 'bg-blue-100 text-blue-800',
  signe: 'bg-green-100 text-green-800',
  archive: 'bg-gray-200 text-gray-800',
  resilie: 'bg-red-100 text-red-800',
}

export default function ContratsList() {
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/contrats-reservations/')
      .then((res) => setContrats(res.data))
      .catch(() => setError('Impossible de charger les contrats.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contrats</h1>
        <Link
          to="/contrats/nouveau"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Nouveau contrat
        </Link>
      </div>
      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="border-b bg-gray-100 text-left text-sm">
            <th className="p-3">ID</th>
            <th className="p-3">Client</th>
            <th className="p-3">Bateau</th>
            <th className="p-3">Début</th>
            <th className="p-3">Fin</th>
            <th className="p-3">Prix</th>
            <th className="p-3">Statut signature</th>
          </tr>
        </thead>
        <tbody>
          {contrats.map((c) => (
            <tr
              key={c.id}
              onClick={() => navigate(`/contrats/${c.id}`)}
              className="cursor-pointer border-b text-sm hover:bg-gray-50"
            >
              <td className="p-3">#{c.id}</td>
              <td className="p-3">Client {c.client}</td>
              <td className="p-3">Bateau {c.bateau}</td>
              <td className="p-3">{new Date(c.date_arrivee).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{new Date(c.date_depart).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{c.prix_total ? `${c.prix_total} MAD` : '-'}</td>
              <td className="p-3">
                <span className={`rounded px-2 py-1 text-xs font-medium ${SIGNATURE_COLORS[c.statut_signature] || 'bg-gray-100'}`}>
                  {SIGNATURE_LABELS[c.statut_signature] || c.statut_signature}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}