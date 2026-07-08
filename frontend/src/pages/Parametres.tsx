import { useEffect, useState } from 'react'
import api from '../api/axios'

type Onglet = 'utilisateurs' | 'groupes' | 'places' | 'articles'

interface Utilisateur {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface GroupeDePlaces {
  id: number
  nom: string
  type_bassin: string
  longueur_min: string | null
  longueur_max: string | null
  largeur_min: string | null
  largeur_max: string | null
}

interface Place {
  id: number
  nom: string
  type_place: string
  groupe_de_places: number | null
}

interface ArticleCharge {
  id: number
  nom: string
  categorie: string
  taxe: string | null
  prix: string
}

export default function Parametres() {
  const [onglet, setOnglet] = useState<Onglet>('utilisateurs')

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <span>⚙️</span> Paramètres
      </h1>

      <div className="mb-6 flex gap-6 border-b text-sm">
        {(
          [
            { key: 'utilisateurs', label: 'Utilisateurs' },
            { key: 'groupes', label: 'Groupe de places' },
            { key: 'places', label: 'Places' },
            { key: 'articles', label: 'Articles des charges' },
          ] as { key: Onglet; label: string }[]
        ).map((o) => (
          <button
            key={o.key}
            onClick={() => setOnglet(o.key)}
            className={`-mb-px border-b-2 pb-2 font-medium ${
              onglet === o.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'utilisateurs' && <OngletUtilisateurs />}
      {onglet === 'groupes' && <OngletGroupesPlaces />}
      {onglet === 'places' && <OngletPlaces />}
      {onglet === 'articles' && <OngletArticlesCharges />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UTILISATEURS
// ---------------------------------------------------------------------------

function OngletUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '', role: 'gestionnaire', password: '',
  })
  const [error, setError] = useState('')

  const load = () => {
    api.get('/utilisateurs/').then((res) => setUtilisateurs(res.data))
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm({ username: '', email: '', first_name: '', last_name: '', role: 'gestionnaire', password: '' })
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const commencerEdition = (u: Utilisateur) => {
    setForm({ username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role, password: '' })
    setEditingId(u.id)
    setShowForm(true)
  }

  const enregistrer = async () => {
    setError('')
    try {
      const payload: any = { ...form }
      if (!payload.password) delete payload.password

      if (editingId) {
        await api.patch(`/utilisateurs/${editingId}/`, payload)
      } else {
        if (!form.password) {
          setError('Le mot de passe est requis pour créer un utilisateur.')
          return
        }
        await api.post('/utilisateurs/', payload)
      }
      resetForm()
      load()
    } catch {
      setError("Erreur lors de l'enregistrement. Vérifiez les champs (nom d'utilisateur unique).")
    }
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return
    await api.delete(`/utilisateurs/${id}/`)
    load()
  }

  return (
    <div className="rounded bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Utilisateurs</h2>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          {showForm ? 'Annuler' : '+ Nouvel utilisateur'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 rounded border border-gray-200 p-3">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Prénom"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Nom"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="gestionnaire">Gestionnaire</option>
            </select>
            <input
              type="password"
              placeholder={editingId ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button onClick={enregistrer} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            Enregistrer
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Nom d'utilisateur</th>
            <th className="p-2">Email</th>
            <th className="p-2">Nom complet</th>
            <th className="p-2">Rôle</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {utilisateurs.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-2">{u.username}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.first_name} {u.last_name}</td>
              <td className="p-2 capitalize">{u.role}</td>
              <td className="p-2">
                <div className="flex gap-3">
                  <button onClick={() => commencerEdition(u)} className="text-blue-600 hover:underline">
                    Modifier
                  </button>
                  <button onClick={() => supprimer(u.id)} className="text-red-600 hover:underline">
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GROUPE DE PLACES
// ---------------------------------------------------------------------------

function OngletGroupesPlaces() {
  const [groupes, setGroupes] = useState<GroupeDePlaces[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [typeBassin, setTypeBassin] = useState('')
  const [longueurMin, setLongueurMin] = useState('')
  const [longueurMax, setLongueurMax] = useState('')
  const [largeurMin, setLargeurMin] = useState('')
  const [largeurMax, setLargeurMax] = useState('')

  const load = () => {
    api.get('/groupes-places/').then((res) => setGroupes(res.data))
  }

  useEffect(() => {
    load()
  }, [])

  const creer = async () => {
    if (!nom) return
    await api.post('/groupes-places/', {
      nom,
      type_bassin: typeBassin,
      longueur_min: longueurMin || null,
      longueur_max: longueurMax || null,
      largeur_min: largeurMin || null,
      largeur_max: largeurMax || null,
    })
    setNom('')
    setTypeBassin('')
    setLongueurMin('')
    setLongueurMax('')
    setLargeurMin('')
    setLargeurMax('')
    setShowForm(false)
    load()
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer ce groupe de places ?')) return
    await api.delete(`/groupes-places/${id}/`)
    load()
  }

  return (
    <div className="rounded bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Groupe de places</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          Nouveau groupe de places
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 rounded border border-gray-200 p-3">
          <input
            type="text"
            placeholder="Nom du groupe"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Type de bassin"
            value={typeBassin}
            onChange={(e) => setTypeBassin(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="Longueur min" value={longueurMin} onChange={(e) => setLongueurMin(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Longueur max" value={longueurMax} onChange={(e) => setLongueurMax(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Largeur min" value={largeurMin} onChange={(e) => setLargeurMin(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Largeur max" value={largeurMax} onChange={(e) => setLargeurMax(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={creer} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            Créer
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Nom</th>
            <th className="p-2">Type de bassin</th>
            <th className="p-2">Longueur</th>
            <th className="p-2">Largeur</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {groupes.map((g) => (
            <tr key={g.id} className="border-b">
              <td className="p-2">{g.nom}</td>
              <td className="p-2">{g.type_bassin || '-'}</td>
              <td className="p-2">{g.longueur_min || '?'}m - {g.longueur_max || '?'}m</td>
              <td className="p-2">{g.largeur_min || '?'}m - {g.largeur_max || '?'}m</td>
              <td className="p-2">
                <button onClick={() => supprimer(g.id)} className="text-red-600 hover:underline">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PLACES
// ---------------------------------------------------------------------------

function OngletPlaces() {
  const [places, setPlaces] = useState<Place[]>([])
  const [groupes, setGroupes] = useState<GroupeDePlaces[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [typePlace, setTypePlace] = useState('')
  const [groupeChoisi, setGroupeChoisi] = useState('')

  const load = () => {
    api.get('/places/').then((res) => setPlaces(res.data))
    api.get('/groupes-places/').then((res) => setGroupes(res.data))
  }

  useEffect(() => {
    load()
  }, [])

  const creer = async () => {
    if (!nom) return
    await api.post('/places/', {
      nom,
      type_place: typePlace,
      groupe_de_places: groupeChoisi ? Number(groupeChoisi) : null,
    })
    setNom('')
    setTypePlace('')
    setGroupeChoisi('')
    setShowForm(false)
    load()
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer cette place ?')) return
    await api.delete(`/places/${id}/`)
    load()
  }

  return (
    <div className="rounded bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Places</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          Nouvelle place
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 rounded border border-gray-200 p-3">
          <input
            type="text"
            placeholder="Nom de la place"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={typePlace}
            onChange={(e) => setTypePlace(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">-- Type de place --</option>
            <option value="ponton">Ponton</option>
            <option value="quai">Quai</option>
            <option value="mouillage">Mouillage</option>
          </select>
          <select
            value={groupeChoisi}
            onChange={(e) => setGroupeChoisi(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">-- Groupe de places attribué --</option>
            {groupes.map((g) => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>
          <button onClick={creer} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            Ajouter place
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Nom de la place</th>
            <th className="p-2">Type de place</th>
            <th className="p-2">Groupe de places attribué</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {places.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.nom}</td>
              <td className="p-2">{p.type_place || '-'}</td>
              <td className="p-2">{groupes.find((g) => g.id === p.groupe_de_places)?.nom || 'N/A'}</td>
              <td className="p-2">
                <button onClick={() => supprimer(p.id)} className="text-red-600 hover:underline">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ARTICLES DES CHARGES
// ---------------------------------------------------------------------------

function OngletArticlesCharges() {
  const [articles, setArticles] = useState<ArticleCharge[]>([])
  const [showForm, setShowForm] = useState(false)
  const [categorie, setCategorie] = useState('autres')
  const [nom, setNom] = useState('')
  const [taxe, setTaxe] = useState('')
  const [prix, setPrix] = useState('')

  const load = () => {
    api.get('/articles-charges/').then((res) => setArticles(res.data))
  }

  useEffect(() => {
    load()
  }, [])

  const creer = async () => {
    if (!nom || !prix) return
    await api.post('/articles-charges/', {
      nom,
      categorie,
      taxe: taxe || null,
      prix,
    })
    setNom('')
    setTaxe('')
    setPrix('')
    setShowForm(false)
    load()
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer cet article ?')) return
    await api.delete(`/articles-charges/${id}/`)
    load()
  }

  return (
    <div className="rounded bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Articles charge bateau</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          Nouvel article
        </button>
      </div>

      {showForm && (
        <div className="mb-4 grid grid-cols-4 gap-2 rounded border border-gray-200 p-3">
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="electricite">Electricité</option>
            <option value="provisions">Provisions</option>
            <option value="services">Services</option>
            <option value="autres">Autres</option>
          </select>
          <input
            type="text"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Taxe (optionnel)"
            value={taxe}
            onChange={(e) => setTaxe(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Prix par article"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button onClick={creer} className="col-span-4 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            Créer article
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Nom</th>
            <th className="p-2">Catégorie</th>
            <th className="p-2">Prix par article</th>
            <th className="p-2">Taxe</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.nom}</td>
              <td className="p-2 capitalize">{a.categorie}</td>
              <td className="p-2">{a.prix} MAD</td>
              <td className="p-2">{a.taxe ? `${a.taxe}%` : '-'}</td>
              <td className="p-2">
                <button onClick={() => supprimer(a.id)} className="text-red-600 hover:underline">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}