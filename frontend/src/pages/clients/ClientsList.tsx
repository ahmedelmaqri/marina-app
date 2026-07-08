import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Link, useNavigate } from 'react-router-dom'

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
  const [recherche, setRecherche] = useState('')
  const navigate = useNavigate()

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

  const clientsFiltres = clients.filter((client) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    const nom = client.nom_prenom || client.raison_sociale || ''
    return (
      nom.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      client.telephone.includes(q)
    )
  })

  const exporter = () => {
    const entetes = ['Nom', 'Email', 'Téléphone', 'Type']
    const lignes = clientsFiltres.map((c) => [
      c.nom_prenom || c.raison_sociale || '',
      c.email,
      c.telephone,
      c.type_client,
    ])
    const csv = [entetes, ...lignes].map((ligne) => ligne.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-3">
          <Link
            to="/clients/nouveau"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            + Nouveau contact
          </Link>
          <button onClick={exporter} className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800">
            Exporter
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Nom, mail ou téléphone"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm"
        />
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
          {clientsFiltres.map((client) => {
            const nom = client.nom_prenom || client.raison_sociale || ''
            return (
              <tr
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="cursor-pointer border-b text-sm hover:bg-gray-50"
              >
                <td className="p-3">{nom}</td>
                <td className="p-3">{client.email}</td>
                <td className="p-3">{client.telephone}</td>
                <td className="p-3">{client.type_client}</td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
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
                    <button
                      onClick={() => navigate(`/reservations/nouveau?client=${client.id}`)}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Nouvelle réservation
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          {clientsFiltres.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-400">Aucun client trouvé.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}