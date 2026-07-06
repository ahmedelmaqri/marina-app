import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

interface Option {
  id: number
  label: string
}

interface Bateau {
  id: number
  client: number
  nom_navire: string
}

export default function ContratForm() {
  const navigate = useNavigate()

  const [clients, setClients] = useState<Option[]>([])
  const [bateaux, setBateaux] = useState<Bateau[]>([])
  const [groupesContrat, setGroupesContrat] = useState<Option[]>([])
  const [grillesTarifaires, setGrillesTarifaires] = useState<Option[]>([])

  const [clientId, setClientId] = useState('')
  const [bateauId, setBateauId] = useState('')
  const [groupeContratId, setGroupeContratId] = useState('')
  const [grilleTarifaireId, setGrilleTarifaireId] = useState('')
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [typeBassin, setTypeBassin] = useState('')
  const [note, setNote] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/clients/').then((res) =>
      setClients(res.data.map((c: any) => ({ id: c.id, label: c.nom_prenom || c.raison_sociale })))
    )
    api.get('/bateaux/').then((res) => setBateaux(res.data))
    api.get('/groupes-contrats/').then((res) =>
      setGroupesContrat(res.data.map((g: any) => ({ id: g.id, label: g.nom })))
    )
    api.get('/grilles-tarifaires/').then((res) =>
      setGrillesTarifaires(res.data.map((g: any) => ({ id: g.id, label: g.nom })))
    )
  }, [])

  const bateauxDuClient = bateaux.filter((b) => String(b.client) === clientId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/contrats-reservations/', {
        client: Number(clientId),
        bateau: Number(bateauId),
        groupe_contrat: Number(groupeContratId),
        grille_tarifaire: grilleTarifaireId ? Number(grilleTarifaireId) : null,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
        type_bassin: typeBassin,
        note,
      })
      navigate('/contrats')
    } catch {
      setError("Erreur lors de la création du contrat. Vérifiez les champs.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nouveau contrat</h1>

      {error && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded bg-white p-6 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Client</label>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setBateauId('')
            }}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">-- Sélectionner --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bateau</label>
          <select
            value={bateauId}
            onChange={(e) => setBateauId(e.target.value)}
            required
            disabled={!clientId}
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">-- Sélectionner --</option>
            {bateauxDuClient.map((b) => (
              <option key={b.id} value={b.id}>{b.nom_navire}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Groupe de contrat</label>
          <select
            value={groupeContratId}
            onChange={(e) => setGroupeContratId(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">-- Sélectionner --</option>
            {groupesContrat.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Grille tarifaire</label>
          <select
            value={grilleTarifaireId}
            onChange={(e) => setGrilleTarifaireId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">-- Aucune --</option>
            {grillesTarifaires.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date début</label>
            <input
              type="date"
              value={dateArrivee}
              onChange={(e) => setDateArrivee(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date fin</label>
            <input
              type="date"
              value={dateDepart}
              onChange={(e) => setDateDepart(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type d'espace</label>
          <input
            type="text"
            value={typeBassin}
            onChange={(e) => setTypeBassin(e.target.value)}
            placeholder="Ex: Bassin de plaisance"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le contrat'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/contrats')}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}