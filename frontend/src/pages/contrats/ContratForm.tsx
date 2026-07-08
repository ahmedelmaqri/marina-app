import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../../api/axios'

interface Client {
  id: number
  type_client: string
  nom_prenom?: string
  raison_sociale?: string
  email?: string
  telephone?: string
}

interface Bateau {
  id: number
  client: number
  nom_navire: string
  longueur: string
  largeur: string
}

interface Document {
  id: number
  nom: string
}

interface GroupeContrat {
  id: number
  nom: string
  date_debut: string
  date_fin: string
  documents: number[]
  tarif: string | null
  taxe: string | null
  structure_tarifaire: string
  frais_remises: { id: number; categorie: string; nom: string; prix: string }[]
}

function calculerDuree(dateDebut: string, dateFin: string) {
  const diff = (new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(diff, 1)
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

function calculerPrixGroupe(groupe: GroupeContrat | null) {
  if (!groupe || !groupe.tarif) return { miseAQuai: 0, fraisMarina: 0, taxes: 0, total: 0 }

  const duree = calculerDuree(groupe.date_debut, groupe.date_fin)
  const tarifBase = Number(groupe.tarif)
  let sousTotal = tarifBase

  if (groupe.structure_tarifaire === 'journaliere') sousTotal = tarifBase * duree
  else if (groupe.structure_tarifaire === 'mensuelle') sousTotal = tarifBase * (duree / 30)
  else if (groupe.structure_tarifaire === 'annuelle') sousTotal = tarifBase * (duree / 365)

  const fraisMarina = (groupe.frais_remises || [])
    .filter((f) => f.categorie === 'frais')
    .reduce((acc, f) => acc + Number(f.prix), 0)

  const remises = (groupe.frais_remises || [])
    .filter((f) => f.categorie === 'remise')
    .reduce((acc, f) => acc + Number(f.prix), 0)

  const taxePct = Number(groupe.taxe) || 0
  const baseAvecFrais = sousTotal + fraisMarina - remises
  const taxes = round((baseAvecFrais * taxePct) / 100)
  const total = round(baseAvecFrais + taxes)

  return { miseAQuai: round(sousTotal), fraisMarina: round(fraisMarina), taxes, total }
}

export default function ContratForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupeIdParam = searchParams.get('groupe')

  const [groupe, setGroupe] = useState<GroupeContrat | null>(null)
  const [documentsDetails, setDocumentsDetails] = useState<Document[]>([])
  const [subStep, setSubStep] = useState<'contact' | 'bateau'>('contact')

  // Contact
  const [clients, setClients] = useState<Client[]>([])
  const [recherche, setRecherche] = useState('')
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null)
  const [nouveauClient, setNouveauClient] = useState({
    type_client: 'physique' as 'physique' | 'morale',
    nom_prenom: '',
    email: '',
    telephone: '',
  })

  // Bateau
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [bateauSelectionneId, setBateauSelectionneId] = useState('')
  const [nouveauBateau, setNouveauBateau] = useState({
    nom_navire: '',
    type_bateau: '',
    modele: '',
    longueur: '',
    largeur: '',
    tirant_eau: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Liste d'attente
  const [showListeAttente, setShowListeAttente] = useState(false)
  const [attenteSubmitting, setAttenteSubmitting] = useState(false)
  const [attenteMessage, setAttenteMessage] = useState('')

  useEffect(() => {
    if (!groupeIdParam) {
      setError('Aucun groupe de contrat sélectionné.')
      return
    }
    api.get(`/groupes-contrats/${groupeIdParam}/`).then((res) => setGroupe(res.data))
    api.get('/clients/').then((res) => setClients(res.data))
  }, [groupeIdParam])

  useEffect(() => {
    if (groupe && groupe.documents.length > 0) {
      api.get('/documents/').then((res) =>
        setDocumentsDetails(res.data.filter((d: Document) => groupe.documents.includes(d.id)))
      )
    }
  }, [groupe])

  useEffect(() => {
    if (clientSelectionne) {
      api.get('/bateaux/').then((res) =>
        setBateaux(res.data.filter((b: Bateau) => b.client === clientSelectionne.id))
      )
    }
  }, [clientSelectionne])

  const clientsFiltres = clients.filter((c) => {
    if (!recherche) return false
    const q = recherche.toLowerCase()
    return (
      (c.nom_prenom || '').toLowerCase().includes(q) ||
      (c.raison_sociale || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.telephone || '').includes(q)
    )
  })

  const prix = calculerPrixGroupe(groupe)

  const passerAuBateau = async () => {
    setError('')
    if (clientSelectionne) {
      setSubStep('bateau')
      return
    }
    if (!nouveauClient.nom_prenom || !nouveauClient.email || !nouveauClient.telephone) {
      setError('Renseignez le nom, l\'email et le téléphone du nouveau client.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/clients/', {
        type_client: nouveauClient.type_client,
        nom_prenom: nouveauClient.nom_prenom,
        email: nouveauClient.email,
        telephone: nouveauClient.telephone,
      })
      setClientSelectionne(data)
      setSubStep('bateau')
    } catch {
      setError('Erreur lors de la création du client.')
    } finally {
      setLoading(false)
    }
  }

  const enregistrerContrat = async () => {
    setError('')
    if (!clientSelectionne) {
      setError('Aucun client sélectionné.')
      return
    }
    if (!bateauSelectionneId && !nouveauBateau.nom_navire) {
      setError('Sélectionnez ou créez un bateau.')
      return
    }

    setLoading(true)
    try {
      let finalBateauId = bateauSelectionneId ? Number(bateauSelectionneId) : null

      if (!finalBateauId) {
        const { data } = await api.post('/bateaux/', {
          client: clientSelectionne.id,
          nom_navire: nouveauBateau.nom_navire,
          type_bateau: nouveauBateau.type_bateau,
          modele: nouveauBateau.modele,
          longueur: nouveauBateau.longueur || null,
          largeur: nouveauBateau.largeur || null,
          tirant_eau: nouveauBateau.tirant_eau || null,
        })
        finalBateauId = data.id
      }

      const { data: contrat } = await api.post('/contrats-reservations/', {
        client: clientSelectionne.id,
        bateau: finalBateauId,
        groupe_contrat: Number(groupeIdParam),
        date_arrivee: `${groupe?.date_debut}T00:00:00`,
        date_depart: `${groupe?.date_fin}T00:00:00`,
        prix_total: prix.total || null,
      })

      navigate(`/contrats/${contrat.id}`)
    } catch {
      setError('Erreur lors de la création du contrat. Vérifiez les champs.')
    } finally {
      setLoading(false)
    }
  }

  const soumettreListeAttente = async () => {
    if (!clientSelectionne) {
      setAttenteMessage('Sélectionnez ou créez un client avant.')
      return
    }
    setAttenteSubmitting(true)
    setAttenteMessage('')
    try {
      await api.post('/liste-attente/', {
        client: clientSelectionne.id,
        nom_prenom: clientSelectionne.nom_prenom || clientSelectionne.raison_sociale,
        email: clientSelectionne.email,
        telephone: clientSelectionne.telephone,
        longueur: nouveauBateau.longueur || '0',
        largeur: nouveauBateau.largeur || '0',
        type_bateau: nouveauBateau.type_bateau,
        date_arrivee: groupe?.date_debut,
        date_depart: groupe?.date_fin,
        requete_speciale: `Demande de contrat pour le groupe "${groupe?.nom}" — aucune place disponible.`,
      })
      setShowListeAttente(false)
      navigate('/liste-attente')
    } catch {
      setAttenteMessage("Erreur lors de l'ajout à la liste d'attente.")
    } finally {
      setAttenteSubmitting(false)
    }
  }

  if (!groupe) {
    return (
      <div>
        {error ? <p className="text-red-600">{error}</p> : <p>Chargement...</p>}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <div className="mb-4 text-sm text-gray-500">
          <Link to="/contrats" className="hover:underline">Contrats</Link>
          {' / '}
          <Link to={`/contrats/groupes/${groupeIdParam}`} className="hover:underline">{groupe.nom}</Link>
          {' / '}
          <span className="text-gray-700">Nouveau contrat</span>
        </div>
        <h1 className="mb-6 text-2xl font-bold">Nouveau contrat</h1>

        {error && (
          <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
        )}

        <div className="rounded bg-white p-6 shadow">
          {subStep === 'contact' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 font-semibold text-gray-800">Créer un nouveau client</h2>
                <div className="mb-3 flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={nouveauClient.type_client === 'physique'}
                      onChange={() => setNouveauClient({ ...nouveauClient, type_client: 'physique' })}
                    />
                    Personne physique
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={nouveauClient.type_client === 'morale'}
                      onChange={() => setNouveauClient({ ...nouveauClient, type_client: 'morale' })}
                    />
                    Personne morale
                  </label>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={nouveauClient.type_client === 'physique' ? 'Nom et prénom' : 'Raison sociale'}
                    value={nouveauClient.nom_prenom}
                    onChange={(e) => setNouveauClient({ ...nouveauClient, nom_prenom: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={nouveauClient.email}
                      onChange={(e) => setNouveauClient({ ...nouveauClient, email: e.target.value })}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Téléphone"
                      value={nouveauClient.telephone}
                      onChange={(e) => setNouveauClient({ ...nouveauClient, telephone: e.target.value })}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h2 className="mb-3 font-semibold text-gray-800">Rechercher client existant</h2>
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou téléphone"
                  value={recherche}
                  onChange={(e) => {
                    setRecherche(e.target.value)
                    setClientSelectionne(null)
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {recherche && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded border border-gray-200">
                    {clientsFiltres.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClientSelectionne(c)
                          setRecherche(c.nom_prenom || c.raison_sociale || '')
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          clientSelectionne?.id === c.id ? 'bg-blue-50 font-medium' : ''
                        }`}
                      >
                        {c.nom_prenom || c.raison_sociale} — {c.email}
                      </button>
                    ))}
                    {clientsFiltres.length === 0 && (
                      <p className="p-3 text-sm text-gray-400">Aucun client trouvé.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => navigate('/contrats')}
                  className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={passerAuBateau}
                  disabled={loading}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Continuer →'}
                </button>
              </div>
            </div>
          )}

          {subStep === 'bateau' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Client : <span className="font-medium text-gray-800">{clientSelectionne?.nom_prenom || clientSelectionne?.raison_sociale}</span>
              </p>

              {bateaux.length > 0 && (
                <div>
                  <h2 className="mb-2 font-semibold text-gray-800">Sélectionner bateau</h2>
                  <select
                    value={bateauSelectionneId}
                    onChange={(e) => setBateauSelectionneId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    {bateaux.map((b) => (
                      <option key={b.id} value={b.id}>{b.nom_navire}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t pt-4">
                <h2 className="mb-3 font-semibold text-gray-800">Créer bateau pour client</h2>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={nouveauBateau.nom_navire}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, nom_navire: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Type bateau"
                    value={nouveauBateau.type_bateau}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, type_bateau: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Modèle"
                    value={nouveauBateau.modele}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, modele: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Tirant d'eau"
                    value={nouveauBateau.tirant_eau}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, tirant_eau: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Longueur"
                    value={nouveauBateau.longueur}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, longueur: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Largeur"
                    value={nouveauBateau.largeur}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, largeur: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button onClick={() => setSubStep('contact')} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                  ← Retour
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={enregistrerContrat}
                    disabled={loading}
                    className="rounded bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer contrat'}
                  </button>
                  <button
                    onClick={() => setShowListeAttente(true)}
                    className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                  >
                    Ajouter à la liste d'attente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panneau latéral */}
      <div>
        <div className="rounded bg-white p-4 shadow">
          <p className="font-semibold text-gray-800">{groupe.nom}</p>
          <p className="mb-3 text-sm text-gray-500">
            {new Date(groupe.date_debut).toLocaleDateString('fr-FR')} - {new Date(groupe.date_fin).toLocaleDateString('fr-FR')}
          </p>

          <p className="mb-1 text-sm font-medium text-gray-700">Documents</p>
          <div className="mb-4 space-y-1">
            {documentsDetails.map((d) => (
              <p key={d.id} className="text-sm text-green-700">✓ {d.nom}</p>
            ))}
            {documentsDetails.length === 0 && (
              <p className="text-sm text-gray-400">Aucun document requis.</p>
            )}
          </div>

          {subStep === 'bateau' && groupe.tarif && (
            <div className="border-t pt-3 text-sm">
              <p className="mb-2 font-medium text-gray-700">Prix</p>
              <div className="flex justify-between text-gray-600">
                <span>Mise à quai</span>
                <span>{prix.miseAQuai.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frais marina</span>
                <span>{prix.fraisMarina.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxes</span>
                <span>{prix.taxes.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold text-gray-800">
                <span>Total</span>
                <span>{prix.total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showListeAttente && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Ajouter à la liste d'attente</h2>

            {attenteMessage && (
              <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{attenteMessage}</p>
            )}

            <p className="mb-4 text-sm text-gray-600">
              Le client <span className="font-medium">{clientSelectionne?.nom_prenom || clientSelectionne?.raison_sociale}</span> sera ajouté
              à la liste d'attente pour le groupe <span className="font-medium">{groupe.nom}</span>.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowListeAttente(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={soumettreListeAttente}
                disabled={attenteSubmitting}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {attenteSubmitting ? 'Ajout...' : "Ajouter à la liste d'attente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}