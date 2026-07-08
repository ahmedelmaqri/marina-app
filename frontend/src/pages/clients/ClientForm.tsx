import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'

interface ClientData {
  type_client: 'physique' | 'morale'
  nom_prenom: string
  numero_passeport_cin: string
  adresse: string
  raison_sociale: string
  registre_commerce: string
  siege_social: string
  email: string
  telephone: string
  pays: string
  ville: string
  code_postal: string
}

interface Bateau {
  id: number
  nom_navire: string
  type_bateau?: string
  modele?: string
  longueur?: string
}

interface Reservation {
  id: number
  client: number
  date_arrivee: string
  date_depart: string
  statut: string
  prix_total: string | null
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

const EMPTY_CLIENT: ClientData = {
  type_client: 'physique',
  nom_prenom: '',
  numero_passeport_cin: '',
  adresse: '',
  raison_sociale: '',
  registre_commerce: '',
  siege_social: '',
  email: '',
  telephone: '',
  pays: '',
  ville: '',
  code_postal: '',
}

const STATUT_LABELS: Record<string, string> = {
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  en_cours: 'En cours',
  a_facturer: 'À facturer',
  facturee: 'Facturée',
}

const PAIEMENT_TYPE_LABELS: Record<string, string> = {
  a_regler: 'À régler',
  regle: 'Réglé',
  rembourse: 'Remboursé',
}

type Onglet = 'details' | 'reservations' | 'bateaux' | 'paiement'

function formatDateShort(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function ClientForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [onglet, setOnglet] = useState<Onglet>('details')

  const [form, setForm] = useState<ClientData>(EMPTY_CLIENT)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [bateauxLoaded, setBateauxLoaded] = useState(false)

  const [reservations, setReservations] = useState<(Reservation & { type: 'Escale' | 'Contrat' })[]>([])
  const [reservationsLoaded, setReservationsLoaded] = useState(false)

  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [paiementsLoaded, setPaiementsLoaded] = useState(false)
  const [chargementOnglet, setChargementOnglet] = useState(false)

  useEffect(() => {
    if (isEditing) {
      api.get(`/clients/${id}/`).then((res) => setForm({ ...EMPTY_CLIENT, ...res.data }))
    }
  }, [id, isEditing])

  const handleChange = (field: keyof ClientData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isEditing) {
        await api.put(`/clients/${id}/`, form)
      } else {
        const { data } = await api.post('/clients/', form)
        navigate(`/clients/${data.id}/modifier`)
        return
      }
      navigate('/clients')
    } catch {
      setError("Erreur lors de l'enregistrement. Vérifiez les champs.")
    } finally {
      setLoading(false)
    }
  }

  const chargerBateaux = async () => {
    if (bateauxLoaded || !isEditing) return
    setChargementOnglet(true)
    try {
      const res = await api.get('/bateaux/')
      setBateaux(res.data.filter((b: any) => b.client === Number(id)))
      setBateauxLoaded(true)
    } finally {
      setChargementOnglet(false)
    }
  }

  const chargerReservations = async () => {
    if (reservationsLoaded || !isEditing) return
    setChargementOnglet(true)
    try {
      const [escalesRes, contratsRes] = await Promise.all([
        api.get('/escales/'),
        api.get('/contrats-reservations/'),
      ])
      const escales = escalesRes.data
        .filter((r: Reservation) => r.client === Number(id))
        .map((r: Reservation) => ({ ...r, type: 'Escale' as const }))
      const contrats = contratsRes.data
        .filter((r: Reservation) => r.client === Number(id))
        .map((r: Reservation) => ({ ...r, type: 'Contrat' as const }))
      setReservations(
        [...escales, ...contrats].sort(
          (a, b) => new Date(b.date_arrivee).getTime() - new Date(a.date_arrivee).getTime()
        )
      )
      setReservationsLoaded(true)
    } finally {
      setChargementOnglet(false)
    }
  }

  const chargerPaiements = async () => {
    if (paiementsLoaded || !isEditing) return
    setChargementOnglet(true)
    try {
      const [escalesRes, contratsRes, paiementsRes] = await Promise.all([
        api.get('/escales/'),
        api.get('/contrats-reservations/'),
        api.get('/paiements/'),
      ])
      const idsReservations = new Set([
        ...escalesRes.data.filter((r: Reservation) => r.client === Number(id)).map((r: Reservation) => r.id),
        ...contratsRes.data.filter((r: Reservation) => r.client === Number(id)).map((r: Reservation) => r.id),
      ])
      setPaiements(paiementsRes.data.filter((p: Paiement) => idsReservations.has(p.reservation)))
      setPaiementsLoaded(true)
    } finally {
      setChargementOnglet(false)
    }
  }

  const ouvrirOnglet = (o: Onglet) => {
    if (!isEditing && o !== 'details') return
    setOnglet(o)
    if (o === 'bateaux') chargerBateaux()
    if (o === 'reservations') chargerReservations()
    if (o === 'paiement') chargerPaiements()
  }

  const clientNom = form.type_client === 'physique' ? form.nom_prenom : form.raison_sociale

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">
        {isEditing ? clientNom || 'Modifier le client' : 'Nouveau client'}
      </h1>

      <div className="mb-0 flex items-center justify-between rounded-t bg-gray-50 px-2 pt-2">
        <div className="flex gap-1">
          {([
            ['details', 'Détails'],
            ['reservations', 'Réservations'],
            ['bateaux', 'Bateaux'],
            ['paiement', 'Paiement'],
          ] as [Onglet, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => ouvrirOnglet(key)}
              disabled={!isEditing && key !== 'details'}
              className={`rounded-t px-4 py-2 text-sm font-medium ${
                onglet === key
                  ? 'bg-white text-gray-900 shadow'
                  : !isEditing && key !== 'details'
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={() => navigate(`/reservations/nouveau?client=${id}`)}
            className="mb-1 mr-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + Nouvelle réservation
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 mt-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
      )}

      {onglet === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-b bg-white p-6 shadow">
          <h2 className="font-semibold">Informations contact</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type de client</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.type_client === 'physique'}
                  onChange={() => handleChange('type_client', 'physique')}
                />
                Personne physique
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.type_client === 'morale'}
                  onChange={() => handleChange('type_client', 'morale')}
                />
                Personne morale
              </label>
            </div>
          </div>

          {form.type_client === 'physique' ? (
            <>
              <Field label="Nom et prénom" value={form.nom_prenom} onChange={(v) => handleChange('nom_prenom', v)} required />
              <Field label="N° passeport / CIN" value={form.numero_passeport_cin} onChange={(v) => handleChange('numero_passeport_cin', v)} />
            </>
          ) : (
            <>
              <Field label="Raison sociale" value={form.raison_sociale} onChange={(v) => handleChange('raison_sociale', v)} required />
              <Field label="Registre de commerce" value={form.registre_commerce} onChange={(v) => handleChange('registre_commerce', v)} />
            </>
          )}

          <Field label="Email" type="email" value={form.email} onChange={(v) => handleChange('email', v)} required />
          <Field label="Téléphone" value={form.telephone} onChange={(v) => handleChange('telephone', v)} required />
          <Field
            label="Adresse"
            value={form.type_client === 'physique' ? form.adresse : form.siege_social}
            onChange={(v) => handleChange(form.type_client === 'physique' ? 'adresse' : 'siege_social', v)}
          />
          <Field label="Pays" value={form.pays} onChange={(v) => handleChange('pays', v)} />
          <Field label="Ville" value={form.ville} onChange={(v) => handleChange('ville', v)} />
          <Field label="Code postal" value={form.code_postal} onChange={(v) => handleChange('code_postal', v)} />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer contact'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {onglet === 'reservations' && (
        <div className="rounded-b bg-white p-6 shadow">
          <h2 className="mb-3 font-semibold">Réservations</h2>
          {chargementOnglet && <p className="text-sm text-gray-400">Chargement...</p>}
          {!chargementOnglet && reservations.length === 0 && (
            <p className="text-sm text-gray-400">Aucune réservation pour ce client.</p>
          )}
          {reservations.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Arrivée</th>
                  <th className="pb-2">Départ</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2 text-right">Prix</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={`${r.type}-${r.id}`} className="border-t">
                    <td className="py-2">{r.type}</td>
                    <td className="py-2">{formatDateShort(r.date_arrivee)}</td>
                    <td className="py-2">{formatDateShort(r.date_depart)}</td>
                    <td className="py-2">{STATUT_LABELS[r.statut] || r.statut}</td>
                    <td className="py-2 text-right">{r.prix_total ? `${r.prix_total} MAD` : '-'}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() =>
                          navigate(r.type === 'Escale' ? `/reservations/${r.id}` : `/contrats/${r.id}`)
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {onglet === 'bateaux' && (
        <div className="rounded-b bg-white p-6 shadow">
          <h2 className="mb-3 font-semibold">Bateaux</h2>
          {chargementOnglet && <p className="text-sm text-gray-400">Chargement...</p>}
          {!chargementOnglet && bateaux.length === 0 && (
            <p className="text-sm text-gray-400">Aucun bateau enregistré pour ce client.</p>
          )}
          {bateaux.map((b) => (
            <div key={b.id} className="mb-2 flex items-center justify-between rounded border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium">{b.nom_navire}</p>
                <p className="text-xs text-gray-500">
                  {b.type_bateau} {b.modele ? `— ${b.modele}` : ''} {b.longueur ? `— ${b.longueur}'` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {onglet === 'paiement' && (
        <div className="rounded-b bg-white p-6 shadow">
          <h2 className="mb-3 font-semibold">Paiements</h2>
          {chargementOnglet && <p className="text-sm text-gray-400">Chargement...</p>}
          {!chargementOnglet && paiements.length === 0 && (
            <p className="text-sm text-gray-400">Aucun paiement pour ce client.</p>
          )}
          {paiements.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Échéance</th>
                  <th className="pb-2">Traitement</th>
                  <th className="pb-2">Méthode</th>
                  <th className="pb-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{PAIEMENT_TYPE_LABELS[p.type_paiement] || p.type_paiement}</td>
                    <td className="py-2">{formatDateShort(p.date_echeance)}</td>
                    <td className="py-2">{formatDateShort(p.date_traitement)}</td>
                    <td className="py-2">{p.methode || '-'}</td>
                    <td className="py-2 text-right">{p.montant} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}