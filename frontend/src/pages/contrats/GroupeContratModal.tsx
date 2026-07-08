import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/axios'

interface Document {
  id: number
  nom: string
}

interface FraisRemise {
  id: number
  categorie: string
  nom: string
  prix: string
}

const CATEGORIE_LABELS: Record<string, string> = {
  frais: 'Frais',
  remise: 'Remise',
  eau_electricite: 'Eau et Electricité',
}

export default function GroupeContratModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [documentsDisponibles, setDocumentsDisponibles] = useState<Document[]>([])

  const [nom, setNom] = useState('')
  const [documentsChoisis, setDocumentsChoisis] = useState<number[]>([])
  const [notesDocument, setNotesDocument] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [typeEspace, setTypeEspace] = useState('Bassin de plaisance')
  const [tarif, setTarif] = useState('')
  const [taxe, setTaxe] = useState('')
  const [structureTarifaire, setStructureTarifaire] = useState('')
  const [cycleFacturation, setCycleFacturation] = useState('')
  const [renouvellementAuto, setRenouvellementAuto] = useState(false)
  const [periodePersonnalisee, setPeriodePersonnalisee] = useState(false)
  const [dateDebutFacturation, setDateDebutFacturation] = useState('')
  const [dateFinFacturation, setDateFinFacturation] = useState('')

  // Frais & Remises (gérés seulement après création du groupe, comme un contrat en brouillon)
  const [fraisRemises, setFraisRemises] = useState<FraisRemise[]>([])
  const [groupeId, setGroupeId] = useState<number | null>(null)
  const [frCategorie, setFrCategorie] = useState('frais')
  const [frNom, setFrNom] = useState('')
  const [frPrix, setFrPrix] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/documents/').then((res) => setDocumentsDisponibles(res.data))
  }, [])

  const toggleDocument = (id: number) => {
    setDocumentsChoisis((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (documentsChoisis.length === 0) {
      setError('Sélectionnez au moins un document.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        nom,
        documents: documentsChoisis,
        notes_document: notesDocument,
        date_debut: dateDebut,
        date_fin: dateFin,
        type_espace: typeEspace,
        tarif: tarif || null,
        taxe: taxe || null,
        structure_tarifaire: structureTarifaire,
        cycle_facturation: cycleFacturation,
        renouvellement_automatique: renouvellementAuto,
        periode_facturation_personnalisee: periodePersonnalisee,
        date_debut_facturation: dateDebutFacturation || null,
        date_fin_facturation: dateFinFacturation || null,
      }

      if (groupeId) {
        await api.patch(`/groupes-contrats/${groupeId}/`, payload)
      } else {
        const res = await api.post('/groupes-contrats/', payload)
        setGroupeId(res.data.id)
      }
      onCreated()
    } catch {
      setError('Erreur lors de la création du groupe. Vérifiez les champs.')
    } finally {
      setLoading(false)
    }
  }

  const appliquerFrais = async () => {
    if (!frNom || !frPrix) {
      setError('Renseignez le nom et le prix du frais/remise.')
      return
    }

    // Si le groupe n'existe pas encore, on le crée d'abord (silencieusement) pour pouvoir lui rattacher le frais
    let idGroupe = groupeId
    if (!idGroupe) {
      if (!nom || !dateDebut || !dateFin) {
        setError('Renseignez au moins le nom et les dates du groupe avant d\'ajouter un frais.')
        return
      }
      try {
        const res = await api.post('/groupes-contrats/', {
          nom,
          documents: documentsChoisis,
          notes_document: notesDocument,
          date_debut: dateDebut,
          date_fin: dateFin,
          type_espace: typeEspace,
          tarif: tarif || null,
          taxe: taxe || null,
          structure_tarifaire: structureTarifaire,
          cycle_facturation: cycleFacturation,
          renouvellement_automatique: renouvellementAuto,
          periode_facturation_personnalisee: periodePersonnalisee,
          date_debut_facturation: dateDebutFacturation || null,
          date_fin_facturation: dateFinFacturation || null,
        })
        idGroupe = res.data.id
        setGroupeId(idGroupe)
      } catch {
        setError('Impossible de créer le groupe avant d\'appliquer le frais.')
        return
      }
    }

    try {
      const res = await api.post('/frais-remises-groupe/', {
        groupe: idGroupe,
        categorie: frCategorie,
        nom: frNom,
        prix: frPrix,
      })
      setFraisRemises((prev) => [...prev, res.data])
      setFrNom('')
      setFrPrix('')
      setError('')
    } catch {
      setError("Erreur lors de l'ajout du frais/remise.")
    }
  }

  const supprimerFrais = async (id: number) => {
    await api.delete(`/frais-remises-groupe/${id}/`)
    setFraisRemises((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/40 py-8">
      <div className="w-full max-w-3xl rounded bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold text-gray-800">Paramètres du groupe</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {error && <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
          {/* GENERAL */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-4">
            <span className="pt-2 text-sm font-medium text-gray-500">Général</span>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* DOCUMENTS */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-4">
            <span className="pt-2 text-sm font-medium text-gray-500">Documents</span>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Documents</label>
                <div className="space-y-1 rounded border border-gray-300 p-3">
                  {documentsDisponibles.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={documentsChoisis.includes(d.id)}
                        onChange={() => toggleDocument(d.id)}
                      />
                      {d.nom}
                    </label>
                  ))}
                  {documentsDisponibles.length === 0 && (
                    <p className="text-sm text-gray-400">Aucun document disponible.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Notes document</label>
                <textarea
                  value={notesDocument}
                  onChange={(e) => setNotesDocument(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* DATES */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-4">
            <span className="pt-2 text-sm font-medium text-gray-500">Dates</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Début</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Fin</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* ESPACE */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-4">
            <span className="pt-2 text-sm font-medium text-gray-500">Espace</span>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Type espace</label>
              <select
                value={typeEspace}
                onChange={(e) => setTypeEspace(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="Bassin de plaisance">Bassin de plaisance</option>
              </select>
            </div>
          </div>

          {/* FACTURATION */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-4">
            <span className="pt-2 text-sm font-medium text-gray-500">Facturation</span>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Tarif</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tarif}
                    onChange={(e) => setTarif(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="$"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Taxe</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxe}
                    onChange={(e) => setTaxe(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="%"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Structure tarification</label>
                  <select
                    value={structureTarifaire}
                    onChange={(e) => setStructureTarifaire(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="journaliere">Journalière</option>
                    <option value="mensuelle">Mensuelle</option>
                    <option value="annuelle">Annuelle</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Cycle de facturation</label>
                  <select
                    value={cycleFacturation}
                    onChange={(e) => setCycleFacturation(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="avance">À l'avance</option>
                    <option value="debut_mois">Début du mois</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={renouvellementAuto}
                    onChange={(e) => setRenouvellementAuto(e.target.checked)}
                  />
                  Renouvellement automatique des contrats
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={periodePersonnalisee}
                    onChange={(e) => setPeriodePersonnalisee(e.target.checked)}
                  />
                  Période de facturation personnalisée
                </label>
              </div>

              {periodePersonnalisee && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Date début facturation</label>
                    <input
                      type="date"
                      value={dateDebutFacturation}
                      onChange={(e) => setDateDebutFacturation(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Date fin facturation</label>
                    <input
                      type="date"
                      value={dateFinFacturation}
                      onChange={(e) => setDateFinFacturation(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FRAIS & REMISES */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-4">
            <span className="pt-2 text-sm font-medium text-gray-500">Frais &amp; Remises</span>
            <div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Catégorie</label>
                  <select
                    value={frCategorie}
                    onChange={(e) => setFrCategorie(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="frais">Frais</option>
                    <option value="remise">Remise</option>
                    <option value="eau_electricite">Eau et Electricité</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Nom</label>
                  <input
                    type="text"
                    value={frNom}
                    onChange={(e) => setFrNom(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Prix</label>
                  <input
                    type="number"
                    step="0.01"
                    value={frPrix}
                    onChange={(e) => setFrPrix(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="$"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={appliquerFrais}
                className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Appliquer frais
              </button>

              {fraisRemises.length > 0 && (
                <table className="mt-4 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1">Catégorie</th>
                      <th className="py-1">Nom</th>
                      <th className="py-1">Prix</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fraisRemises.map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="py-1">{CATEGORIE_LABELS[f.categorie] || f.categorie}</td>
                        <td className="py-1">{f.nom}</td>
                        <td className="py-1">{f.prix} $</td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            onClick={() => supprimerFrais(f.id)}
                            className="text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}