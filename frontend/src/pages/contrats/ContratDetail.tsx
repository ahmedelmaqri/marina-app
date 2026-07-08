import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Contrat {
  id: number
  code?: string
  client: number
  bateau: number
  groupe_contrat: number
  date_arrivee: string
  date_depart: string
  prix_total: string | null
  statut: string
  statut_signature: string
  note: string
  date_envoi: string | null
  date_signature: string | null
  date_creation?: string
}

interface Client {
  id: number
  nom_prenom?: string
  raison_sociale?: string
  email?: string
  telephone?: string
}

interface Bateau {
  id: number
  nom_navire: string
  type_bateau?: string
  modele?: string
  longueur?: string
  largeur?: string
  tirant_eau?: string
  assurance?: string
  numero_police?: string
  echeance_assurance?: string
  port_attache?: string
}

interface GroupeContrat {
  id: number
  nom: string
  documents: number[]
}

interface DocumentItem {
  id: number
  nom: string
  fichier: string
}

interface Charge {
  id: number
  reservation: number
  article: number
  quantite: number
  montant: string
}

interface Remise {
  id: number
  reservation: number
  montant: string
  unite: string
  raison: string
}

interface Affectation {
  id: number
  reservation: number
  place: number
  date: string
  statut: string
}

interface Place {
  id: number
  nom: string
}

interface Paiement {
  id: number
  reservation: number
  type_paiement: string
  date_echeance: string
  date_traitement: string | null
  methode: string
  montant: string
}

const SIGNATURE_LABELS: Record<string, string> = {
  a_envoyer: 'À envoyer',
  envoye: 'Envoyé',
  signe: 'Signé',
  archive: 'Archivé',
  resilie: 'Résilié',
}

const SIGNATURE_STYLES: Record<string, string> = {
  a_envoyer: 'bg-green-100 text-green-800',
  envoye: 'bg-blue-100 text-blue-800',
  signe: 'bg-emerald-100 text-emerald-800',
  archive: 'bg-gray-200 text-gray-800',
  resilie: 'bg-red-100 text-red-800',
}

const PAIEMENT_TYPE_LABELS: Record<string, string> = {
  a_regler: 'À régler',
  regle: 'Réglé',
  rembourse: 'Remboursé',
}

