import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/axios'

interface Document {
  id: number
  nom: string
  fichier: string
  date_ajout: string
}

export default function DocumentsModal({ onClose }: { onClose: () => void }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [nom, setNom] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const charger = () => {
    api.get('/documents/').then((res) => setDocuments(res.data))
  }

  useEffect(() => {
    charger()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nom || !fichier) {
      setError('Le nom et le fichier sont requis.')
      return
    }
    setError('')
    setLoading(true)
    const formData = new FormData()
    formData.append('nom', nom)
    formData.append('fichier', fichier)

    try {
      await api.post('/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setNom('')
      setFichier(null)
      charger()
    } catch {
      setError("Erreur lors de l'ajout du document.")
    } finally {
      setLoading(false)
    }
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer ce document ?')) return
    await api.delete(`/documents/${id}/`)
    charger()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Gestion des documents</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom du document</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Fichier</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFichier(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Ajouter Document
          </button>
        </form>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">Nom du document</th>
              <th className="p-2">Fichier</th>
              <th className="p-2">Date</th>
              <th className="p-2">Opérations</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="p-2">{d.nom}</td>
                <td className="p-2">
                  <a href={d.fichier} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Voir
                  </a>
                </td>
                <td className="p-2">{new Date(d.date_ajout).toLocaleDateString('fr-FR')}</td>
                <td className="p-2">
                  <button onClick={() => supprimer(d.id)} className="text-red-600 hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">Aucun document.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}