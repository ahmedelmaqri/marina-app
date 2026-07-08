import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import DocumentsModal from './DocumentsModal'
import GroupeContratModal from './GroupeContratModal'

interface GroupeContrat {
  id: number
  nom: string
}

interface Contrat {
  id: number
  groupe_contrat: number
}

export default function ContratsList() {
  const navigate = useNavigate()
  const [groupes, setGroupes] = useState<GroupeContrat[]>([])
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showDocuments, setShowDocuments] = useState(false)
  const [showNouveauGroupe, setShowNouveauGroupe] = useState(false)

  const chargerDonnees = () => {
    setLoading(true)
    Promise.all([api.get('/groupes-contrats/'), api.get('/contrats-reservations/')])
      .then(([g, c]) => {
        setGroupes(g.data)
        setContrats(c.data)
      })
      .catch(() => setError('Impossible de charger les groupes de contrats.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    chargerDonnees()
  }, [])

  const nbBateaux = (groupeId: number) =>
    contrats.filter((c) => c.groupe_contrat === groupeId).length

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contrats</h1>
        <button
          onClick={() => setShowDocuments(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          Gérer les documents
        </button>
      </div>

      <div className="space-y-4">
        {groupes.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between rounded bg-white p-5 shadow"
          >
            <div>
              <p className="font-semibold text-gray-800">{g.nom}</p>
              <p className="text-sm text-gray-500">
                🔒 {nbBateaux(g.id)} bateaux dans groupe
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/contrats/groupes/${g.id}`)}
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Voir
              </button>
              <button
                onClick={() => navigate(`/contrats/nouveau?groupe=${g.id}`)}
                className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
              >
                Ajouter bateau
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => setShowNouveauGroupe(true)}
          className="w-full rounded border-2 border-dashed border-gray-300 bg-gray-50 py-6 text-center text-sm font-medium text-emerald-700 hover:bg-gray-100"
        >
          + Nouveau groupe
        </button>
      </div>

      {showDocuments && <DocumentsModal onClose={() => setShowDocuments(false)} />}
      {showNouveauGroupe && (
        <GroupeContratModal
          onClose={() => setShowNouveauGroupe(false)}
          onCreated={() => {
            setShowNouveauGroupe(false)
            chargerDonnees()
          }}
        />
      )}
    </div>
  )
}