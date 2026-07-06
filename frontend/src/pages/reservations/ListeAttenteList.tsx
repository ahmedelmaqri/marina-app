import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Attente {
  id: number
  client: number | null
  nom_prenom: string
  email: string
  telephone: string
  longueur: string
  largeur: string
  type_bateau: string
  date_arrivee: string
  date_depart: string
  requete_speciale: string
}

interface Client {
  id: number
  nom_prenom?: string
  raison_sociale?: string
}

interface Bateau {
  id: number
  client: number
  nom_navire: string
}

export default function ListeAttenteList() {
  const navigate = useNavigate()
  const [attentes, setAttentes] = useState<Attente[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [bateauxDisponibles, setBateauxDisponibles] = useState<Bateau[]>([])
  const [bateauChoisi, setBateauChoisi] = useState('')
  const [clientAAssocier, setClientAAssocier] = useState('')

  const load = () => {
    setLoading(true)
    api
      .get('/liste-attente/')
      .then((res) => setAttentes(res.data))
      .catch(() => setError('Impossible de charger la liste d\'attente.'))
      .finally(() => setLoading(false))
    api.get('/clients/').then((res) => setClients(res.data))
  }

  useEffect(() => {
    load()
  }, [])

  const ouvrirDetail = async (attente: Attente) => {
    setMessage('')
    setExpandedId(attente.id)
    setBateauChoisi('')
    setClientAAssocier('')
    if (attente.client) {
      const res = await api.get('/bateaux/')
      setBateauxDisponibles(res.data.filter((b: Bateau) => b.client === attente.client))
    } else {
      setBateauxDisponibles([])
    }
  }

  const associerClient = async (attenteId: number) => {
    if (!clientAAssocier) return
    await api.patch(`/liste-attente/${attenteId}/`, { client: Number(clientAAssocier) })
    const res = await api.get('/bateaux/')
    setBateauxDisponibles(res.data.filter((b: Bateau) => b.client === Number(clientAAssocier)))
    load()
  }

  const transformer = async (attenteId: number) => {
    if (!bateauChoisi) {
      setMessage('Sélectionnez un bateau.')
      return
    }
    try {
      const { data } = await api.post(`/liste-attente/${attenteId}/transformer_en_escale/`, {
        bateau_id: Number(bateauChoisi),
      })
      navigate(`/reservations/${data.escale_id}`)
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Erreur lors de la transformation.')
    }
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer cette demande de la liste d\'attente ?')) return
    await api.delete(`/liste-attente/${id}/`)
    load()
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Liste d'attente</h1>

      {message && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{message}</p>
      )}

      <div className="space-y-3">
        {attentes.map((a) => (
          <div key={a.id} className="rounded bg-white p-4 shadow">
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => (expandedId === a.id ? setExpandedId(null) : ouvrirDetail(a))}
            >
              <div>
                <p className="font-medium">{a.nom_prenom}</p>
                <p className="text-sm text-gray-500">
                  {new Date(a.date_arrivee).toLocaleDateString('fr-FR')} → {new Date(a.date_depart).toLocaleDateString('fr-FR')}
                  {' '}— {a.longueur}m x {a.largeur}m
                </p>
              </div>
              <span className="text-sm text-blue-600">{expandedId === a.id ? 'Fermer' : 'Consulter'}</span>
            </div>

            {expandedId === a.id && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm text-gray-600">Email : {a.email} — Tél : {a.telephone}</p>
                {a.requete_speciale && (
                  <p className="mb-2 text-sm text-gray-600">Requête : {a.requete_speciale}</p>
                )}

                {!a.client ? (
                  <div className="mb-3 flex items-center gap-2">
                    <select
                      value={clientAAssocier}
                      onChange={(e) => setClientAAssocier(e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">-- Associer un client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom_prenom || c.raison_sociale}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => associerClient(a.id)}
                      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                    >
                      Associer
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2">
                    <select
                      value={bateauChoisi}
                      onChange={(e) => setBateauChoisi(e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">-- Choisir le bateau --</option>
                      {bateauxDisponibles.map((b) => (
                        <option key={b.id} value={b.id}>{b.nom_navire}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => transformer(a.id)}
                      className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                    >
                      Faire une réservation
                    </button>
                  </div>
                )}

                <button
                  onClick={() => supprimer(a.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}

        {attentes.length === 0 && <p className="text-gray-500">Aucune demande en attente.</p>}
      </div>
    </div>
  )
}