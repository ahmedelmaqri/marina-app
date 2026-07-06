import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Escale {
  id: number
  client: number
  bateau: number
  date_arrivee: string
  date_depart: string
  prix_total: string | null
  statut: string
  electricite_eau: string
  methode_paiement: string
  requete_speciale: string
  note: string
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

interface ArticleCharge {
  id: number
  nom: string
  prix: string
}

const STATUT_LABELS: Record<string, string> = {
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  en_cours: 'En cours',
  a_facturer: 'À facturer',
  facturee: 'Facturée',
}

export default function EscaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [escale, setEscale] = useState<Escale | null>(null)
  const [clientNom, setClientNom] = useState('')
  const [bateauNom, setBateauNom] = useState('')
  const [charges, setCharges] = useState<Charge[]>([])
  const [remises, setRemises] = useState<Remise[]>([])
  const [articles, setArticles] = useState<ArticleCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [showChargeForm, setShowChargeForm] = useState(false)
  const [articleId, setArticleId] = useState('')
  const [quantite, setQuantite] = useState('1')

  const [showRemiseForm, setShowRemiseForm] = useState(false)
  const [remiseMontant, setRemiseMontant] = useState('')
  const [remiseUnite, setRemiseUnite] = useState('pourcentage')
  const [remiseRaison, setRemiseRaison] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/escales/${id}/`).then((res) => {
      setEscale(res.data)
      api.get(`/clients/${res.data.client}/`).then((c) =>
        setClientNom(c.data.nom_prenom || c.data.raison_sociale)
      )
      api.get(`/bateaux/${res.data.bateau}/`).then((b) => setBateauNom(b.data.nom_navire))
    })
    api.get('/charges/').then((res) =>
      setCharges(res.data.filter((c: Charge) => c.reservation === Number(id)))
    )
    api.get('/remises/').then((res) =>
      setRemises(res.data.filter((r: Remise) => r.reservation === Number(id)))
    )
    api.get('/articles-charges/').then((res) => setArticles(res.data))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  const handleAnnuler = async () => {
    if (!window.confirm('Annuler cette escale ?')) return
    setActionLoading(true)
    try {
      const { data } = await api.post(`/escales/${id}/annuler/`)
      setMessage(data.message)
      load()
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Erreur lors de l'annulation.")
    } finally {
      setActionLoading(false)
    }
  }

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
    setActionLoading(true)
    try {
      await api.post('/remises/', {
        reservation: Number(id),
        appliquee_mise_a_quai: true,
        montant: remiseMontant,
        unite: remiseUnite,
        raison: remiseRaison,
      })
      setShowRemiseForm(false)
      setRemiseMontant('')
      setRemiseRaison('')
      load()
    } catch {
      setMessage("Erreur lors de l'ajout de la remise.")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !escale) return <p>Chargement...</p>

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/reservations')} className="mb-4 text-sm text-blue-600 hover:underline">
        ← Retour à la liste
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Escale #{escale.id}</h1>
        <span className="rounded bg-gray-100 px-3 py-1 text-sm font-medium">
          {STATUT_LABELS[escale.statut] || escale.statut}
        </span>
      </div>

      {message && (
        <p className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 rounded bg-white p-6 shadow">
        <div>
          <p className="text-xs text-gray-500">Client</p>
          <p className="font-medium">{clientNom}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Bateau</p>
          <p className="font-medium">{bateauNom}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Arrivée</p>
          <p className="font-medium">{new Date(escale.date_arrivee).toLocaleDateString('fr-FR')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Départ</p>
          <p className="font-medium">{new Date(escale.date_depart).toLocaleDateString('fr-FR')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Eau / Électricité</p>
          <p className="font-medium">{escale.electricite_eau || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Méthode de paiement</p>
          <p className="font-medium">{escale.methode_paiement || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Prix total</p>
          <p className="font-medium">{escale.prix_total ? `${escale.prix_total} MAD` : '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Requête spéciale</p>
          <p className="font-medium">{escale.requete_speciale || '-'}</p>
        </div>
      </div>

      <div className="mb-6 rounded bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Charges</h2>
          <button
            onClick={() => setShowChargeForm(!showChargeForm)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Ajouter une charge
          </button>
        </div>

        {charges.map((c) => (
          <p key={c.id} className="text-sm">
            Charge #{c.id} — {c.montant} MAD (x{c.quantite})
          </p>
        ))}
        {charges.length === 0 && <p className="text-sm text-gray-400">Aucune charge.</p>}

        {showChargeForm && (
          <div className="mt-3 space-y-2 rounded border border-gray-200 p-3">
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- Sélectionner un article --</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.nom} ({a.prix} MAD)</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Quantité"
            />
            <button
              onClick={handleAjouterCharge}
              disabled={actionLoading || !articleId}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 rounded bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Remises</h2>
          <button
            onClick={() => setShowRemiseForm(!showRemiseForm)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Ajouter une remise
          </button>
        </div>

        {remises.map((r) => (
          <p key={r.id} className="text-sm text-green-700">
            Remise — {r.montant}{r.unite === 'pourcentage' ? '%' : ' MAD'} ({r.raison})
          </p>
        ))}
        {remises.length === 0 && <p className="text-sm text-gray-400">Aucune remise.</p>}

        {showRemiseForm && (
          <div className="mt-3 space-y-2 rounded border border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={remiseMontant}
                onChange={(e) => setRemiseMontant(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Montant"
              />
              <select
                value={remiseUnite}
                onChange={(e) => setRemiseUnite(e.target.value)}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="pourcentage">%</option>
                <option value="devise">MAD</option>
              </select>
            </div>
            <input
              type="text"
              value={remiseRaison}
              onChange={(e) => setRemiseRaison(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Raison"
            />
            <button
              onClick={handleAjouterRemise}
              disabled={actionLoading || !remiseMontant}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        )}
      </div>

      {escale.statut !== 'annulee' && (
        <button
          onClick={handleAnnuler}
          disabled={actionLoading}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          Annuler l'escale
        </button>
      )}
    </div>
  )
}