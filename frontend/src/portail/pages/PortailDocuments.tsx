import { useEffect, useRef, useState } from 'react'
import portailApi from '../api'

interface DocumentClient {
  id: number
  type_document: string
  fichier: string
  nom_original: string
  date_ajout: string
}

const TYPE_LABELS: Record<string, string> = {
  permis_navigation: 'Permis de navigation',
  assurance: 'Assurance bateau',
  piece_identite: "Pièce d'identité",
  autre: 'Autre',
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function PortailDocuments() {
  const [documents, setDocuments] = useState<DocumentClient[]>([])
  const [loading, setLoading] = useState(true)
  const [typeDocument, setTypeDocument] = useState('permis_navigation')
  const [fichier, setFichier] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    portailApi.get('/mes-documents/').then((res) => {
      setDocuments(res.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const handleUpload = async () => {
    if (!fichier) {
      setMessage('Sélectionnez un fichier à téléverser.')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('type_document', typeDocument)
      formData.append('fichier', fichier)
      await portailApi.post('/mes-documents/', formData)
      setFichier(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      load()
    } catch {
      setMessage('Erreur lors du téléversement du document.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Mes documents</h1>

      <div className="mb-6 rounded bg-white p-6 shadow">
        <h2 className="mb-3 font-semibold">Téléverser un document</h2>

        {message && (
          <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{message}</p>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Type de document</label>
            <select
              value={typeDocument}
              onChange={(e) => setTypeDocument(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([valeur, label]) => (
                <option key={valeur} value={valeur}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fichier</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFichier(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Envoi...' : 'Téléverser'}
          </button>
        </div>
      </div>

      {documents.length === 0 && (
        <p className="rounded bg-white p-6 text-sm text-gray-400 shadow">
          Aucun document téléversé pour le moment.
        </p>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded bg-white p-4 shadow"
            >
              <div>
                <p className="text-xs font-semibold text-gray-500">
                  {TYPE_LABELS[d.type_document] || d.type_document}
                </p>
                <p className="text-sm font-medium">{d.nom_original}</p>
                <p className="text-xs text-gray-400">Ajouté le {formatDateShort(d.date_ajout)}</p>
              </div>
              <a
                href={d.fichier}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
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
