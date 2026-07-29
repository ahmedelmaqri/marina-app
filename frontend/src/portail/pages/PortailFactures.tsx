import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import portailApi from '../api'

interface Facture {
  id: number
  numero: string
  montant: string
  statut: string
  date_emission: string
  date_paiement: string | null
  pdf: string | null
}

const STATUT_LABELS: Record<string, string> = {
  impayee: 'Impayée',
  payee: 'Payée',
  annulee: 'Annulée',
}

const STATUT_STYLES: Record<string, string> = {
  impayee: 'bg-amber-100 text-amber-800',
  payee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
}

function formatDateShort(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function PortailFactures() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)
  const [payantId, setPayantId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [searchParams] = useSearchParams()

  const load = () => {
    portailApi.get('/mes-factures/').then((res) => {
      setFactures(res.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const paiement = searchParams.get('paiement')
    if (paiement === 'succes') {
      setMessage('Paiement réussi. Votre facture sera marquée payée dès confirmation de la banque.')
    } else if (paiement === 'annule') {
      setMessage('Le paiement a été annulé.')
    }
  }, [searchParams])

  const handlePayer = async (factureId: number) => {
    setPayantId(factureId)
    setMessage('')
    try {
      const { data } = await portailApi.post(`/factures/${factureId}/payer/`)
      window.location.href = data.checkout_url
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Erreur lors de la création du paiement.')
      setPayantId(null)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Mes factures</h1>

      {message && (
        <p className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
      )}

      {factures.length === 0 && (
        <p className="rounded bg-white p-6 text-sm text-gray-400 shadow">
          Vous n'avez aucune facture pour le moment.
        </p>
      )}

      {factures.length > 0 && (
        <div className="overflow-hidden rounded bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Émise le</th>
                <th className="px-4 py-3 font-medium">Payée le</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{f.numero}</td>
                  <td className="px-4 py-3">{formatDateShort(f.date_emission)}</td>
                  <td className="px-4 py-3">{formatDateShort(f.date_paiement)}</td>
                  <td className="px-4 py-3 text-right">{f.montant} MAD</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${STATUT_STYLES[f.statut] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {STATUT_LABELS[f.statut] || f.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.statut === 'impayee' && (
                      <button
                        onClick={() => handlePayer(f.id)}
                        disabled={payantId === f.id}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {payantId === f.id ? 'Redirection...' : 'Payer'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
