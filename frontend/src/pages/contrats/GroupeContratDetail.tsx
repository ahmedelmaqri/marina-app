import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'

interface Contrat {
  id: number
  client: number
  bateau: number
  date_arrivee: string
  date_depart: string
  prix_total: string | null
  statut_signature: string
}

interface GroupeContrat {
  id: number
  nom: string
}

const SIGNATURE_LABELS: Record<string, string> = {
  a_envoyer: 'À envoyer',
  envoye: 'Envoyé',
  signe: 'Signé',
  archive: 'Archivé',
  resilie: 'Résilié',
}

export default function GroupeContratDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [groupe, setGroupe] = useState<GroupeContrat | null>(null)
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const charger = () => {
    Promise.all([
      api.get(`/groupes-contrats/${id}/`),
      api.get('/contrats-reservations/'),
    ]).then(([g, c]) => {
      setGroupe(g.data)
      setContrats(c.data.filter((ct: any) => String(ct.groupe_contrat) === id))
      setLoading(false)
    })
  }

  useEffect(() => {
    charger()
  }, [id])

  const envoyer = async (contratId: number) => {
    setError('')
    try {
      await api.post(`/contrats-reservations/${contratId}/envoyer/`)
      charger()
    } catch {
      setError("Erreur lors de l'envoi du contrat.")
    }
  }

  const cloturer = async (contratId: number) => {
    if (!confirm('Résilier ce contrat ?')) return
    setError('')
    try {
      await api.post(`/contrats-reservations/${contratId}/resilier/`, { frais: 0 })
      charger()
    } catch {
      setError('Erreur lors de la résiliation du contrat.')
    }
  }

  const modifier = (contratId: number) => {
    navigate(`/contrats/${contratId}`)
  }

  const creerAvenant = async (contratId: number) => {
    setError('')
    try {
      await api.post(`/contrats-reservations/${contratId}/creer_avenant/`)
      navigate(`/contrats/${contratId}`)
    } catch {
      setError("Erreur lors de la création de l'avenant.")
    }
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/contrats')} className="mb-1 text-sm text-gray-500 hover:underline">
            ← Contrats
          </button>
          <h1 className="text-2xl font-bold">{groupe?.nom}</h1>
        </div>
        <button
          onClick={() => navigate(`/contrats/nouveau?groupe=${id}`)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
        >
          Ajouter bateau
        </button>
      </div>

      {error && <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}

      <table className="w-full border-collapse bg-white shadow">
        <thead>
          <tr className="border-b bg-gray-100 text-left text-sm">
            <th className="p-3">ID</th>
            <th className="p-3">Client</th>
            <th className="p-3">Bateau</th>
            <th className="p-3">Début</th>
            <th className="p-3">Fin</th>
            <th className="p-3">Prix</th>
            <th className="p-3">Statut signature</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contrats.map((c) => (
            <tr key={c.id} className="border-b text-sm hover:bg-gray-50">
              <td className="p-3">#{c.id}</td>
              <td className="p-3">Client {c.client}</td>
              <td className="p-3">Bateau {c.bateau}</td>
              <td className="p-3">{new Date(c.date_arrivee).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{new Date(c.date_depart).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{c.prix_total ? `${c.prix_total} MAD` : '-'}</td>
              <td className="p-3">{SIGNATURE_LABELS[c.statut_signature] || c.statut_signature}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-3 text-xs">
                  {c.statut_signature === 'signe' ? (
                    <button onClick={() => creerAvenant(c.id)} className="text-blue-600 hover:underline">
                      Créer avenant
                    </button>
                  ) : (
                    <button onClick={() => modifier(c.id)} className="text-blue-600 hover:underline">
                      Modifier
                    </button>
                  )}

                  {c.statut_signature === 'a_envoyer' && (
                    <button onClick={() => envoyer(c.id)} className="text-emerald-600 hover:underline">
                      Envoyer
                    </button>
                  )}

                  {c.statut_signature !== 'resilie' && c.statut_signature !== 'archive' && (
                    <button onClick={() => cloturer(c.id)} className="text-red-600 hover:underline">
                      Clôturer
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {contrats.length === 0 && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-gray-400">Aucun contrat dans ce groupe.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
// import { useEffect, useState } from 'react'
// import { useNavigate, useParams } from 'react-router-dom'
// import api from '../../api/axios'

// interface Contrat {
//   id: number
//   client: number
//   bateau: number
//   date_arrivee: string
//   date_depart: string
//   prix_total: string | null
//   statut_signature: string
// }

// interface GroupeContrat {
//   id: number
//   nom: string
// }

// const SIGNATURE_LABELS: Record<string, string> = {
//   a_envoyer: 'À envoyer',
//   envoye: 'Envoyé',
//   signe: 'Signé',
//   archive: 'Archivé',
//   resilie: 'Résilié',
// }

// export default function GroupeContratDetail() {
//   const { id } = useParams()
//   const navigate = useNavigate()
//   const [groupe, setGroupe] = useState<GroupeContrat | null>(null)
//   const [contrats, setContrats] = useState<Contrat[]>([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState('')

//   // Popup résiliation
//   const [contratAResilier, setContratAResilier] = useState<Contrat | null>(null)
//   const [fraisResiliation, setFraisResiliation] = useState('0')
//   const [resiliationSubmitting, setResiliationSubmitting] = useState(false)
//   const [resiliationResultat, setResiliationResultat] = useState<{ montant_remboursement: number } | null>(null)

//   const charger = () => {
//     Promise.all([
//       api.get(`/groupes-contrats/${id}/`),
//       api.get('/contrats-reservations/'),
//     ]).then(([g, c]) => {
//       setGroupe(g.data)
//       setContrats(c.data.filter((ct: any) => String(ct.groupe_contrat) === id))
//       setLoading(false)
//     })
//   }

//   useEffect(() => {
//     charger()
//   }, [id])

//   const envoyer = async (contratId: number) => {
//     setError('')
//     try {
//       await api.post(`/contrats-reservations/${contratId}/envoyer/`)
//       charger()
//     } catch {
//       setError("Erreur lors de l'envoi du contrat.")
//     }
//   }

//   const modifier = (contratId: number) => {
//     navigate(`/contrats/${contratId}`)
//   }

//   const creerAvenant = async (contratId: number) => {
//     setError('')
//     try {
//       await api.post(`/contrats-reservations/${contratId}/creer_avenant/`)
//       navigate(`/contrats/${contratId}`)
//     } catch {
//       setError("Erreur lors de la création de l'avenant.")
//     }
//   }

//   const archiver = async (contratId: number) => {
//     if (!confirm('Archiver ce contrat ?')) return
//     setError('')
//     try {
//       await api.post(`/contrats-reservations/${contratId}/archiver/`)
//       charger()
//     } catch {
//       setError("Erreur lors de l'archivage du contrat.")
//     }
//   }

//   const ouvrirResiliation = (contrat: Contrat) => {
//     setContratAResilier(contrat)
//     setFraisResiliation('0')
//     setResiliationResultat(null)
//   }

//   const confirmerResiliation = async () => {
//     if (!contratAResilier) return
//     setResiliationSubmitting(true)
//     setError('')
//     try {
//       const { data } = await api.post(`/contrats-reservations/${contratAResilier.id}/resilier/`, {
//         frais: Number(fraisResiliation) || 0,
//       })
//       setResiliationResultat({ montant_remboursement: data.montant_remboursement })
//       charger()
//     } catch {
//       setError('Erreur lors de la résiliation du contrat.')
//     } finally {
//       setResiliationSubmitting(false)
//     }
//   }

//   if (loading) return <p>Chargement...</p>

//   return (
//     <div>
//       <div className="mb-6 flex items-center justify-between">
//         <div>
//           <button onClick={() => navigate('/contrats')} className="mb-1 text-sm text-gray-500 hover:underline">
//             ← Contrats
//           </button>
//           <h1 className="text-2xl font-bold">{groupe?.nom}</h1>
//         </div>
//         <button
//           onClick={() => navigate(`/contrats/nouveau?groupe=${id}`)}
//           className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
//         >
//           Ajouter bateau
//         </button>
//       </div>

//       {error && <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}

//       <table className="w-full border-collapse bg-white shadow">
//         <thead>
//           <tr className="border-b bg-gray-100 text-left text-sm">
//             <th className="p-3">ID</th>
//             <th className="p-3">Client</th>
//             <th className="p-3">Bateau</th>
//             <th className="p-3">Début</th>
//             <th className="p-3">Fin</th>
//             <th className="p-3">Prix</th>
//             <th className="p-3">Statut signature</th>
//             <th className="p-3">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {contrats.map((c) => (
//             <tr key={c.id} className="border-b text-sm hover:bg-gray-50">
//               <td className="p-3">#{c.id}</td>
//               <td className="p-3">Client {c.client}</td>
//               <td className="p-3">Bateau {c.bateau}</td>
//               <td className="p-3">{new Date(c.date_arrivee).toLocaleDateString('fr-FR')}</td>
//               <td className="p-3">{new Date(c.date_depart).toLocaleDateString('fr-FR')}</td>
//               <td className="p-3">{c.prix_total ? `${c.prix_total} MAD` : '-'}</td>
//               <td className="p-3">{SIGNATURE_LABELS[c.statut_signature] || c.statut_signature}</td>
//               <td className="p-3">
//                 <div className="flex flex-wrap gap-3 text-xs">
//                   {c.statut_signature === 'signe' ? (
//                     <button onClick={() => creerAvenant(c.id)} className="text-blue-600 hover:underline">
//                       Créer avenant
//                     </button>
//                   ) : (
//                     <button onClick={() => modifier(c.id)} className="text-blue-600 hover:underline">
//                       Modifier
//                     </button>
//                   )}

//                   {c.statut_signature === 'a_envoyer' && (
//                     <button onClick={() => envoyer(c.id)} className="text-emerald-600 hover:underline">
//                       Envoyer
//                     </button>
//                   )}

//                   {c.statut_signature !== 'signe' && c.statut_signature !== 'resilie' && c.statut_signature !== 'archive' && (
//                     <button onClick={() => archiver(c.id)} className="text-gray-600 hover:underline">
//                       Archiver
//                     </button>
//                   )}

//                   {c.statut_signature !== 'resilie' && c.statut_signature !== 'archive' && (
//                     <button onClick={() => ouvrirResiliation(c)} className="text-red-600 hover:underline">
//                       Résilier
//                     </button>
//                   )}
//                 </div>
//               </td>
//             </tr>
//           ))}
//           {contrats.length === 0 && (
//             <tr>
//               <td colSpan={8} className="p-6 text-center text-gray-400">Aucun contrat dans ce groupe.</td>
//             </tr>
//           )}
//         </tbody>
//       </table>

//       {contratAResilier && (
//         <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
//           <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
//             <h2 className="mb-4 text-lg font-bold">Résilier le contrat</h2>

//             {resiliationResultat ? (
//               <div>
//                 <p className="mb-4 text-sm text-green-700">
//                   Contrat résilié avec succès. Montant remboursé : <span className="font-semibold">{resiliationResultat.montant_remboursement} MAD</span>
//                 </p>
//                 <div className="flex justify-end">
//                   <button
//                     onClick={() => setContratAResilier(null)}
//                     className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
//                   >
//                     Fermer
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <>
//                 <div className="mb-4 rounded bg-gray-50 p-3 text-center">
//                   <p className="text-xs text-gray-500">Montant remboursement (estimation)</p>
//                   <p className="text-lg font-bold text-gray-800">
//                     {contratAResilier.prix_total ? `${contratAResilier.prix_total} MAD` : '-'}
//                   </p>
//                 </div>

//                 <p className="mb-2 text-sm text-gray-600">
//                   Ceci réduira le prix de la réservation. Souhaitez-vous facturer des frais au client ?
//                 </p>
//                 <div>
//                   <label className="mb-1 block text-sm font-medium text-gray-700">Montant frais</label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={fraisResiliation}
//                     onChange={(e) => setFraisResiliation(e.target.value)}
//                     className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
//                   />
//                 </div>

//                 <div className="mt-6 flex justify-end gap-3">
//                   <button
//                     onClick={() => setContratAResilier(null)}
//                     className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
//                   >
//                     Retour
//                   </button>
//                   <button
//                     onClick={confirmerResiliation}
//                     disabled={resiliationSubmitting}
//                     className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
//                   >
//                     {resiliationSubmitting ? 'Résiliation...' : 'Résilier contrat'}
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }