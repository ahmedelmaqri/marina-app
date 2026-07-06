import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

interface Client {
  id: number
  type_client: string
  nom_prenom?: string
  raison_sociale?: string
  email: string
  telephone: string
}

export default function ClientsList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadClients = () => {
    setLoading(true)
    api
      .get('/clients/')
      .then((res) => setClients(res.data))
      .catch(() => setError('Impossible de charger les clients.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadClients()
  }, [])

  const handleDelete = async (id: number, nom: string) => {
    const confirmed = window.confirm(`Supprimer définitivement "${nom}" ?`)
    if (!confirmed) return

    setDeletingId(id)
    try {
      await api.delete(`/clients/${id}/`)
      setClients((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      const message = err.response?.data?.[0] || err.response?.data?.detail || 'Impossible de supprimer ce client.'
      alert(message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link
          to="/clients/nouveau"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Nouveau client
        </Link>
      </div>
      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="border-b bg-gray-100 text-left text-sm">
            <th className="p-3">Nom</th>
            <th className="p-3">Email</th>
            <th className="p-3">Téléphone</th>
            <th className="p-3">Type</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const nom = client.nom_prenom || client.raison_sociale || ''
            return (
              <tr key={client.id} className="border-b text-sm hover:bg-gray-50">
                <td className="p-3">{nom}</td>
                <td className="p-3">{client.email}</td>
                <td className="p-3">{client.telephone}</td>
                <td className="p-3">{client.type_client}</td>
                <td className="p-3">
                  <div className="flex gap-3">
                    <Link to={`/clients/${client.id}/modifier`} className="text-blue-600 hover:underline">
                      Modifier
                    </Link>
                    <button
                      onClick={() => handleDelete(client.id, nom)}
                      disabled={deletingId === client.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === client.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}