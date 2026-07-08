import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  client: number
  bateau: number
  date_arrivee: string
  date_depart: string
}

interface Place {
  id: number
  nom: string
  groupe_de_places: number | null
}

interface GroupeDePlaces {
  id: number
  nom: string
}

interface Bateau {
  id: number
  nom_navire: string
  type_bateau: string
  longueur: string
}

interface Client {
  id: number
  nom_prenom?: string
  raison_sociale?: string
}

function lundiDeLaSemaine(date: Date) {
  const d = new Date(date)
  const jour = d.getDay()
  const diff = (jour === 0 ? -6 : 1) - jour
  d.setDate(d.getDate() + diff)
  return d
}

export default function QuaisList() {
  const navigate = useNavigate()
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [groupes, setGroupes] = useState<GroupeDePlaces[]>([])
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [semaineDebut, setSemaineDebut] = useState(lundiDeLaSemaine(new Date()))

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/affectations/'),
      api.get('/reservations/'),
      api.get('/places/'),
      api.get('/groupes-places/'),
      api.get('/bateaux/'),
      api.get('/clients/'),
    ]).then(([a, r, p, g, b, c]) => {
      setAffectations(a.data)
      setReservations(r.data)
      setPlaces(p.data)
      setGroupes(g.data)
      setBateaux(b.data)
      setClients(c.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const idsAffectes = new Set(affectations.map((a) => a.reservation))
  const nonAffectees = reservations.filter((r) => !idsAffectes.has(r.id))

  const bateauInfo = (id: number) => bateaux.find((b) => b.id === id)
  const clientNom = (id: number) => {
    const c = clients.find((c) => c.id === id)
    return c?.nom_prenom || c?.raison_sociale || `#${id}`
  }

  const joursSemaine = useMemo(() => {
    const jours: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(semaineDebut)
      d.setDate(d.getDate() + i)
      jours.push(d)
    }
    return jours
  }, [semaineDebut])

  const placesParGroupe = (groupeId: number) => places.filter((p) => p.groupe_de_places === groupeId)
  const placesSansGroupe = places.filter((p) => !p.groupe_de_places)

  const affectationDuJour = (placeId: number, date: Date) => {
    const dateStr = date.toISOString().slice(0, 10)
    return affectations.find((a) => a.place === placeId && a.date === dateStr)
  }

  const couleurStatut = (statut?: string) => {
    if (statut === 'present') return 'bg-green-100 border-green-300'
    if (statut === 'absent') return 'bg-gray-200 border-gray-300'
    if (statut === 'aucun') return 'bg-white border-gray-200'
    return ''
  }

  const naviguerSemaine = (delta: number) => {
    const d = new Date(semaineDebut)
    d.setDate(d.getDate() + delta * 7)
    setSemaineDebut(d)
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affectations</h1>
        <Link to="/quais/configuration" className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800">
          Configuration
        </Link>
      </div>

      <div className="mb-8 rounded bg-white p-6 shadow">
        <h2 className="mb-3 font-semibold">
          {nonAffectees.length} réservation(s) non affectée(s) à la date du {new Date().toLocaleDateString('fr-FR')}
        </h2>
        {nonAffectees.length === 0 && <p className="text-sm text-gray-400">Toutes les réservations sont affectées.</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-2"></th>
              <th className="p-2">Arrivée</th>
              <th className="p-2">Départ</th>
              <th className="p-2">Longueur bateau</th>
              <th className="p-2">Nom bateau</th>
              <th className="p-2">Type bateau</th>
              <th className="p-2">Client</th>
            </tr>
          </thead>
          <tbody>
            {nonAffectees.map((r) => {
              const b = bateauInfo(r.bateau)
              return (
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    <button
                      onClick={() => navigate(`/quais/affectations/${r.id}`)}
                      className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                    >
                      Affecter
                    </button>
                  </td>
                  <td className="p-2">{new Date(r.date_arrivee).toLocaleDateString('fr-FR')}</td>
                  <td className="p-2">{new Date(r.date_depart).toLocaleDateString('fr-FR')}</td>
                  <td className="p-2">{b?.longueur}m</td>
                  <td className="p-2">{b?.nom_navire}</td>
                  <td className="p-2">{b?.type_bateau}</td>
                  <td className="p-2">{clientNom(r.client)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded bg-white p-4 shadow">
        <div className="mb-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => naviguerSemaine(-1)} className="rounded px-2 py-1 hover:bg-gray-100">←</button>
            <span className="font-medium">
              {joursSemaine[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => naviguerSemaine(1)} className="rounded px-2 py-1 hover:bg-gray-100">→</button>
          </div>
          <input
            type="date"
            value={semaineDebut.toISOString().slice(0, 10)}
            onChange={(e) => setSemaineDebut(lundiDeLaSemaine(new Date(e.target.value)))}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="w-24 p-2 text-left">Place</th>
                {joursSemaine.map((j) => (
                  <th key={j.toISOString()} className="p-2 text-left">
                    {j.toLocaleDateString('fr-FR', { weekday: 'short' })} {j.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...groupes, ...(placesSansGroupe.length ? [{ id: -1, nom: 'Sans groupe' }] : [])].map((groupe) => {
                const placesDuGroupe = groupe.id === -1 ? placesSansGroupe : placesParGroupe(groupe.id)
                if (placesDuGroupe.length === 0) return null
                return (
                  <>
                    <tr key={`groupe-${groupe.id}`} className="border-b bg-gray-100">
                      <td colSpan={8} className="p-2 font-medium text-gray-700">
                        {groupe.nom} ({placesDuGroupe.length})
                      </td>
                    </tr>
                    {placesDuGroupe.map((place) => (
                      <tr key={place.id} className="border-b">
                        <td className="p-2 font-medium text-gray-600">{place.nom}</td>
                        {joursSemaine.map((jour) => {
                          const aff = affectationDuJour(place.id, jour)
                          const reservation = aff ? reservations.find((r) => r.id === aff.reservation) : null
                          const b = reservation ? bateauInfo(reservation.bateau) : null
                          return (
                            <td
                              key={jour.toISOString()}
                              onClick={() => reservation && navigate(`/quais/affectations/${reservation.id}`)}
                              className={`cursor-pointer border p-1.5 ${couleurStatut(aff?.statut)}`}
                            >
                              {reservation && (
                                <div>
                                  <p className="font-medium">{clientNom(reservation.client)}</p>
                                  <p className="text-gray-500">
                                    {b?.nom_navire} {b?.longueur}m {b?.type_bateau}
                                  </p>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}