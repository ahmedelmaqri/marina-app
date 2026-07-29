import { useEffect, useState } from 'react'
import portailApi from '../api'

interface Bateau {
  id: number
  nom_navire: string
  type_bateau: string
  modele: string
  port_attache: string
  longueur: string
  largeur: string
  tirant_eau: string | null
  numero_immatriculation: string
  pavillon: string
  assurance: string
  numero_police: string
  echeance_assurance: string | null
}

const CHAMPS_VIDES = {
  nom_navire: '',
  type_bateau: '',
  modele: '',
  port_attache: '',
  longueur: '',
  largeur: '',
  tirant_eau: '',
  numero_immatriculation: '',
  pavillon: '',
  assurance: '',
  numero_police: '',
  echeance_assurance: '',
}

export default function PortailBateaux() {
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(CHAMPS_VIDES)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => {
    portailApi.get('/mes-bateaux/').then((res) => {
      setBateaux(res.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (champ: keyof typeof CHAMPS_VIDES, valeur: string) => {
    setForm((prev) => ({ ...prev, [champ]: valeur }))
  }

  const handleSubmit = async () => {
    if (!form.nom_navire || !form.longueur || !form.largeur) {
      setMessage('Le nom du bateau, la longueur et la largeur sont obligatoires.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await portailApi.post('/mes-bateaux/', {
        ...form,
        tirant_eau: form.tirant_eau || null,
        echeance_assurance: form.echeance_assurance || null,
      })
      setShowForm(false)
      setForm(CHAMPS_VIDES)
      load()
    } catch {
      setMessage("Erreur lors de l'ajout du bateau. Vérifiez les champs saisis.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Mes bateaux</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Ajouter un bateau
        </button>
      </div>

      {bateaux.length === 0 && (
        <p className="rounded bg-white p-6 text-sm text-gray-400 shadow">
          Vous n'avez encore ajouté aucun bateau.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {bateaux.map((b) => (
          <div key={b.id} className="rounded bg-white p-6 shadow">
            <p className="mb-3 text-lg font-bold">{b.nom_navire}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-medium">{b.type_bateau || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Modèle</p>
                <p className="font-medium">{b.modele || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Longueur</p>
                <p className="font-medium">{b.longueur}'</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Largeur</p>
                <p className="font-medium">{b.largeur}'</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assurance</p>
                <p className="font-medium">{b.assurance || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Port d'attache</p>
                <p className="font-medium">{b.port_attache || 'N/A'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Ajouter un bateau</h2>

            {message && (
              <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{message}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Nom du bateau *</label>
                <input
                  type="text"
                  value={form.nom_navire}
                  onChange={(e) => handleChange('nom_navire', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Type</label>
                  <input
                    type="text"
                    value={form.type_bateau}
                    onChange={(e) => handleChange('type_bateau', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Modèle</label>
                  <input
                    type="text"
                    value={form.modele}
                    onChange={(e) => handleChange('modele', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Longueur (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.longueur}
                    onChange={(e) => handleChange('longueur', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Largeur (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.largeur}
                    onChange={(e) => handleChange('largeur', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Tirant d'eau (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.tirant_eau}
                    onChange={(e) => handleChange('tirant_eau', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Port d'attache</label>
                  <input
                    type="text"
                    value={form.port_attache}
                    onChange={(e) => handleChange('port_attache', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Pavillon</label>
                  <input
                    type="text"
                    value={form.pavillon}
                    onChange={(e) => handleChange('pavillon', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Assurance</label>
                  <input
                    type="text"
                    value={form.assurance}
                    onChange={(e) => handleChange('assurance', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">N° de police</label>
                  <input
                    type="text"
                    value={form.numero_police}
                    onChange={(e) => handleChange('numero_police', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Échéance assurance</label>
                <input
                  type="date"
                  value={form.echeance_assurance}
                  onChange={(e) => handleChange('echeance_assurance', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Ajout...' : 'Ajouter le bateau'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
