import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Escale {
  id: number
  client: number
  bateau: number
  grille_tarifaire: number | null
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
  taxe: string | null
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
  const [showCreerArticle, setShowCreerArticle] = useState(false)
  const [newArticleNom, setNewArticleNom] = useState('')
  const [newArticleCategorie, setNewArticleCategorie] = useState('autres')
  const [newArticleTaxe, setNewArticleTaxe] = useState('0')
  const [newArticlePrix, setNewArticlePrix] = useState('')

  const [showRemiseForm, setShowRemiseForm] = useState(false)
  const [remiseAppliqueeMiseAQuai, setRemiseAppliqueeMiseAQuai] = useState(true)
  const [remiseAppliqueeElectricite, setRemiseAppliqueeElectricite] = useState(false)
  const [remiseMontant, setRemiseMontant] = useState('')
  const [remiseUnite, setRemiseUnite] = useState('pourcentage')
  const [remiseJoursGratuits, setRemiseJoursGratuits] = useState('')
  const [remiseRaison, setRemiseRaison] = useState('')

  const [showModifier, setShowModifier] = useState(false)
  const [modifDateArrivee, setModifDateArrivee] = useState('')
  const [modifDateDepart, setModifDateDepart] = useState('')
  const [modifElectricite, setModifElectricite] = useState('aucun')
  const [modifMethodePaiement, setModifMethodePaiement] = useState('espece')
  const [modifPrix, setModifPrix] = useState('')
  const [modifSubmitting, setModifSubmitting] = useState(false)
  const [modifMessage, setModifMessage] = useState('')

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

  const ouvrirModifier = () => {
    if (!escale) return
    setModifDateArrivee(escale.date_arrivee.slice(0, 10))
    setModifDateDepart(escale.date_depart.slice(0, 10))
    setModifElectricite(escale.electricite_eau || 'aucun')
    setModifMethodePaiement(escale.methode_paiement || 'espece')
    setModifPrix(escale.prix_total || '')
    setModifMessage('')
    setShowModifier(true)
  }

  const soumettreModification = async () => {
    setModifSubmitting(true)
    setModifMessage('')
    try {
      await api.patch(`/escales/${id}/`, {
        date_arrivee: `${modifDateArrivee}T00:00:00`,
        date_depart: `${modifDateDepart}T00:00:00`,
        electricite_eau: modifElectricite,
        methode_paiement: modifMethodePaiement,
        prix_total: modifPrix || null,
      })
      setShowModifier(false)
      load()
    } catch {
      setModifMessage("Erreur lors de la mise à jour. Vérifiez que la date de départ est postérieure à la date d'arrivée.")
    } finally {
      setModifSubmitting(false)
    }
  }

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

  const articleSelectionne = articles.find((a) => String(a.id) === articleId)

  const handleCreerArticle = async () => {
    if (!newArticleNom || !newArticlePrix) return
    setActionLoading(true)
    try {
      const { data } = await api.post('/articles-charges/', {
        nom: newArticleNom,
        categorie: newArticleCategorie,
        taxe: newArticleTaxe || null,
        prix: newArticlePrix,
      })
      setArticles((prev) => [...prev, data])
      setArticleId(String(data.id))
      setShowCreerArticle(false)
      setNewArticleNom('')
      setNewArticlePrix('')
      setNewArticleTaxe('0')
    } catch {
      setMessage("Erreur lors de la création de l'article.")
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
        <div className="flex items-center gap-3">
          <button
            onClick={ouvrirModifier}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Modifier
          </button>
          <span className="rounded bg-gray-100 px-3 py-1 text-sm font-medium">
            {STATUT_LABELS[escale.statut] || escale.statut}
          </span>
        </div>
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
            onClick={() => setShowChargeForm(true)}
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
      </div>

      <div className="mb-6 rounded bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Remises</h2>
          <button
            onClick={() => setShowRemiseForm(true)}
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

      {showChargeForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Sélectionner un article</h2>

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-gray-500">Article</label>
                  <button
                    type="button"
                    onClick={() => setShowCreerArticle(!showCreerArticle)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    ( Créer nouvel article )
                  </button>
                </div>
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

              {showCreerArticle && (
                <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
                  <input
                    type="text"
                    placeholder="Nom de l'article"
                    value={newArticleNom}
                    onChange={(e) => setNewArticleNom(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={newArticleCategorie}
                    onChange={(e) => setNewArticleCategorie(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="electricite">Electricité</option>
                    <option value="provisions">Provisions</option>
                    <option value="services">Services</option>
                    <option value="autres">Autres</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Taxe %"
                      value={newArticleTaxe}
                      onChange={(e) => setNewArticleTaxe(e.target.value)}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Prix"
                      value={newArticlePrix}
                      onChange={(e) => setNewArticlePrix(e.target.value)}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleCreerArticle}
                    disabled={actionLoading || !newArticleNom || !newArticlePrix}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Créer l'article
                  </button>
                </div>
              )}

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
            <h2 className="mb-4 text-lg font-bold">Modifier réservation</h2>

            {modifMessage && (
              <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{modifMessage}</p>
            )}

            {escale.grille_tarifaire && (
              <p className="mb-3 rounded bg-blue-50 p-2 text-xs text-blue-800">
                Une grille tarifaire est liée à cette escale : le prix sera recalculé automatiquement
                à partir des nouvelles dates.
              </p>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Arrivée</label>
                  <input
                    type="date"
                    value={modifDateArrivee}
                    onChange={(e) => setModifDateArrivee(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Départ</label>
                  <input
                    type="date"
                    value={modifDateDepart}
                    onChange={(e) => setModifDateDepart(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Eau / Électricité</label>
                <select
                  value={modifElectricite}
                  onChange={(e) => setModifElectricite(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="aucun">Aucun</option>
                  <option value="eau">Eau</option>
                  <option value="electricite">Électricité</option>
                  <option value="eau_electricite">Eau et Électricité</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Méthode de paiement</label>
                <select
                  value={modifMethodePaiement}
                  onChange={(e) => setModifMethodePaiement(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="carte">Carte bancaire</option>
                  <option value="espece">Espèce</option>
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Prix {escale.grille_tarifaire ? '(recalculé automatiquement si grille liée)' : ''}
                </label>
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
                {modifSubmitting ? 'Mise à jour...' : 'Mettre à jour la réservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}