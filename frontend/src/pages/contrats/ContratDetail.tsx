import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Contrat {
  id: number
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

const SIGNATURE_LABELS: Record<string, string> = {
  a_envoyer: 'À envoyer',
  envoye: 'Envoyé',
  signe: 'Signé',
  archive: 'Archivé',
  resilie: 'Résilié',
}

export default function ContratDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [contrat, setContrat] = useState<Contrat | null>(null)
  const [clientNom, setClientNom] = useState('')
  const [bateauNom, setBateauNom] = useState('')
  const [charges, setCharges] = useState<Charge[]>([])
  const [remises, setRemises] = useState<Remise[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/contrats-reservations/${id}/`).then((res) => {
      setContrat(res.data)
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
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

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

  if (loading || !contrat) return <p>Chargement...</p>

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/contrats')} className="mb-4 text-sm text-blue-600 hover:underline">
        ← Retour à la liste
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contrat #{contrat.id}</h1>
        <span className="rounded bg-gray-100 px-3 py-1 text-sm font-medium">
          {SIGNATURE_LABELS[contrat.statut_signature] || contrat.statut_signature}
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
          <p className="text-xs text-gray-500">Date début</p>
          <p className="font-medium">{new Date(contrat.date_arrivee).toLocaleDateString('fr-FR')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Date fin</p>
          <p className="font-medium">{new Date(contrat.date_depart).toLocaleDateString('fr-FR')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Prix total</p>
          <p className="font-medium">{contrat.prix_total ? `${contrat.prix_total} MAD` : '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Note</p>
          <p className="font-medium">{contrat.note || '-'}</p>
        </div>
      </div>

      {(charges.length > 0 || remises.length > 0) && (
        <div className="mb-6 rounded bg-white p-6 shadow">
          <h2 className="mb-3 font-semibold">Charges et remises</h2>
          {charges.map((c) => (
            <p key={`charge-${c.id}`} className="text-sm">
              Charge #{c.id} — {c.montant} MAD (x{c.quantite})
            </p>
          ))}
          {remises.map((r) => (
            <p key={`remise-${r.id}`} className="text-sm text-green-700">
              Remise — {r.montant}{r.unite === 'pourcentage' ? '%' : ' MAD'} ({r.raison})
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {contrat.statut_signature === 'a_envoyer' && (
          <>
            <button
              onClick={() => runAction('envoyer')}
              disabled={actionLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Envoyer au client
            </button>
            <button
              onClick={archiver}
              disabled={actionLoading}
              className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 disabled:opacity-50"
            >
              Archiver
            </button>
          </>
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
          <>
            <button
              onClick={resilier}
              disabled={actionLoading}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Résilier
            </button>
            <button
              onClick={() => runAction('creer_avenant')}
              disabled={actionLoading}
              className="rounded bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              Créer un avenant
            </button>
          </>
        )}
      </div>
    </div>
  )
}