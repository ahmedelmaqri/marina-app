import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import portailApi from '../api'

function extraireMessagesErreur(data: unknown): string[] {
  if (!data || typeof data !== 'object') return ["Une erreur est survenue."]
  return Object.values(data as Record<string, unknown>).flatMap((v) =>
    Array.isArray(v) ? v.map(String) : [String(v)]
  )
}

export default function PortailActivation() {
  const [clientId, setClientId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors([])

    if (password !== passwordConfirmation) {
      setErrors(['Les mots de passe ne correspondent pas.'])
      return
    }

    setLoading(true)
    try {
      await portailApi.post('/activation/', {
        client_id: Number(clientId),
        email,
        password,
      })
      setSuccess(true)
    } catch (err: any) {
      setErrors(extraireMessagesErreur(err.response?.data))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="mb-4 text-xl font-bold text-gray-800">Compte activé</h1>
          <p className="mb-6 text-sm text-gray-600">
            Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter.
          </p>
          <button
            onClick={() => navigate('/portail/login')}
            className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
          >
            Aller à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Activer mon compte</h1>
        <p className="mb-6 text-sm text-gray-500">
          Renseignez votre identifiant client et l'e-mail associé à votre fiche, tels que
          communiqués par la marina.
        </p>

        {errors.length > 0 && (
          <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
            {errors.map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Identifiant client
          </label>
          <input
            type="number"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Adresse e-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            minLength={8}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Activation...' : 'Activer mon compte'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Déjà activé ?{' '}
          <Link to="/portail/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  )
}
