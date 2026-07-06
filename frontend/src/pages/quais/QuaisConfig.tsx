import { useEffect, useState } from 'react'
import api from '../../api/axios'

interface GroupeDePlaces {
  id: number
  nom: string
  type_bassin: string
  total_inventaire: number | null
  longueur_min: string | null
  longueur_max: string | null
  largeur_min: string | null
  largeur_max: string | null
}

interface Place {
  id: number
  nom: string
  type_place: string
  groupe_de_places: number | null
}

export default function QuaisConfig() {
  const [groupes, setGroupes] = useState<GroupeDePlaces[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  const [showGroupeForm, setShowGroupeForm] = useState(false)
  const [nomGroupe, setNomGroupe] = useState('')
  const [typeBassin, setTypeBassin] = useState('')
  const [longueurMin, setLongueurMin] = useState('')
  const [longueurMax, setLongueurMax] = useState('')
  const [largeurMin, setLargeurMin] = useState('')
  const [largeurMax, setLargeurMax] = useState('')

  const [showPlaceForm, setShowPlaceForm] = useState(false)
  const [nomPlace, setNomPlace] = useState('')
  const [typePlace, setTypePlace] = useState('')
  const [groupeChoisi, setGroupeChoisi] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/groupes-places/').then((res) => setGroupes(res.data))
    api.get('/places/').then((res) => setPlaces(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const creerGroupe = async () => {
    if (!nomGroupe) return
    await api.post('/groupes-places/', {
      nom: nomGroupe,
      type_bassin: typeBassin,
      longueur_min: longueurMin || null,
      longueur_max: longueurMax || null,
      largeur_min: largeurMin || null,
      largeur_max: largeurMax || null,
    })
    setNomGroupe('')
    setTypeBassin('')
    setLongueurMin('')
    setLongueurMax('')
    setLargeurMin('')
    setLargeurMax('')
    setShowGroupeForm(false)
    load()
  }

  const creerPlace = async () => {
    if (!nomPlace) return
    await api.post('/places/', {
      nom: nomPlace,
      type_place: typePlace,
      groupe_de_places: groupeChoisi ? Number(groupeChoisi) : null,
    })
    setNomPlace('')
    setTypePlace('')
    setGroupeChoisi('')
    setShowPlaceForm(false)
    load()
  }

  const supprimerGroupe = async (id: number) => {
    if (!window.confirm('Supprimer ce groupe de places ?')) return
    await api.delete(`/groupes-places/${id}/`)
    load()
  }

  const supprimerPlace = async (id: number) => {
    if (!window.confirm('Supprimer cette place ?')) return
    await api.delete(`/places/${id}/`)
    load()
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Configuration des quais</h1>

      <div className="mb-6 rounded bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Groupes de places</h2>
          <button onClick={() => setShowGroupeForm(!showGroupeForm)} className="text-sm text-blue-600 hover:underline">
            + Nouveau groupe
          </button>
        </div>

        {showGroupeForm && (
          <div className="mb-4 space-y-2 rounded border border-gray-200 p-3">
            <input
              type="text"
              placeholder="Nom du groupe"
              value={nomGroupe}
              onChange={(e) => setNomGroupe(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Type de bassin"
              value={typeBassin}
              onChange={(e) => setTypeBassin(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.01" placeholder="Longueur min" value={longueurMin} onChange={(e) => setLongueurMin(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Longueur max" value={longueurMax} onChange={(e) => setLongueurMax(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Largeur min" value={largeurMin} onChange={(e) => setLargeurMin(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Largeur max" value={largeurMax} onChange={(e) => setLargeurMax(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <button onClick={creerGroupe} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              Créer
            </button>
          </div>
        )}

        {groupes.map((g) => (
          <div key={g.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
            <span>
              {g.nom} — {g.type_bassin || 'sans type'} — {g.longueur_min || '?'}m à {g.longueur_max || '?'}m
            </span>
            <button onClick={() => supprimerGroupe(g.id)} className="text-red-600 hover:underline">
              Supprimer
            </button>
          </div>
        ))}
      </div>

      <div className="rounded bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Places</h2>
          <button onClick={() => setShowPlaceForm(!showPlaceForm)} className="text-sm text-blue-600 hover:underline">
            + Nouvelle place
          </button>
        </div>

        {showPlaceForm && (
          <div className="mb-4 space-y-2 rounded border border-gray-200 p-3">
            <input
              type="text"
              placeholder="Nom de la place (ex: A1)"
              value={nomPlace}
              onChange={(e) => setNomPlace(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Type de place"
              value={typePlace}
              onChange={(e) => setTypePlace(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={groupeChoisi}
              onChange={(e) => setGroupeChoisi(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- Groupe de places --</option>
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>{g.nom}</option>
              ))}
            </select>
            <button onClick={creerPlace} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              Créer
            </button>
          </div>
        )}

        {places.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
            <span>{p.nom} — {groupes.find((g) => g.id === p.groupe_de_places)?.nom || 'sans groupe'}</span>
            <button onClick={() => supprimerPlace(p.id)} className="text-red-600 hover:underline">
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}