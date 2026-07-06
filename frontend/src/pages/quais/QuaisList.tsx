import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

interface Affectation {
  id: number
  place: number
  reservation: number
  date: string
  statut: string
}

interface Reservation {
  id: number
  bateau: number
  date_arrivee: string
  date_depart: string
}

interface Place {
  id: number
  nom: string
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
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [placeChoisie, setPlaceChoisie] = useState('')
  const [assignMessage, setAssignMessage] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/affectations/').then((res) => setAffectations(res.data))
    api.get('/reservations/').then((res) => setReservations(res.data))
    api.get('/places/').then((res) => setPlaces(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const idsAffectes = new Set(affectations.map((a) => a.reservation))
  const nonAffectees = reservations.filter((r) => !idsAffectes.has(r.id))

  const affecterManuel = async (reservation: Reservation) => {
    if (!placeChoisie) return
    setAssignMessage('')
    const debut = new Date(reservation.date_arrivee)
    const fin = new Date(reservation.date_depart)
    const dates: string[] = []
    for (let d = new Date(debut); d < fin; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10))
    }

    try {
      for (const date of dates) {
        await api.post('/affectations/', {
          reservation: reservation.id,
          place: Number(placeChoisie),
          date,
          statut: 'aucun',
        })
      }
      setAssigningId(null)
      setPlaceChoisie('')
      load()
    } catch {
      setAssignMessage("Erreur : une des dates est peut-être déjà occupée sur cette place.")
    }
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des quais</h1>
        <Link to="/quais/configuration" className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800">
          Configuration
        </Link>
      </div>

      <div className="mb-8 rounded bg-white p-6 shadow">
        <h2 className="mb-3 font-semibold">Réservations non affectées ({nonAffectees.length})</h2>
        {assignMessage && <p className="mb-2 text-sm text-red-600">{assignMessage}</p>}
        {nonAffectees.length === 0 && <p className="text-sm text-gray-400">Toutes les réservations sont affectées.</p>}
        {nonAffectees.map((r) => (
          <div key={r.id} className="border-b py-2 text-sm last:border-0">
            <div className="flex items-center justify-between">
              <span>
                Réservation #{r.id} — {new Date(r.date_arrivee).toLocaleDateString('fr-FR')} → {new Date(r.date_depart).toLocaleDateString('fr-FR')}
              </span>
              <button
                onClick={() => setAssigningId(assigningId === r.id ? null : r.id)}
                className="text-blue-600 hover:underline"
              >
                Affecter
              </button>
            </div>
            {assigningId === r.id && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={placeChoisie}
                  onChange={(e) => setPlaceChoisie(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">-- Choisir une place --</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
                <button
                  onClick={() => affecterManuel(r)}
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                >
                  Confirmer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold">Affectations en cours</h2>
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
          {affectations.slice(0, 100).map((a) => (
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
      {affectations.length > 100 && (
        <p className="mt-2 text-sm text-gray-500">Affichage limité aux 100 premières lignes ({affectations.length} au total).</p>
      )}
    </div>
  )
}