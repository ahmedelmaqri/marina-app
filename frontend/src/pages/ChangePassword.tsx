import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function ChangePassword() {
  const navigate = useNavigate()

  const [ancienMotDePasse, setAncienMotDePasse] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur('')
    setSucces('')

    if (nouveauMotDePasse !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    if (nouveauMotDePasse.length < 8) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/changer-mot-de-passe/', {
        ancien_mot_de_passe: ancienMotDePasse,
        nouveau_mot_de_passe: nouveauMotDePasse,
      })
      setSucces('Mot de passe modifié avec succès.')
      setAncienMotDePasse('')
      setNouveauMotDePasse('')
      setConfirmation('')
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Une erreur est survenue lors du changement de mot de passe."
      setErreur(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Changer mot de passe</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:underline">
          ← Retour
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded bg-white p-6 shadow">
        {erreur && (
          <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-700">{erreur}</div>
        )}
        {succes && (
          <div className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">{succes}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Ancien mot de passe
          </label>
          <input
            type="password"
            required
            value={ancienMotDePasse}
            onChange={(e) => setAncienMotDePasse(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            required
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirmer le nouveau mot de passe
          </label>
          <input
            type="password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Changer le mot de passe'}
        </button>
      </form>
    </div>
  )
}