const METHODE_LABELS: Record<string, string> = {
  carte: 'Carte bancaire',
  espece: 'Espèce',
  virement: 'Virement',
  cheque: 'Chèque',
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateShort(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function ContratDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [contrat, setContrat] = useState<Contrat | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [bateau, setBateau] = useState<Bateau | null>(null)
  const [groupe, setGroupe] = useState<GroupeContrat | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [remises, setRemises] = useState<Remise[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const [reglantId, setReglantId] = useState<number | null>(null)
  const [showReglerForm, setShowReglerForm] = useState<number | null>(null)
  const [reglerMethode, setReglerMethode] = useState('carte')
  const [reglerDate, setReglerDate] = useState('')

  const [showModifier, setShowModifier] = useState(false)
  const [modifDateArrivee, setModifDateArrivee] = useState('')
  const [modifDateDepart, setModifDateDepart] = useState('')
  const [modifPrix, setModifPrix] = useState('')
  const [modifSubmitting, setModifSubmitting] = useState(false)
  const [modifMessage, setModifMessage] = useState('')

  const [articles, setArticles] = useState<{ id: number; nom: string; prix: string; taxe: string | null }[]>([])
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [articleId, setArticleId] = useState('')
  const [quantite, setQuantite] = useState('1')

  const [showRemiseForm, setShowRemiseForm] = useState(false)
  const [remiseAppliqueeMiseAQuai, setRemiseAppliqueeMiseAQuai] = useState(true)
  const [remiseAppliqueeElectricite, setRemiseAppliqueeElectricite] = useState(false)
  const [remiseMontant, setRemiseMontant] = useState('')
  const [remiseUnite, setRemiseUnite] = useState('pourcentage')
  const [remiseJoursGratuits, setRemiseJoursGratuits] = useState('')
  const [remiseRaison, setRemiseRaison] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/contrats-reservations/${id}/`).then((res) => {
      setContrat(res.data)
      setNote(res.data.note || '')
      api.get(`/clients/${res.data.client}/`).then((c) => setClient(c.data))
      api.get(`/bateaux/${res.data.bateau}/`).then((b) => setBateau(b.data))
      api.get(`/groupes-contrats/${res.data.groupe_contrat}/`).then((g) => {
        setGroupe(g.data)
        api.get('/documents/').then((docsRes) =>
          setDocuments(docsRes.data.filter((d: DocumentItem) => g.data.documents.includes(d.id)))
        )
      })
    })
    api.get('/charges/').then((res) =>
      setCharges(res.data.filter((c: Charge) => c.reservation === Number(id)))
    )
    api.get('/remises/').then((res) =>
      setRemises(res.data.filter((r: Remise) => r.reservation === Number(id)))
    )
    api.get('/affectations/').then((res) =>
      setAffectations(res.data.filter((a: Affectation) => a.reservation === Number(id)))
    )
    api.get('/places/').then((res) => setPlaces(res.data))
    api.get('/paiements/').then((res) =>
      setPaiements(res.data.filter((p: Paiement) => p.reservation === Number(id)))
    )
    api.get('/articles-charges/').then((res) => setArticles(res.data))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  const nomPlace = (placeId: number) => places.find((p) => p.id === placeId)?.nom || `Place #${placeId}`

  const dureeJours = contrat
    ? Math.max(
        1,
        Math.round(
          (new Date(contrat.date_depart).getTime() - new Date(contrat.date_arrivee).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0

  const runAction = async (endpoint: string, extraData: object = {}) => {
    setActionLoading(true)
    setMessage('')
    try {
      const { data } = await api.post(`/contrats-reservations/${id}/${endpoint}/`, extraData)
      setMessage(data.message)
      load()
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Erreur lors de l'action.")
    } finally {
      setActionLoading(false)
    }
  }

  const archiver = async () => {
    setActionLoading(true)
    try {
      await api.patch(`/contrats-reservations/${id}/`, { statut_signature: 'archive' })
      setMessage('Contrat archivé.')
      load()
    } catch {
      setMessage("Erreur lors de l'archivage.")
    } finally {
      setActionLoading(false)
    }
  }

  const resilier = () => {
    const frais = window.prompt('Frais à appliquer (0 si aucun) :', '0')
    if (frais === null) return
    runAction('resilier', { frais: Number(frais) || 0 })
  }

  const soumettreNote = async () => {
    setNoteSaving(true)
    try {
      await api.patch(`/contrats-reservations/${id}/`, { note })
    } catch {
      setMessage("Erreur lors de l'enregistrement de la note.")
    } finally {
      setNoteSaving(false)
    }
  }

  const ouvrirReglerForm = (paiementId: number) => {
    setReglerMethode('carte')
    setReglerDate(new Date().toISOString().slice(0, 10))
    setShowReglerForm(paiementId)
  }

  const handleReglerPaiement = async () => {
    if (!showReglerForm) return
    setReglantId(showReglerForm)
    try {
      await api.patch(`/paiements/${showReglerForm}/`, {
        type_paiement: 'regle',
        methode: reglerMethode,
        date_traitement: reglerDate,
      })
      setShowReglerForm(null)
      load()
    } catch {
      setMessage('Erreur lors du règlement du paiement.')
    } finally {
      setReglantId(null)
    }
  }

  const ouvrirModifier = () => {
    if (!contrat) return
    setModifDateArrivee(contrat.date_arrivee.slice(0, 10))
    setModifDateDepart(contrat.date_depart.slice(0, 10))
    setModifPrix(contrat.prix_total || '')
    setModifMessage('')
    setShowModifier(true)
  }

  const soumettreModification = async () => {
    setModifSubmitting(true)
    setModifMessage('')
    try {
      await api.patch(`/contrats-reservations/${id}/`, {
        date_arrivee: `${modifDateArrivee}T00:00:00`,
        date_depart: `${modifDateDepart}T00:00:00`,
        prix_total: modifPrix || null,
      })
      setShowModifier(false)
      load()
    } catch {
      setModifMessage("Erreur lors de la mise à jour. Vérifiez que la date de fin est postérieure à la date de début.")
    } finally {
      setModifSubmitting(false)
    }
  }

  const articleSelectionne = articles.find((a) => String(a.id) === articleId)

  const handleAjouterCharge = async () => {
    if (!articleId) return
    setActionLoading(true)
    try {
      await api.post('/charges/', {
        reservation: Number(id),
        article: Number(articleId),
        quantite: Number(quantite),
      })
      setShowChargeForm(false)
      setArticleId('')
      setQuantite('1')
      load()
    } catch {
      setMessage("Erreur lors de l'ajout de la charge.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleAjouterRemise = async () => {
    if (!remiseMontant) return
    if (!remiseAppliqueeMiseAQuai && !remiseAppliqueeElectricite) {
      setMessage("Cochez au moins une case : Frais de mise à quai ou Electricité et/ou eau.")
      return
    }
    setActionLoading(true)
    try {
      await api.post('/remises/', {
        reservation: Number(id),
        appliquee_mise_a_quai: remiseAppliqueeMiseAQuai,
        appliquee_electricite: remiseAppliqueeElectricite,
        montant: remiseMontant,
        unite: remiseUnite,
        jours_gratuits: remiseJoursGratuits || null,
        raison: remiseRaison,
      })
      setShowRemiseForm(false)
      setRemiseMontant('')
      setRemiseJoursGratuits('')
      setRemiseRaison('')
      setRemiseAppliqueeMiseAQuai(true)
      setRemiseAppliqueeElectricite(false)
      load()
    } catch {
      setMessage("Erreur lors de l'ajout de la remise.")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !contrat) return <p className="p-6 text-sm text-gray-500">Chargement...</p>

  const clientNom = client?.nom_prenom || client?.raison_sociale || '-'
  const totalCharges = charges.reduce((sum, c) => sum + parseFloat(c.montant || '0'), 0)

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 text-lg">
          <span className="font-bold">📅 Réservations</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">{contrat.code || `#${contrat.id}`}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            🖨 Imprimer
          </button>
          <button
            onClick={ouvrirModifier}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ✎ Modifier
          </button>
          {contrat.statut_signature === 'a_envoyer' && (
            <button
              onClick={archiver}
              disabled={actionLoading}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Archiver contrat
            </button>
          )}
          {contrat.statut_signature === 'signe' && (
            <button
              onClick={resilier}
              disabled={actionLoading}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Résilier contrat
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
      )}

      {/* Bandeau type */}
      <div className="mb-6 flex items-center gap-2 rounded border-l-4 border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900">
        🔄 Contrat
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">N° Réservation</p>
                <p className="text-xl font-bold">{contrat.code || `#${contrat.id}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500">Client</p>
                  <p className="font-medium">{clientNom}</p>
                  <p className="text-gray-500">{client?.email || ''}</p>
                  <p className="text-gray-500">{client?.telephone || ''}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500">Bateau</p>
                  <p className="font-medium">{bateau?.nom_navire || '-'}</p>
                  <p className="text-gray-500">{bateau?.longueur ? `${bateau.longueur}'` : ''}</p>
                  <p className="text-gray-500">{bateau?.type_bateau || ''}</p>
                </div>
              </div>
              <span
                className={`rounded px-4 py-2 text-sm font-bold ${SIGNATURE_STYLES[contrat.statut_signature] || 'bg-gray-100 text-gray-800'}`}
              >
                {SIGNATURE_LABELS[contrat.statut_signature] || contrat.statut_signature}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Créé le {formatDateShort(contrat.date_creation)}
              {contrat.date_signature && ` · Signé le ${formatDateShort(contrat.date_signature)}`}
            </p>

            <hr className="my-4" />

            <h2 className="mb-3 font-semibold">Dates</h2>
            <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Date début</p>
                <p className="font-medium">{formatDateLong(contrat.date_arrivee)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date fin</p>
                <p className="font-medium">{formatDateLong(contrat.date_depart)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Durée du séjour</p>
                <p className="font-medium">{dureeJours} nuit{dureeJours > 1 ? 's' : ''}</p>
              </div>
            </div>

            <hr className="my-4" />

            <h2 className="mb-3 font-semibold">Documents</h2>
            {documents.length === 0 && <p className="text-sm text-gray-400">Aucun document.</p>}
            {documents.map((d) => (
              <div
                key={d.id}
                className="mb-2 flex items-center justify-between rounded border border-gray-200 p-3"
              >
                <span className="flex items-center gap-2 text-sm">✔ {d.nom}</span>
                <a
                  href={d.fichier}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Voir contrat
                </a>
              </div>
            ))}

            <hr className="my-4" />

            <h2 className="mb-3 font-semibold">Bateau</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Nom du bateau</p>
                <p className="font-medium">{bateau?.nom_navire || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-medium">{bateau?.type_bateau || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Modèle</p>
                <p className="font-medium">{bateau?.modele || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assurance</p>
                <p className="font-medium">{bateau?.assurance || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">N° de police</p>
                <p className="font-medium">{bateau?.numero_police || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Échéance</p>
                <p className="font-medium">{bateau?.echeance_assurance || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Longueur</p>
                <p className="font-medium">{bateau?.longueur ? `${bateau.longueur}'` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Largeur</p>
                <p className="font-medium">{bateau?.largeur ? `${bateau.largeur}'` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tirant d'eau</p>
                <p className="font-medium">{bateau?.tirant_eau ? `${bateau.tirant_eau}'` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Port d'attache</p>
                <p className="font-medium">{bateau?.port_attache || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Actions du cycle de vie du contrat */}
          <div className="rounded bg-white p-6 shadow">
            <h2 className="mb-3 font-semibold">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {contrat.statut_signature === 'a_envoyer' && (
                <button
                  onClick={() => runAction('envoyer')}
                  disabled={actionLoading}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Envoyer au client
                </button>
              )}
              {contrat.statut_signature === 'envoye' && (
                <button
                  onClick={() => runAction('signer')}
                  disabled={actionLoading}
                  className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Marquer comme signé
                </button>
              )}
              {contrat.statut_signature === 'signe' && (
                <button
                  onClick={() => runAction('creer_avenant')}
                  disabled={actionLoading}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  Créer un avenant
                </button>
              )}
              {(contrat.statut_signature === 'signe' || contrat.statut_signature === 'envoye') && (
                <button
                  onClick={archiver}
                  disabled={actionLoading}
                  className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 disabled:opacity-50"
                >
                  Archiver
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Note */}
          <div className="rounded bg-white p-6 shadow">
            <h2 className="mb-2 font-semibold">Note réservation</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={soumettreNote}
              rows={4}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Aucune note pour l'instant..."
            />
            {noteSaving && <p className="mt-1 text-xs text-gray-400">Enregistrement...</p>}
          </div>

          {/* Tuiles Affectations / Charges / Remises */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded bg-white p-4 text-center shadow">
              <p className="mb-2 text-sm font-semibold">Affectations</p>
              <p className="mb-2 text-2xl font-bold">{affectations.length}</p>
              <button
                onClick={() => navigate(`/quais/affectations/${contrat.id}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Ajouter affectation
              </button>
            </div>
            <div className="rounded bg-white p-4 text-center shadow">
              <p className="mb-2 text-sm font-semibold">Charges</p>
              <p className="mb-2 text-2xl font-bold">{charges.length}</p>
              <button
                onClick={() => setShowChargeForm(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Ajouter item
              </button>
            </div>
            <div className="rounded bg-white p-4 text-center shadow">
              <p className="mb-2 text-sm font-semibold">Remises</p>
              <p className="mb-2 text-2xl font-bold">{remises.length}</p>
              <button
                onClick={() => setShowRemiseForm(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Appliquer remise
              </button>
            </div>
          </div>

          {affectations.length > 0 && (
            <div className="rounded bg-white p-4 shadow">
              <h3 className="mb-2 text-sm font-semibold">Détail des affectations</h3>
              {affectations.map((a) => (
                <p key={a.id} className="text-sm">
                  {nomPlace(a.place)} — {formatDateShort(a.date)} ({a.statut})
                </p>
              ))}
            </div>
          )}

          {/* Paiements programmés */}
          <div className="rounded bg-white p-4 shadow">
            <h3 className="mb-2 text-sm font-semibold">Paiements programmés</h3>
            {paiements.length === 0 && (
              <p className="text-sm text-gray-400">Aucun paiement programmé.</p>
            )}
            {paiements.length > 0 && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-1 font-medium">Type</th>
                    <th className="pb-1 font-medium">Échéance</th>
                    <th className="pb-1 font-medium">Traitement</th>
                    <th className="pb-1 font-medium">Méthode</th>
                    <th className="pb-1 text-right font-medium">Montant</th>
                    <th className="pb-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-1.5">{PAIEMENT_TYPE_LABELS[p.type_paiement] || p.type_paiement}</td>
                      <td className="py-1.5">{formatDateShort(p.date_echeance)}</td>
                      <td className="py-1.5">{formatDateShort(p.date_traitement)}</td>
                      <td className="py-1.5">{METHODE_LABELS[p.methode] || p.methode || '-'}</td>
                      <td className="py-1.5 text-right">{p.montant} MAD</td>
                      <td className="py-1.5 text-right">
                        {p.type_paiement === 'a_regler' && (
                          <button
                            onClick={() => ouvrirReglerForm(p.id)}
                            disabled={reglantId === p.id}
                            className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                          >
                            Régler
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={4} className="py-1.5">Montant payé</td>
                    <td className="py-1.5 text-right" colSpan={2}>
                      {paiements
                        .filter((p) => p.type_paiement === 'regle')
                        .reduce((s, p) => s + parseFloat(p.montant || '0'), 0)
                        .toFixed(2)}{' '}
                      MAD
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Tarif */}
          <div className="rounded bg-white p-4 shadow">
            <h3 className="mb-3 text-sm font-semibold">Tarif</h3>
            <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
              <span>Total</span>
              <span>{contrat.prix_total ? `${contrat.prix_total} MAD` : '-'}</span>
            </div>
            {totalCharges > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                dont {totalCharges.toFixed(2)} MAD de charges additionnelles
              </p>
            )}
          </div>

          {/* Remises détaillées */}
          {remises.length > 0 && (
            <div className="rounded bg-white p-4 shadow">
              <h3 className="mb-2 text-sm font-semibold">Remises</h3>
              {remises.map((r) => (
                <p key={r.id} className="text-sm text-green-700">
                  Remise — {r.montant}{r.unite === 'pourcentage' ? '%' : ' MAD'} ({r.raison})
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {showReglerForm !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Régler ce paiement</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Méthode</label>
                <select
                  value={reglerMethode}
                  onChange={(e) => setReglerMethode(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="carte">Carte bancaire</option>
                  <option value="espece">Espèce</option>
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Date de traitement</label>
                <input
                  type="date"
                  value={reglerDate}
                  onChange={(e) => setReglerDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReglerForm(null)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={handleReglerPaiement}
                disabled={reglantId !== null}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                Confirmer le règlement
              </button>
            </div>
          </div>
        </div>
      )}
      {showChargeForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Sélectionner un article</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Article</label>
                <select
                  value={articleId}
                  onChange={(e) => setArticleId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">-- Sélectionner un article --</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom} ({a.prix} MAD)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={quantite}
                    onChange={(e) => setQuantite(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Taxe</label>
                  <input
                    type="text"
                    disabled
                    value={articleSelectionne?.taxe ? `${articleSelectionne.taxe}%` : '-'}
                    className="w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Prix</label>
                  <input
                    type="text"
                    disabled
                    value={articleSelectionne?.prix ? `${articleSelectionne.prix} MAD` : '-'}
                    className="w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowChargeForm(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Fermer
              </button>
              <button
                onClick={handleAjouterCharge}
                disabled={actionLoading || !articleId}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                Ajouter article
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemiseForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Nouvelle remise</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Appliquer la remise à</label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={remiseAppliqueeMiseAQuai}
                      onChange={(e) => setRemiseAppliqueeMiseAQuai(e.target.checked)}
                    />
                    Frais de mise à quai
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={remiseAppliqueeElectricite}
                      onChange={(e) => setRemiseAppliqueeElectricite(e.target.checked)}
                    />
                    Electricité et/ou eau
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Montant</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={remiseMontant}
                      onChange={(e) => setRemiseMontant(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                    <select
                      value={remiseUnite}
                      onChange={(e) => setRemiseUnite(e.target.value)}
                      className="rounded border border-gray-300 px-3 py-2"
                    >
                      <option value="pourcentage">%</option>
                      <option value="devise">MAD</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Jours gratuits — Nombre de jours</label>
                <input
                  type="number"
                  min="0"
                  value={remiseJoursGratuits}
                  onChange={(e) => setRemiseJoursGratuits(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Raison de la remise</label>
                <textarea
                  value={remiseRaison}
                  onChange={(e) => setRemiseRaison(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowRemiseForm(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={handleAjouterRemise}
                disabled={actionLoading || !remiseMontant}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                Appliquer remise
              </button>
            </div>
          </div>
        </div>
      )}

      {showModifier && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Modifier le contrat</h2>
            {modifMessage && (
              <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{modifMessage}</p>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Date début</label>
                  <input
                    type="date"
                    value={modifDateArrivee}
                    onChange={(e) => setModifDateArrivee(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Date fin</label>
                  <input
                    type="date"
                    value={modifDateDepart}
                    onChange={(e) => setModifDateDepart(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Prix</label>
                <input
                  type="number"
                  step="0.01"
                  value={modifPrix}
                  onChange={(e) => setModifPrix(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModifier(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={soumettreModification}
                disabled={modifSubmitting}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {modifSubmitting ? 'Mise à jour...' : 'Mettre à jour le contrat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}