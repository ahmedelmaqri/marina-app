import { Fragment, useEffect, useState } from 'react'
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
  date_creation: string
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

  // Recherche
  const [recherche, setRecherche] = useState('')
  const [arriveeApres, setArriveeApres] = useState('')
  const [departAvant, setDepartAvant] = useState('')

  // Consultation / transformation
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [bateauxDisponibles, setBateauxDisponibles] = useState<Bateau[]>([])
  const [bateauChoisi, setBateauChoisi] = useState('')
  const [clientAAssocier, setClientAAssocier] = useState('')

  // Popup "Ajouter à la liste d'attente"
  const [showAjout, setShowAjout] = useState(false)
  const [ajoutForm, setAjoutForm] = useState({
    nom_prenom: '', email: '', telephone: '', longueur: '', largeur: '',
    type_bateau: '', date_arrivee: '', date_depart: '', requete_speciale: '',
  })
  const [ajoutSubmitting, setAjoutSubmitting] = useState(false)
  const [ajoutMessage, setAjoutMessage] = useState('')

  const load = () => {
    setLoading(true)
    api
      .get('/liste-attente/')
      .then((res) => setAttentes(res.data))
      .catch(() => setError("Impossible de charger la liste d'attente."))
      .finally(() => setLoading(false))
    api.get('/clients/').then((res) => setClients(res.data))
  }

  useEffect(() => {
    load()
  }, [])

  const attentesFiltrees = attentes.filter((a) => {
    if (recherche) {
      const q = recherche.toLowerCase()
      const match =
        a.nom_prenom.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.telephone.toLowerCase().includes(q)
      if (!match) return false
    }
    if (arriveeApres && a.date_arrivee < arriveeApres) return false
    if (departAvant && a.date_depart > departAvant) return false
    return true
  })

  const effacerFiltres = () => {
    setRecherche('')
    setArriveeApres('')
    setDepartAvant('')
  }

  const ouvrirDetail = async (attente: Attente) => {
    setMessage('')
    setExpandedId(expandedId === attente.id ? null : attente.id)
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
    if (!window.confirm("Supprimer cette demande de la liste d'attente ?")) return
    await api.delete(`/liste-attente/${id}/`)
    load()
  }

  const soumettreAjout = async () => {
    setAjoutSubmitting(true)
    setAjoutMessage('')
    try {
      await api.post('/liste-attente/', {
        nom_prenom: ajoutForm.nom_prenom,
        email: ajoutForm.email,
        telephone: ajoutForm.telephone,
        longueur: ajoutForm.longueur || '0',
        largeur: ajoutForm.largeur || '0',
        type_bateau: ajoutForm.type_bateau,
        date_arrivee: ajoutForm.date_arrivee,
        date_depart: ajoutForm.date_depart,
        requete_speciale: ajoutForm.requete_speciale,
      })
      setShowAjout(false)
      setAjoutForm({
        nom_prenom: '', email: '', telephone: '', longueur: '', largeur: '',
        type_bateau: '', date_arrivee: '', date_depart: '', requete_speciale: '',
      })
      load()
    } catch {
      setAjoutMessage('Erreur lors de l\'ajout. Vérifiez les champs (nom et dates obligatoires).')
    } finally {
      setAjoutSubmitting(false)
    }
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Liste d'attente</h1>
        <button
          onClick={() => setShowAjout(true)}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Ajouter à la liste d'attente
        </button>
      </div>

      {message && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{message}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-3 rounded bg-white p-4 shadow">
        <input
          type="text"
          placeholder="Nom, Email ou téléphone"
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
        <button onClick={effacerFiltres} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
          Effacer
        </button>
      </div>

      <div className="overflow-hidden rounded bg-white shadow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-100 text-left text-sm">
              <th className="p-3">Type bateau</th>
              <th className="p-3">Longueur</th>
              <th className="p-3">Client</th>
              <th className="p-3">Type réservation</th>
              <th className="p-3">Arrivée</th>
              <th className="p-3">Départ</th>
              <th className="p-3">Créée le</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {attentesFiltrees.map((a) => (
              <Fragment key={a.id}>
                <tr className="border-b text-sm hover:bg-gray-50">
                  <td className="p-3">{a.type_bateau || '-'}</td>
                  <td className="p-3">{a.longueur}'</td>
                  <td className="p-3">{a.nom_prenom}</td>
                  <td className="p-3">Escale</td>
                  <td className="p-3">{new Date(a.date_arrivee).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">{new Date(a.date_depart).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">{new Date(a.date_creation).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    <button
                      onClick={() => ouvrirDetail(a)}
                      className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                    >
                      {expandedId === a.id ? 'Fermer' : 'Consulter'}
                    </button>
                  </td>
                </tr>
                {expandedId === a.id && (
                  <tr>
                    <td colSpan={8} className="bg-gray-50 p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Contact</p>
                          <p>{a.nom_prenom}</p>
                          <p>{a.email}</p>
                          <p>{a.telephone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bateau</p>
                          <p>Type : {a.type_bateau || '-'}</p>
                          <p>Longueur : {a.longueur}' — Largeur : {a.largeur}'</p>
                        </div>
                      </div>
                      {a.requete_speciale && (
                        <p className="mt-2 text-sm text-gray-600">Requête : {a.requete_speciale}</p>
                      )}

                      <div className="mt-3">
                        {!a.client ? (
                          <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-2">
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
                          className="mt-2 text-sm text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {attentesFiltrees.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">Aucune demande en attente.</p>
        )}
      </div>

      {showAjout && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Ajout à la liste d'attente</h2>

            {ajoutMessage && (
              <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{ajoutMessage}</p>
            )}

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nom et prénom"
                value={ajoutForm.nom_prenom}
                onChange={(e) => setAjoutForm({ ...ajoutForm, nom_prenom: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={ajoutForm.email}
                  onChange={(e) => setAjoutForm({ ...ajoutForm, email: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Téléphone"
                  value={ajoutForm.telephone}
                  onChange={(e) => setAjoutForm({ ...ajoutForm, telephone: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Longueur"
                  value={ajoutForm.longueur}
                  onChange={(e) => setAjoutForm({ ...ajoutForm, longueur: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Largeur"
                  value={ajoutForm.largeur}
                  onChange={(e) => setAjoutForm({ ...ajoutForm, largeur: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Type bateau"
                  value={ajoutForm.type_bateau}
                  onChange={(e) => setAjoutForm({ ...ajoutForm, type_bateau: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Arrivée</label>
                  <input
                    type="date"
                    value={ajoutForm.date_arrivee}
                    onChange={(e) => setAjoutForm({ ...ajoutForm, date_arrivee: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Départ</label>
                  <input
                    type="date"
                    value={ajoutForm.date_depart}
                    onChange={(e) => setAjoutForm({ ...ajoutForm, date_depart: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <textarea
                placeholder="Requête spéciale"
                value={ajoutForm.requete_speciale}
                onChange={(e) => setAjoutForm({ ...ajoutForm, requete_speciale: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2"
                rows={2}
              />
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAjout(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={soumettreAjout}
                disabled={ajoutSubmitting || !ajoutForm.nom_prenom || !ajoutForm.date_arrivee || !ajoutForm.date_depart}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ajoutSubmitting ? 'Ajout...' : "Ajouter à la liste d'attente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}