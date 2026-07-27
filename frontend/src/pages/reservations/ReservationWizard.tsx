import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

const STRUCTURES = [
  { value: 'journaliere', label: 'Journalière' },
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'annuelle', label: 'Annuelle' },
]

function calculerPrix(
  dateArrivee: string,
  dateDepart: string,
  tarifBase: number,
  structure: string,
  taxe: number
): number {
  if (!dateArrivee || !dateDepart || !tarifBase) return 0
  const duree = Math.max(
    (new Date(dateDepart).getTime() - new Date(dateArrivee).getTime()) / (1000 * 60 * 60 * 24),
    1
  )
  let sousTotal = tarifBase
  if (structure === 'journaliere') sousTotal = tarifBase * duree
  else if (structure === 'mensuelle') sousTotal = tarifBase * (duree / 30)
  else if (structure === 'annuelle') sousTotal = tarifBase * (duree / 365)
  return Math.round((sousTotal + (sousTotal * taxe) / 100) * 100) / 100
}

export default function ReservationWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdParam = searchParams.get('client')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Étape 1 : disponibilité + tarification
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [longueur, setLongueur] = useState('')
  const [largeur, setLargeur] = useState('')
  const [grilles, setGrilles] = useState<GrilleTarifaire[]>([])
  const [grilleId, setGrilleId] = useState('')
  const [placesDisponibles, setPlacesDisponibles] = useState<PlaceDisponible[] | null>(null)
  const [checkingDispo, setCheckingDispo] = useState(false)

  const [tarifPersonnalise, setTarifPersonnalise] = useState(false)
  const [tarifPerso, setTarifPerso] = useState('')
  const [structurePerso, setStructurePerso] = useState('journaliere')
  const [taxePerso, setTaxePerso] = useState('0')

  const [showListeAttente, setShowListeAttente] = useState(false)
  const [attenteForm, setAttenteForm] = useState({ nom_prenom: '', email: '', telephone: '', type_bateau: '', requete_speciale: '' })
  const [attenteSubmitting, setAttenteSubmitting] = useState(false)
  const [attenteMessage, setAttenteMessage] = useState('')

  // Étape 2 : contact
  const [clients, setClients] = useState<Client[]>([])
  const [clientMode, setClientMode] = useState<'existant' | 'nouveau'>('existant')
  const [clientId, setClientId] = useState(clientIdParam || '')
  const [nouveauClient, setNouveauClient] = useState({ nom_prenom: '', email: '', telephone: '' })

  // Étape 3 : bateau
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [bateauMode, setBateauMode] = useState<'existant' | 'nouveau'>('existant')
  const [bateauId, setBateauId] = useState('')
  const [nouveauBateau, setNouveauBateau] = useState({
    nom_navire: '', type_bateau: '', modele: '', port_attache: '',
    numero_immatriculation: '', assurance: '', numero_police: '', echeance_assurance: '', tirant_eau: '',
  })

  // Étape 4 : finalisation
  const [electriciteEau, setElectriciteEau] = useState('aucun')
  const [cycleFacturation, setCycleFacturation] = useState('')
  const [methodePaiement, setMethodePaiement] = useState('espece')
  const [note, setNote] = useState('')

  useEffect(() => {
    api.get('/grilles-tarifaires/').then((res) => setGrilles(res.data))
    api.get('/clients/').then((res) => setClients(res.data))
  }, [])
  useEffect(() => {
  if (clientIdParam) {
    setClientMode('existant')
    setClientId(clientIdParam)
    setStep(1) // reste à l'étape 1, le client est déjà pré-rempli pour l'étape 2
  }
}, [clientIdParam])
  useEffect(() => {
    if (clientMode === 'existant' && clientId) {
      api.get('/bateaux/').then((res) =>
        setBateaux(res.data.filter((b: Bateau) => b.client === Number(clientId)))
      )
    }
  }, [clientId, clientMode])

  const grilleSelectionnee = grilles.find((g) => String(g.id) === grilleId)

  const prixEstime = tarifPersonnalise
    ? calculerPrix(dateArrivee, dateDepart, Number(tarifPerso) || 0, structurePerso, Number(taxePerso) || 0)
    : grilleSelectionnee
      ? calculerPrix(dateArrivee, dateDepart, Number(grilleSelectionnee.tarif_base), grilleSelectionnee.structure_tarifaire, Number(grilleSelectionnee.taxe) || 0)
      : 0

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

  const soumettreListeAttente = async () => {
    setAttenteSubmitting(true)
    setAttenteMessage('')
    try {
      await api.post('/liste-attente/', {
        nom_prenom: attenteForm.nom_prenom,
        email: attenteForm.email,
        telephone: attenteForm.telephone,
        longueur: longueur || '0',
        largeur: largeur || '0',
        type_bateau: attenteForm.type_bateau,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
        requete_speciale: attenteForm.requete_speciale,
      })
      setShowListeAttente(false)
      navigate('/liste-attente')
    } catch {
      setAttenteMessage("Erreur lors de l'ajout à la liste d'attente. Vérifiez les champs (dates et nom obligatoires).")
    } finally {
      setAttenteSubmitting(false)
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
          modele: nouveauBateau.modele,
          port_attache: nouveauBateau.port_attache,
          numero_immatriculation: nouveauBateau.numero_immatriculation,
          assurance: nouveauBateau.assurance,
          numero_police: nouveauBateau.numero_police,
          echeance_assurance: nouveauBateau.echeance_assurance || null,
          longueur,
          largeur,
          tirant_eau: nouveauBateau.tirant_eau || null,
        })
        finalBateauId = data.id
      }

      const payload: Record<string, unknown> = {
        client: finalClientId,
        bateau: finalBateauId,
        date_arrivee: `${dateArrivee}T00:00:00`,
        date_depart: `${dateDepart}T00:00:00`,
        longueur,
        largeur,
        statut: 'confirmee',
        electricite_eau: electriciteEau,
        methode_paiement: methodePaiement,
        note,
      }

      if (tarifPersonnalise) {
        payload.prix_total = prixEstime
      } else if (grilleId) {
        payload.grille_tarifaire = Number(grilleId)
      }

      const { data } = await api.post('/escales/', payload)
      navigate(`/reservations/${data.id}`)
    } catch {
      setError('Erreur lors de la création de la réservation. Vérifiez les champs.')
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">1. Vérification de la disponibilité</h2>
              <a
                href="/quais/configuration"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Configurer disponibilité →
              </a>
            </div>

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

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Grille tarifaire</label>
              <button
                type="button"
                onClick={() => setTarifPersonnalise(!tarifPersonnalise)}
                className="text-xs text-blue-600 hover:underline"
              >
                {tarifPersonnalise ? '← Utiliser une grille existante' : 'Entrer un tarif personnalisé'}
              </button>
            </div>

            {!tarifPersonnalise ? (
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
            ) : (
              <div className="space-y-2 rounded border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-800">Paramètres de tarif personnalisé</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Tarif"
                    value={tarifPerso}
                    onChange={(e) => setTarifPerso(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <select
                    value={structurePerso}
                    onChange={(e) => setStructurePerso(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {STRUCTURES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Taxe %"
                    value={taxePerso}
                    onChange={(e) => setTaxePerso(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            )}

            {(grilleId || tarifPersonnalise) && dateArrivee && dateDepart && (
              <p className="text-sm text-gray-600">
                Estimation prix : <span className="font-semibold">{prixEstime.toFixed(2)} MAD</span>
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={verifierDisponibilite}
                disabled={!dateArrivee || !dateDepart || checkingDispo}
                className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {checkingDispo ? 'Vérification...' : 'Vérifier la disponibilité'}
              </button>
              <button
                onClick={() => setShowListeAttente(true)}
                className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Ajouter à la liste d'attente
              </button>
            </div>

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
                  <p className="mt-2 text-sm text-yellow-700">
                    Aucune place disponible. Utilisez le bouton "Ajouter à la liste d'attente" ci-dessus.
                  </p>
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

            {placesDisponibles === null && (
              <button
                onClick={() => setStep(2)}
                disabled={!dateArrivee || !dateDepart}
                className="rounded bg-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-400 disabled:opacity-50"
              >
                Continuer sans vérifier →
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">2. Sélectionner le contact</h2>
            {clientIdParam && (
  <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
    Client pré-sélectionné depuis la fiche contact.
  </p>
)}
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
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom du bateau"
                    value={nouveauBateau.nom_navire}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, nom_navire: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Type de bateau"
                    value={nouveauBateau.type_bateau}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, type_bateau: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Modèle"
                    value={nouveauBateau.modele}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, modele: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Port d'attache"
                    value={nouveauBateau.port_attache}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, port_attache: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="N° Immatriculation"
                    value={nouveauBateau.numero_immatriculation}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, numero_immatriculation: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Tirant d'eau (m)"
                    value={nouveauBateau.tirant_eau}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, tirant_eau: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Assurance"
                    value={nouveauBateau.assurance}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, assurance: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="N° de police"
                    value={nouveauBateau.numero_police}
                    onChange={(e) => setNouveauBateau({ ...nouveauBateau, numero_police: e.target.value })}
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-gray-500">Échéance assurance</label>
                    <input
                      type="date"
                      value={nouveauBateau.echeance_assurance}
                      onChange={(e) => setNouveauBateau({ ...nouveauBateau, echeance_assurance: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Longueur/largeur reprises de l'étape 1 ({longueur || '?'}m x {largeur || '?'}m).
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
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <h2 className="font-semibold">4. Finalisation</h2>

              <div className="rounded border border-gray-200 p-3 text-sm text-gray-600">
                <p className="mb-1 font-medium text-gray-800">Passage</p>
                <p>{new Date(dateArrivee).toLocaleDateString('fr-FR')} → {new Date(dateDepart).toLocaleDateString('fr-FR')}</p>
                <p>{longueur || '?'}m x {largeur || '?'}m</p>
              </div>

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
                <label className="mb-1 block text-sm font-medium text-gray-700">Requête spéciale</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="rounded border border-gray-200 p-3">
                <p className="mb-2 text-sm font-medium text-gray-800">Paiement</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Cycle de facturation"
                    value={cycleFacturation}
                    onChange={(e) => setCycleFacturation(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={methodePaiement}
                    onChange={(e) => setMethodePaiement(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="carte">Carte bancaire</option>
                    <option value="espece">Espèce</option>
                    <option value="virement">Virement</option>
                    <option value="cheque">Chèque</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(3)} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                  ← Retour
                </button>
              </div>
            </div>

            <div>
              <div className="rounded border border-gray-200 p-4">
                <p className="mb-2 text-sm font-medium text-gray-800">Prix</p>
                <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                  <span>Total estimé</span>
                  <span>{prixEstime.toFixed(2)} MAD</span>
                </div>
                {!tarifPersonnalise && !grilleId && (
                  <p className="mt-1 text-xs text-gray-400">Aucune grille tarifaire sélectionnée.</p>
                )}
              </div>

              <button
                onClick={handleFinaliser}
                disabled={submitting}
                className="mt-4 w-full rounded bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Création...' : 'Créer la réservation'}
              </button>

              <p className="mt-3 text-xs text-gray-400">
                Les remises et charges pourront être ajoutées juste après, depuis la page de détail de la réservation.
              </p>
            </div>
          </div>
        )}
      </div>

      {showListeAttente && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Ajout à la liste d'attente</h2>

            {attenteMessage && (
              <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{attenteMessage}</p>
            )}

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nom et prénom"
                value={attenteForm.nom_prenom}
                onChange={(e) => setAttenteForm({ ...attenteForm, nom_prenom: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={attenteForm.email}
                  onChange={(e) => setAttenteForm({ ...attenteForm, email: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Téléphone"
                  value={attenteForm.telephone}
                  onChange={(e) => setAttenteForm({ ...attenteForm, telephone: e.target.value })}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <input
                type="text"
                placeholder="Type de bateau"
                value={attenteForm.type_bateau}
                onChange={(e) => setAttenteForm({ ...attenteForm, type_bateau: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-gray-500">Dimensions et dates du séjour</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Longueur (m)"
                  value={longueur}
                  onChange={(e) => setLongueur(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Largeur (m)"
                  value={largeur}
                  onChange={(e) => setLargeur(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={dateArrivee}
                  onChange={(e) => setDateArrivee(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <input
                  type="date"
                  value={dateDepart}
                  onChange={(e) => setDateDepart(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <textarea
                placeholder="Requête spéciale"
                value={attenteForm.requete_speciale}
                onChange={(e) => setAttenteForm({ ...attenteForm, requete_speciale: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2"
                rows={2}
              />
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowListeAttente(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={soumettreListeAttente}
                disabled={attenteSubmitting || !attenteForm.nom_prenom || !dateArrivee || !dateDepart}
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