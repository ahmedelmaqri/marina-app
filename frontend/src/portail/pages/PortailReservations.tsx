import { useEffect, useState } from 'react'
import portailApi from '../api'

interface Paiement {
  id: number
  type_paiement: string
  date_echeance: string
  date_traitement: string | null
  methode: string
  montant: string
}

interface Reservation {
  id: number
  bateau_nom: string
  date_arrivee: string
  date_depart: string
  statut: string
  prix_total: string | null
  note: string
  paiements: Paiement[]
}

const STATUT_LABELS: Record<string, string> = {
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  en_cours: 'En cours',
  a_facturer: 'À facturer',
  facturee: 'Facturée',
}

const STATUT_STYLES: Record<string, string> = {
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
  en_cours: 'bg-blue-100 text-blue-800',
  a_facturer: 'bg-amber-100 text-amber-800',
  facturee: 'bg-gray-200 text-gray-800',
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

export default function PortailReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portailApi.get('/mes-reservations/').then((res) => {
      setReservations(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Mes réservations</h1>

      {reservations.length === 0 && (
        <p className="rounded bg-white p-6 text-sm text-gray-400 shadow">
          Vous n'avez aucune réservation pour le moment.
        </p>
      )}

      <div className="space-y-4">
        {reservations.map((r) => (
          <div key={r.id} className="rounded bg-white p-6 shadow">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">Réservation #{r.id}</p>
                <p className="text-lg font-bold">{r.bateau_nom}</p>
              </div>
              <span
                className={`rounded px-4 py-2 text-sm font-bold ${STATUT_STYLES[r.statut] || 'bg-gray-100 text-gray-800'}`}
              >
                {STATUT_LABELS[r.statut] || r.statut}
              </span>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Arrivée</p>
                <p className="font-medium">{formatDateLong(r.date_arrivee)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Départ</p>
                <p className="font-medium">{formatDateLong(r.date_depart)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-medium">{r.prix_total ? `${r.prix_total} MAD` : '-'}</p>
              </div>
            </div>

            {r.note && (
              <p className="mb-4 rounded bg-gray-50 p-3 text-sm text-gray-600">{r.note}</p>
            )}

            {r.paiements.length > 0 && (
              <>
                <hr className="my-3" />
                <h3 className="mb-2 text-sm font-semibold">Paiements programmés</h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="pb-1 font-medium">Type</th>
                      <th className="pb-1 font-medium">Échéance</th>
                      <th className="pb-1 font-medium">Traitement</th>
                      <th className="pb-1 font-medium">Méthode</th>
                      <th className="pb-1 text-right font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.paiements.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-1.5">{PAIEMENT_TYPE_LABELS[p.type_paiement] || p.type_paiement}</td>
                        <td className="py-1.5">{formatDateShort(p.date_echeance)}</td>
                        <td className="py-1.5">{formatDateShort(p.date_traitement)}</td>
                        <td className="py-1.5">{METHODE_LABELS[p.methode] || p.methode || '-'}</td>
                        <td className="py-1.5 text-right">{p.montant} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
