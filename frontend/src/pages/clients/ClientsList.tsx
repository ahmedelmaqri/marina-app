import { useEffect, useState } from 'react'
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

  useEffect(() => {
    api
      .get('/clients/')
      .then((res) => setClients(res.data))
      .catch(() => setError('Impossible de charger les clients.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Clients</h1>
      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="border-b bg-gray-100 text-left text-sm">
            <th className="p-3">Nom</th>
            <th className="p-3">Email</th>
            <th className="p-3">Téléphone</th>
            <th className="p-3">Type</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b text-sm hover:bg-gray-50">
              <td className="p-3">{client.nom_prenom || client.raison_sociale}</td>
              <td className="p-3">{client.email}</td>
              <td className="p-3">{client.telephone}</td>
              <td className="p-3">{client.type_client}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}