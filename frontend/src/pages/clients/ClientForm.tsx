import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import api from '../../api/axios'

interface ClientData {
  type_client: 'physique' | 'morale'
  nom_prenom: string
  numero_passeport_cin: string
  adresse: string
  raison_sociale: string
  registre_commerce: string
  siege_social: string
  email: string
  telephone: string
}

const EMPTY_CLIENT: ClientData = {
  type_client: 'physique',
  nom_prenom: '',
  numero_passeport_cin: '',
  adresse: '',
  raison_sociale: '',
  registre_commerce: '',
  siege_social: '',
  email: '',
  telephone: '',
}

export default function ClientForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<ClientData>(EMPTY_CLIENT)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isEditing) {
      api.get(`/clients/${id}/`).then((res) => setForm(res.data))
    }
  }, [id, isEditing])

  const handleChange = (field: keyof ClientData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isEditing) {
        await api.put(`/clients/${id}/`, form)
      } else {
        await api.post('/clients/', form)
      }
      navigate('/clients')
    } catch {
      setError("Erreur lors de l'enregistrement. Vérifiez les champs.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {isEditing ? 'Modifier le client' : 'Nouveau client'}
      </h1>

      {error && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded bg-white p-6 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type de client</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.type_client === 'physique'}
                onChange={() => handleChange('type_client', 'physique')}
              />
              Personne physique
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.type_client === 'morale'}
                onChange={() => handleChange('type_client', 'morale')}
              />
              Personne morale
            </label>
          </div>
        </div>

        {form.type_client === 'physique' ? (
          <>
            <Field label="Nom et prénom" value={form.nom_prenom} onChange={(v) => handleChange('nom_prenom', v)} required />
            <Field label="N° passeport / CIN" value={form.numero_passeport_cin} onChange={(v) => handleChange('numero_passeport_cin', v)} />
            <Field label="Adresse" value={form.adresse} onChange={(v) => handleChange('adresse', v)} />
          </>
        ) : (
          <>
            <Field label="Raison sociale" value={form.raison_sociale} onChange={(v) => handleChange('raison_sociale', v)} required />
            <Field label="Registre de commerce" value={form.registre_commerce} onChange={(v) => handleChange('registre_commerce', v)} />
            <Field label="Siège social" value={form.siege_social} onChange={(v) => handleChange('siege_social', v)} />
          </>
        )}

        <Field label="Email" type="email" value={form.email} onChange={(v) => handleChange('email', v)} required />
        <Field label="Téléphone" value={form.telephone} onChange={(v) => handleChange('telephone', v)} required />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}