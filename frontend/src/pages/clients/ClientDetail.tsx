import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api/axios'

interface Client {
  id: number
  type_client: string
  nom_prenom?: string
  raison_sociale?: string
  email: string
  telephone: string
  adresse?: string
  siege_social?: string
}

interface Reservation {
  id: number
  bateau: number
  date_arrivee: string
  date_depart: string
  statut: string
  prix_total: string | null
}

interface Bateau {
  id: number
  nom_navire: string
  type_bateau: string
  longueur: string
  largeur: string
  numero_immatriculation: string
}

interface DocumentClient {
  id: number
  client: number
  type_document: string
  fichier: string
  nom_original: string
  date_ajout: string
}

const TYPE_DOCUMENT_LABELS: Record<string, string> = {
  permis_navigation: 'Permis de navigation',
  assurance: 'Assurance bateau',
  piece_identite: "Pièce d'identité",
  autre: 'Autre',
}

type Tab = 'details' | 'reservations' | 'bateaux' | 'documents'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('details')

  const [client, setClient] = useState<Client | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [documents, setDocuments] = useState<DocumentClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/clients/${id}/`).then((res) => setClient(res.data))
    api.get('/reservations/').then((res) =>
      setReservations(res.data.filter((r: any) => r.client === Number(id)))
    )
    api.get('/bateaux/').then((res) =>
      setBateaux(res.data.filter((b: any) => b.client === Number(id)))
    ).finally(() => setLoading(false))
    api.get('/documents-clients/').then((res) =>
      setDocuments(res.data.filter((d: DocumentClient) => d.client === Number(id)))
    )
  }, [id])

  if (loading || !client) return <p>Chargement...</p>

  const nom = client.nom_prenom || client.raison_sociale

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/clients')} className="mb-4 text-sm text-blue-600 hover:underline">
        ← Retour à la liste
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{nom}</h1>
        <Link
          to={`/clients/${id}/modifier`}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Modifier
        </Link>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {(['details', 'reservations', 'bateaux', 'documents'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="grid grid-cols-2 gap-4 rounded bg-white p-6 shadow">
          <div>
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-medium">{client.type_client}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-medium">{client.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Téléphone</p>
            <p className="font-medium">{client.telephone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Adresse / Siège social</p>
            <p className="font-medium">{client.adresse || client.siege_social || '-'}</p>
          </div>
        </div>
      )}

      {tab === 'reservations' && (
        <div className="rounded bg-white p-6 shadow">
          {reservations.length === 0 && <p className="text-sm text-gray-400">Aucune réservation.</p>}
          {reservations.map((r) => (
            <div
              key={r.id}
              onClick={() => navigate(`/reservations/${r.id}`)}
              className="cursor-pointer border-b py-2 text-sm last:border-0 hover:bg-gray-50"
            >
              #{r.id} — {new Date(r.date_arrivee).toLocaleDateString('fr-FR')} → {new Date(r.date_depart).toLocaleDateString('fr-FR')} — {r.statut} — {r.prix_total ? `${r.prix_total} MAD` : '-'}
            </div>
          ))}
        </div>
      )}

      {tab === 'bateaux' && (
        <div className="rounded bg-white p-6 shadow">
          {bateaux.length === 0 && <p className="text-sm text-gray-400">Aucun bateau.</p>}
          {bateaux.map((b) => (
            <div key={b.id} className="border-b py-2 text-sm last:border-0">
              {b.nom_navire} — {b.type_bateau} — {b.longueur}m x {b.largeur}m — {b.numero_immatriculation}
            </div>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded bg-white p-6 shadow">
          {documents.length === 0 && (
            <p className="text-sm text-gray-400">Aucun document téléversé par ce client.</p>
          )}
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
            >
              <div>
                <span className="font-medium">{TYPE_DOCUMENT_LABELS[d.type_document] || d.type_document}</span>
                <span className="text-gray-500"> — {d.nom_original}</span>
                <p className="text-xs text-gray-400">
                  Ajouté le {new Date(d.date_ajout).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <a
                href={d.fichier}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Voir le fichier
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}