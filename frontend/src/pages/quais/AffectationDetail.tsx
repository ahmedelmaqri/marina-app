import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'

interface Affectation {
  id: number
  place: number
  date: string
  statut: string
}

interface Place {
  id: number
  nom: string
}

interface Reservation {
  id: number
  client: number
  bateau: number
  date_arrivee: string
  date_depart: string
}

interface Bateau {
  id: number
  nom_navire: string
  type_bateau: string
  longueur: string
}

function toutesLesNuits(dateArrivee: string, dateDepart: string) {
  const debut = new Date(dateArrivee)
  const fin = new Date(dateDepart)
  const nuits: string[] = []
  for (let d = new Date(debut); d < fin; d.setDate(d.getDate() + 1)) {
    nuits.push(d.toISOString().slice(0, 10))
  }
  return nuits
}

export default function AffectationDetail() {
  const { reservationId } = useParams()
  const navigate = useNavigate()

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [bateau, setBateau] = useState<Bateau | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [affectationsParNuit, setAffectationsParNuit] = useState<Record<string, Affectation | null>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [placeGlobale, setPlaceGlobale] = useState('')
  const [absentDu, setAbsentDu] = useState('')
  const [absentAu, setAbsentAu] = useState('')

  const charger = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get(`/reservations/${reservationId}/`)
      setReservation(res)

      const [{ data: bat }, { data: pls }, { data: affs }] = await Promise.all([
        api.get(`/bateaux/${res.bateau}/`),
        api.get('/places/'),
        api.get('/affectations/'),
      ])
      setBateau(bat)
      setPlaces(pls)

      const nuits = toutesLesNuits(res.date_arrivee, res.date_depart)
      const map: Record<string, Affectation | null> = {}
      nuits.forEach((nuit) => {
        const trouve = affs.find((a: any) => a.reservation === Number(reservationId) && a.date === nuit)
        map[nuit] = trouve || null
      })
      setAffectationsParNuit(map)
    } catch {
      setError('Impossible de charger la réservation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    charger()
  }, [reservationId])

  const nuits = reservation ? toutesLesNuits(reservation.date_arrivee, reservation.date_depart) : []

  const changerPlace = async (nuit: string, placeId: string) => {
    if (!placeId) return
    setSaving(true)
    setError('')
    const existante = affectationsParNuit[nuit]
    try {
      if (existante) {
        await api.patch(`/affectations/${existante.id}/`, { place: Number(placeId) })
      } else {
        await api.post('/affectations/', {
          reservation: Number(reservationId),
          place: Number(placeId),
          date: nuit,
          statut: 'aucun',
        })
      }
      await charger()
    } catch {
      setError('Cette place est peut-être déjà occupée à cette date.')
    } finally {
      setSaving(false)
    }
  }

  const changerStatut = async (nuit: string, statut: string) => {
    const existante = affectationsParNuit[nuit]
    if (!existante) return
    setSaving(true)
    try {
      await api.patch(`/affectations/${existante.id}/`, { statut })
      await charger()
    } catch {
      setError('Erreur lors de la mise à jour du statut.')
    } finally {
      setSaving(false)
    }
  }

  const appliquerPlaceGlobale = async () => {
    if (!placeGlobale) return
    setSaving(true)
    setError('')
    try {
      for (const nuit of nuits) {
        if (absentDu && nuit >= absentDu && absentAu && nuit <= absentAu) continue
        const existante = affectationsParNuit[nuit]
        if (existante) {
          await api.patch(`/affectations/${existante.id}/`, { place: Number(placeGlobale) })
        } else {
          await api.post('/affectations/', {
            reservation: Number(reservationId),
            place: Number(placeGlobale),
            date: nuit,
            statut: 'aucun',
          })
        }
      }
      await charger()
    } catch {
      setError("Erreur : une des dates est peut-être déjà occupée sur cette place.")
    } finally {
      setSaving(false)
    }
  }

  const mettreAJourResteA = async (nuitDepart: string, placeId: string) => {
    if (!placeId) return
    setSaving(true)
    setError('')
    try {
      const index = nuits.indexOf(nuitDepart)
      const nuitsSuivantes = nuits.slice(index)
      for (const nuit of nuitsSuivantes) {
        const existante = affectationsParNuit[nuit]
        if (existante) {
          await api.patch(`/affectations/${existante.id}/`, { place: Number(placeId) })
        } else {
          await api.post('/affectations/', {
            reservation: Number(reservationId),
            place: Number(placeId),
            date: nuit,
            statut: 'aucun',
          })
        }
      }
      await charger()
    } catch {
      setError('Erreur lors de la mise à jour des affectations restantes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Chargement...</p>
  if (error && !reservation) return <p className="text-red-600">{error}</p>
  if (!reservation) return null

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500 hover:underline">
        ← Retour
      </button>

      <div className="rounded bg-white p-6 shadow">
        <h1 className="mb-1 text-xl font-bold">#{reservation.id}</h1>

        <div className="mb-4 grid grid-cols-2 gap-4 border-b pb-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Bateau</p>
            <p className="text-gray-600">
              {bateau?.nom_navire}, {bateau?.longueur}m {bateau?.type_bateau}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Dates</p>
            <p className="text-gray-600">
              {new Date(reservation.date_arrivee).toLocaleDateString('fr-FR')} - {new Date(reservation.date_depart).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {error && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}

        <div className="mb-4 space-y-2 border-b pb-4">
          <p className="text-sm font-medium text-gray-700">Affecter toutes les dates</p>
          <div className="flex items-center gap-2">
            <select
              value={placeGlobale}
              onChange={(e) => setPlaceGlobale(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- Sélectionner --</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
            <button
              onClick={appliquerPlaceGlobale}
              disabled={saving || !placeGlobale}
              className="rounded bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300 disabled:opacity-50"
            >
              Réinitialiser
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Absent du</span>
            <input
              type="date"
              value={absentDu}
              onChange={(e) => setAbsentDu(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
            <span className="text-gray-600">au</span>
            <input
              type="date"
              value={absentAu}
              onChange={(e) => setAbsentAu(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 text-sm font-medium text-gray-700">
            <span>Affectations</span>
            <span>Statut</span>
          </div>

          {nuits.map((nuit) => {
            const aff = affectationsParNuit[nuit]
            return (
              <div key={nuit} className="rounded border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">
                    {new Date(nuit).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  {aff && (
                    <span className="text-xs text-gray-400">
                      Dernière màj {new Date(aff.date_maj || nuit).toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 items-center gap-3">
                  <select
                    value={aff?.place || ''}
                    onChange={(e) => changerPlace(nuit, e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">-- Aucune --</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => changerStatut(nuit, 'present')}
                      disabled={!aff}
                      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                        aff?.statut === 'present' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Présent
                    </button>
                    <button
                      onClick={() => changerStatut(nuit, 'absent')}
                      disabled={!aff}
                      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                        aff?.statut === 'absent' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
                {aff && (
                  <button
                    onClick={() => mettreAJourResteA(nuit, String(aff.place))}
                    className="mt-2 w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Mettre à jour le reste des affectations à {places.find((p) => p.id === aff.place)?.nom}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}