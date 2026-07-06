import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Reservation {
  id: number
  client: number
  bateau: number
  date_arrivee: string
  date_depart: string
  statut: string
  prix_total: string | null
}

const STATUT_LABELS: Record<string, string> = {
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  en_cours: 'En cours',
  a_facturer: 'À facturer',
  facturee: 'Facturée',
}

const STATUT_COLORS: Record<string, string> = {
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
  en_cours: 'bg-blue-100 text-blue-800',
  a_facturer: 'bg-yellow-100 text-yellow-800',
  facturee: 'bg-gray-200 text-gray-800',
}

export default function ReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/reservations/')
      .then((res) => setReservations(res.data))
      .catch(() => setError('Impossible de charger les réservations.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Réservations</h1>
        <Link
          to="/reservations/nouveau"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Nouvelle réservation
        </Link>
      </div>
      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="border-b bg-gray-100 text-left text-sm">
            <th className="p-3">ID</th>
            <th className="p-3">Client</th>
            <th className="p-3">Bateau</th>
            <th className="p-3">Arrivée</th>
            <th className="p-3">Départ</th>
            <th className="p-3">Prix</th>
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr
              key={r.id}
              onClick={() => navigate(`/reservations/${r.id}`)}
              className="cursor-pointer border-b text-sm hover:bg-gray-50"
            >
              <td className="p-3">#{r.id}</td>
              <td className="p-3">Client {r.client}</td>
              <td className="p-3">Bateau {r.bateau}</td>
              <td className="p-3">{new Date(r.date_arrivee).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{new Date(r.date_depart).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{r.prix_total ? `${r.prix_total} MAD` : '-'}</td>
              <td className="p-3">
                <span className={`rounded px-2 py-1 text-xs font-medium ${STATUT_COLORS[r.statut] || 'bg-gray-100'}`}>
                  {STATUT_LABELS[r.statut] || r.statut}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}