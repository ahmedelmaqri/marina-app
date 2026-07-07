import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface ReservationBrute {
  id: number
  client: number
  bateau: number
  date_arrivee: string
  date_depart: string
  longueur: string
  largeur: string
  statut: string
  prix_total: string | null
  date_confirmation: string | null
}

interface ReservationFusionnee extends ReservationBrute {
  type: 'escale' | 'contrat'
}

interface Client {
  id: number
  nom_prenom?: string
  raison_sociale?: string
}

interface Bateau {
  id: number
  nom_navire: string
  tirant_eau: string | null
}

const STATUT_LABELS: Record<string, string> = {
  confirmee: 'Confirmé',
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
  const navigate = useNavigate()
  const [reservations, setReservations] = useState<ReservationFusionnee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [recherche, setRecherche] = useState('')
  const [arriveeApres, setArriveeApres] = useState('')
  const [departAvant, setDepartAvant] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/escales/'),
      api.get('/contrats-reservations/'),
      api.get('/clients/'),
      api.get('/bateaux/'),
    ])
      .then(([escales, contrats, cl, ba]) => {
        const fusion: ReservationFusionnee[] = [
          ...escales.data.map((e: ReservationBrute) => ({ ...e, type: 'escale' as const })),
          ...contrats.data.map((c: ReservationBrute) => ({ ...c, type: 'contrat' as const })),
        ].sort((a, b) => b.id - a.id)

        setReservations(fusion)
        setClients(cl.data)
        setBateaux(ba.data)
      })
      .catch(() => setError('Impossible de charger les réservations.'))
      .finally(() => setLoading(false))
  }, [])

  const clientNom = (id: number) => {
    const c = clients.find((c) => c.id === id)
    return c?.nom_prenom || c?.raison_sociale || `#${id}`
  }

  const bateauInfo = (id: number) => bateaux.find((b) => b.id === id)

  const reservationsFiltrees = reservations.filter((r) => {
    if (recherche) {
      const q = recherche.toLowerCase()
      const match =
        clientNom(r.client).toLowerCase().includes(q) ||
        (bateauInfo(r.bateau)?.nom_navire || '').toLowerCase().includes(q) ||
        String(r.id).includes(q)
      if (!match) return false
    }
    if (arriveeApres && r.date_arrivee.slice(0, 10) < arriveeApres) return false
    if (departAvant && r.date_depart.slice(0, 10) > departAvant) return false
    return true
  })

  const reinitialiser = () => {
    setRecherche('')
    setArriveeApres('')
    setDepartAvant('')
  }

  const exporter = () => {
    const entetes = ['Statut', 'ID', 'Client', 'Bateau', 'Arrivée', 'Départ', 'Longueur', 'Largeur', "Tirant d'eau", 'Type', 'Prix']
    const lignes = reservationsFiltrees.map((r) => [
      STATUT_LABELS[r.statut] || r.statut,
      r.id,
      clientNom(r.client),
      bateauInfo(r.bateau)?.nom_navire || '',
      r.date_arrivee.slice(0, 10),
      r.date_depart.slice(0, 10),
      r.longueur,
      r.largeur,
      bateauInfo(r.bateau)?.tirant_eau || '',
      r.type,
      r.prix_total || '',
    ])
    const csv = [entetes, ...lignes].map((ligne) => ligne.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reservations.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Réservations</h1>
        <div className="flex gap-3">
          <Link
            to="/reservations/nouveau"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            + Nouvelle réservation
          </Link>
          <button onClick={exporter} className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800">
            Exporter
          </button>
          <button onClick={() => window.print()} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
            Imprimer
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded bg-white p-4 shadow">
        <input
          type="text"
          placeholder="Rechercher"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={arriveeApres}
          onChange={(e) => setArriveeApres(e.target.value)}
          title="Arrivée après"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={departAvant}
          onChange={(e) => setDepartAvant(e.target.value)}
          title="Départ avant"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
          Rechercher
        </button>
        <button onClick={reinitialiser} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
          Réinitialiser
        </button>
      </div>

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-100 text-left text-sm">
              <th className="p-3">Statut</th>
              <th className="p-3">ID Réservation</th>
              <th className="p-3">Client</th>
              <th className="p-3">Bateau</th>
              <th className="p-3">Arrivée</th>
              <th className="p-3">Départ</th>
              <th className="p-3">Longueur</th>
              <th className="p-3">Largeur</th>
              <th className="p-3">Tirant d'eau</th>
              <th className="p-3">Type réservation</th>
              <th className="p-3">Confirmé le</th>
              <th className="p-3">Prix</th>
            </tr>
          </thead>
          <tbody>
            {reservationsFiltrees.map((r) => {
              const bateau = bateauInfo(r.bateau)
              return (
                <tr
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r.type === 'escale' ? `/reservations/${r.id}` : `/contrats/${r.id}`)}
                  className="cursor-pointer border-b text-sm hover:bg-gray-50"
                >
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${STATUT_COLORS[r.statut] || 'bg-gray-100'}`}>
                      {STATUT_LABELS[r.statut] || r.statut}
                    </span>
                  </td>
                  <td className="p-3">#{r.id}</td>
                  <td className="p-3">{clientNom(r.client)}</td>
                  <td className="p-3">{bateau?.nom_navire || '-'}</td>
                  <td className="p-3">{new Date(r.date_arrivee).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">{new Date(r.date_depart).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">{r.longueur}'</td>
                  <td className="p-3">{r.largeur}'</td>
                  <td className="p-3">{bateau?.tirant_eau ? `${bateau.tirant_eau}'` : '-'}</td>
                  <td className="p-3 capitalize">{r.type}</td>
                  <td className="p-3">{r.date_confirmation ? new Date(r.date_confirmation).toLocaleDateString('fr-FR') : '-'}</td>
                  <td className="p-3">{r.prix_total ? `${r.prix_total} MAD` : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {reservationsFiltrees.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">Aucune réservation.</p>
        )}
      </div>
    </div>
  )
}