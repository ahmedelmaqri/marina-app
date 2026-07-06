import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Client {
  id: number
  type_client: string
  nom_prenom?: string
  raison_sociale?: string
}

interface Bateau {
  id: number
  client: number
  nom_navire: string
  longueur: string
  largeur: string
}

interface GrilleTarifaire {
  id: number
  nom: string
  structure_tarifaire: string
  tarif_base: string
  taxe: string | null
}

interface PlaceDisponible {
  id: number
  nom: string
  type_place: string
  groupe_de_places: string | null
}

export default function ReservationWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Étape 1 : disponibilité
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [longueur, setLongueur] = useState('')
  const [largeur, setLargeur] = useState('')
  const [grilles, setGrilles] = useState<GrilleTarifaire[]>([])
  const [grilleId, setGrilleId] = useState('')
  const [placesDisponibles, setPlacesDisponibles] = useState<PlaceDisponible[] | null>(null)
  const [checkingDispo, setCheckingDispo] = useState(false)

  // Étape 2 : contact
  const [clients, setClients] = useState<Client[]>([])
  const [clientMode, setClientMode] = useState<'existant' | 'nouveau'>('existant')
  const [clientId, setClientId] = useState('')
  const [nouveauClient, setNouveauClient] = useState({ nom_prenom: '', email: '', telephone: '' })

  // Étape 3 : bateau
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [bateauMode, setBateauMode] = useState<'existant' | 'nouveau'>('existant')
  const [bateauId, setBateauId] = useState('')
  const [nouveauBateau, setNouveauBateau] = useState({
    nom_navire: '', type_bateau: '', port_attache: '',
  })

  // Étape 4 : finalisation
  const [electriciteEau, setElectriciteEau] = useState('aucun')
  const [methodePaiement, setMethodePaiement] = useState('espece')
  const [note, setNote] = useState('')

  useEffect(() => {
    api.get('/grilles-tarifaires/').then((res) => setGrilles(res.data))
    api.get('/clients/').then((res) => setClients(res.data))
  }, [])

  useEffect(() => {
    if (clientMode === 'existant' && clientId) {
      api.get('/bateaux/').then((res) =>
        setBateaux(res.data.filter((b: Bateau) => b.client === Number(clientId)))
      )
    }
  }, [clientId, clientMode])

  const verifierDisponibilite = async () => {
    setError('')
    setCheckingDispo(true)
    try {
      const { data } = await api.get('/disponibilite/', {
        params: { date_arrivee: dateArrivee, date_depart: dateDepart },
      })
      setPlacesDisponibles(data.places_disponibles)
    } catch {
      setError('Impossible de vérifier la disponibilité.')
    } finally {
      setCheckingDispo(false)
    }
  }

  const groupesDisponibles = (placesDisponibles || []).reduce((acc: Record<string, number>, p) => {
    const key = p.groupe_de_places || 'Sans groupe'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const ajouterListeAttente = async () => {
    if (clientMode !== 'nouveau' && !clientId) {
      setError('Sélectionnez ou créez un client avant de continuer.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/liste-attente/', {
        client: clientMode === 'existant' ? Number(clientId) : null,
        nom_prenom: clientMode === 'nouveau' ? nouveauClient.nom_prenom : clients.find((c) => c.id === Number(clientId))?.nom_prenom || '',
        email: clientMode === 'nouveau' ? nouveauClient.email : '',
        telephone: clientMode === 'nouveau' ? nouveauClient.telephone : '',
        longueur,
        largeur,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
      })
      navigate('/reservations')
    } catch {
      setError("Erreur lors de l'ajout à la liste d'attente.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinaliser = async () => {
    setError('')
    setSubmitting(true)
    try {
      let finalClientId = Number(clientId)
      if (clientMode === 'nouveau') {
        const { data } = await api.post('/clients/', {
          type_client: 'physique',
          nom_prenom: nouveauClient.nom_prenom,
          email: nouveauClient.email,
          telephone: nouveauClient.telephone,
        })
        finalClientId = data.id
      }

      let finalBateauId = Number(bateauId)
      if (bateauMode === 'nouveau') {
        const { data } = await api.post('/bateaux/', {
          client: finalClientId,
          nom_navire: nouveauBateau.nom_navire,
          type_bateau: nouveauBateau.type_bateau,
          port_attache: nouveauBateau.port_attache,
          longueur,
          largeur,
        })
        finalBateauId = data.id
      }

      await api.post('/escales/', {
        client: finalClientId,
        bateau: finalBateauId,
        grille_tarifaire: grilleId ? Number(grilleId) : null,
        date_arrivee: `${dateArrivee}T00:00:00`,
        date_depart: `${dateDepart}T00:00:00`,
        longueur,
        largeur,
        statut: 'confirmee',
        electricite_eau: electriciteEau,
        methode_paiement: methodePaiement,
        note,
      })

      navigate('/reservations')
    } catch {
      setError("Erreur lors de la création de la réservation. Vérifiez les champs.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Nouvelle réservation</h1>
      <p className="mb-6 text-sm text-gray-500">Étape {step} sur 4</p>

      {error && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded bg-white p-6 shadow">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">1. Vérification de la disponibilité</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date d'arrivée</label>
                <input
                  type="date"
                  value={dateArrivee}
                  onChange={(e) => setDateArrivee(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date de départ</label>
                <input
                  type="date"
                  value={dateDepart}
                  onChange={(e) => setDateDepart(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Longueur (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={longueur}
                  onChange={(e) => setLongueur(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Largeur (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={largeur}
                  onChange={(e) => setLargeur(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Grille tarifaire</label>
              <select
                value={grilleId}
                onChange={(e) => setGrilleId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">-- Aucune --</option>
                {grilles.map((g) => (
                  <option key={g.id} value={g.id}>{g.nom} ({g.tarif_base} MAD)</option>
                ))}
              </select>
            </div>

            <button
              onClick={verifierDisponibilite}
              disabled={!dateArrivee || !dateDepart || checkingDispo}
              className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {checkingDispo ? 'Vérification...' : 'Vérifier la disponibilité'}
            </button>

            {placesDisponibles !== null && (
              <div className="mt-4 rounded border border-gray-200 p-4">
                <p className="mb-2 text-sm font-medium">
                  {placesDisponibles.length} place(s) disponible(s)
                </p>
                {Object.entries(groupesDisponibles).map(([groupe, count]) => (
                  <p key={groupe} className="text-sm text-gray-600">
                    {groupe} : {count} place(s)
                  </p>
                ))}

                {placesDisponibles.length === 0 ? (
                  <div className="mt-3 rounded bg-yellow-50 p-3">
                    <p className="mb-2 text-sm text-yellow-800">
                      Aucune place disponible. Vous pouvez ajouter cette demande à la liste d'attente.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Continuer →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">2. Sélectionner le contact</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={clientMode === 'existant'} onChange={() => setClientMode('existant')} />
                Client existant
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={clientMode === 'nouveau'} onChange={() => setClientMode('nouveau')} />
                Nouveau client
              </label>
            </div>

            {clientMode === 'existant' ? (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">-- Sélectionner --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom_prenom || c.raison_sociale}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nom et prénom"
                  value={nouveauClient.nom_prenom}
                  onChange={(e) => setNouveauClient({ ...nouveauClient, nom_prenom: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={nouveauClient.email}
                  onChange={(e) => setNouveauClient({ ...nouveauClient, email: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Téléphone"
                  value={nouveauClient.telephone}
                  onChange={(e) => setNouveauClient({ ...nouveauClient, telephone: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                ← Retour
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={clientMode === 'existant' ? !clientId : !nouveauClient.nom_prenom}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">3. Sélectionner un bateau</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={bateauMode === 'existant'}
                  onChange={() => setBateauMode('existant')}
                  disabled={clientMode === 'nouveau'}
                />
                Bateau existant
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={bateauMode === 'nouveau'} onChange={() => setBateauMode('nouveau')} />
                Nouveau bateau
              </label>
            </div>

            {bateauMode === 'existant' ? (
              <select
                value={bateauId}
                onChange={(e) => setBateauId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">-- Sélectionner --</option>
                {bateaux.map((b) => (
                  <option key={b.id} value={b.id}>{b.nom_navire}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nom du bateau"
                  value={nouveauBateau.nom_navire}
                  onChange={(e) => setNouveauBateau({ ...nouveauBateau, nom_navire: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Type de bateau"
                  value={nouveauBateau.type_bateau}
                  onChange={(e) => setNouveauBateau({ ...nouveauBateau, type_bateau: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Port d'attache"
                  value={nouveauBateau.port_attache}
                  onChange={(e) => setNouveauBateau({ ...nouveauBateau, port_attache: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <p className="text-xs text-gray-500">
                  Longueur/largeur reprises de l'étape 1 ({longueur}m x {largeur}m).
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                ← Retour
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={bateauMode === 'existant' ? !bateauId : !nouveauBateau.nom_navire}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold">4. Finalisation</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Eau / Électricité</label>
              <select
                value={electriciteEau}
                onChange={(e) => setElectriciteEau(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="aucun">Aucun</option>
                <option value="eau">Eau</option>
                <option value="electricite">Électricité</option>
                <option value="eau_electricite">Eau et Électricité</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Méthode de paiement</label>
              <select
                value={methodePaiement}
                onChange={(e) => setMethodePaiement(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="carte">Carte bancaire</option>
                <option value="espece">Espèce</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Requête spéciale</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(3)} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                ← Retour
              </button>
              <button
                onClick={handleFinaliser}
                disabled={submitting}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Création...' : 'Créer la réservation'}
              </button>
            </div>
          </div>
        )}

        {placesDisponibles !== null && placesDisponibles.length === 0 && step === 1 && (
          <button
            onClick={ajouterListeAttente}
            disabled={submitting}
            className="mt-3 rounded bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {submitting ? 'Ajout...' : "Ajouter à la liste d'attente"}
          </button>
        )}
      </div>
    </div>
  )
}