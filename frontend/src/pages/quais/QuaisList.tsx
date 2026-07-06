import { useEffect, useState } from 'react'
import api from '../../api/axios'

interface Affectation {
  id: number
  place: number
  reservation: number
  date: string
  statut: string
}

const STATUT_LABELS: Record<string, string> = {
  present: 'Présent',
  absent: 'Absent',
  aucun: 'Ni présent ni absent',
}

const STATUT_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-gray-200 text-gray-800',
  aucun: 'bg-white text-gray-500 border border-gray-300',
}

export default function QuaisList() {
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/affectations/')
      .then((res) => setAffectations(res.data))
      .catch(() => setError('Impossible de charger les affectations.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Affectations des places</h1>
      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="border-b bg-gray-100 text-left text-sm">
            <th className="p-3">Place</th>
            <th className="p-3">Réservation</th>
            <th className="p-3">Date</th>
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {affectations.map((a) => (
            <tr key={a.id} className="border-b text-sm hover:bg-gray-50">
              <td className="p-3">Place {a.place}</td>
              <td className="p-3">Réservation #{a.reservation}</td>
              <td className="p-3">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">
                <span className={`rounded px-2 py-1 text-xs font-medium ${STATUT_COLORS[a.statut] || 'bg-gray-100'}`}>
                  {STATUT_LABELS[a.statut] || a.statut}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}