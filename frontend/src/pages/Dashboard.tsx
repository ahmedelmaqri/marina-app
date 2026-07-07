import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

interface Stats {
  totalClients: number
  totalBateaux: number
  reservationsActives: number
  reservationsAnnulees: number
  contratsParStatut: Record<string, number>
  revenuTotal: number
  listeAttenteCount: number
  totalPlaces: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/clients/'),
      api.get('/bateaux/'),
      api.get('/reservations/'),
      api.get('/contrats-reservations/'),
      api.get('/liste-attente/'),
      api.get('/places/'),
    ]).then(([clients, bateaux, reservations, contrats, listeAttente, places]) => {
      const reservationsActives = reservations.data.filter(
        (r: any) => r.statut !== 'annulee'
      ).length
      const reservationsAnnulees = reservations.data.filter(
        (r: any) => r.statut === 'annulee'
      ).length

      const contratsParStatut: Record<string, number> = {}
      contrats.data.forEach((c: any) => {
        contratsParStatut[c.statut_signature] = (contratsParStatut[c.statut_signature] || 0) + 1
      })

      const revenuTotal = reservations.data
        .filter((r: any) => r.statut !== 'annulee')
        .reduce((sum: number, r: any) => sum + (parseFloat(r.prix_total) || 0), 0)

      setStats({
        totalClients: clients.data.length,
        totalBateaux: bateaux.data.length,
        reservationsActives,
        reservationsAnnulees,
        contratsParStatut,
        revenuTotal,
        listeAttenteCount: listeAttente.data.length,
        totalPlaces: places.data.length,
      })
    }).finally(() => setLoading(false))
  }, [])

  const SIGNATURE_LABELS: Record<string, string> = {
    a_envoyer: 'À envoyer',
    envoye: 'Envoyé',
    signe: 'Signé',
    archive: 'Archivé',
    resilie: 'Résilié',
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Tableau de bord</h1>
      <p className="mb-6 text-sm text-gray-500">
        Connecté en tant que {user?.username} ({user?.role})
      </p>

      {loading || !stats ? (
        <p>Chargement...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Clients" value={stats.totalClients} />
            <StatCard label="Bateaux" value={stats.totalBateaux} />
            <StatCard label="Places au total" value={stats.totalPlaces} />
            <StatCard label="Liste d'attente" value={stats.listeAttenteCount} accent="yellow" />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Réservations actives" value={stats.reservationsActives} accent="green" />
            <StatCard label="Réservations annulées" value={stats.reservationsAnnulees} accent="red" />
            <StatCard label="Revenu total estimé" value={`${stats.revenuTotal.toFixed(2)} MAD`} accent="blue" />
          </div>

          <div className="rounded bg-white p-6 shadow">
            <h2 className="mb-3 font-semibold">Contrats par statut</h2>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.contratsParStatut).map(([statut, count]) => (
                <div key={statut} className="rounded bg-gray-100 px-4 py-2 text-sm">
                  <span className="font-medium">{SIGNATURE_LABELS[statut] || statut}</span> : {count}
                </div>
              ))}
              {Object.keys(stats.contratsParStatut).length === 0 && (
                <p className="text-sm text-gray-400">Aucun contrat.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = 'gray',
}: {
  label: string
  value: string | number
  accent?: 'gray' | 'green' | 'red' | 'blue' | 'yellow'
}) {
  const colors: Record<string, string> = {
    gray: 'bg-white text-gray-900',
    green: 'bg-green-50 text-green-800',
    red: 'bg-red-50 text-red-800',
    blue: 'bg-blue-50 text-blue-800',
    yellow: 'bg-yellow-50 text-yellow-800',
  }
  return (
    <div className={`rounded p-4 shadow ${colors[accent]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}