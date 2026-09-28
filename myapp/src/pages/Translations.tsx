/**
 * Translations.tsx — Web dashboard page for doctors/staff to read
 * patient translations (Ghomala → French) submitted via the mobile app.
 *
 * Shows each translation with the original dialect text, the French
 * translation, the language pair, entry type (text/voice), and timestamp.
 */
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Languages, Mic, Type, Search } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'

type Translation = {
  id: number
  user_id: number | null
  langue_source: string
  langue_cible: string
  type_entree: string | null
  message_original: string | null
  transcription: string | null
  traduction: string | null
  created_at: string | null
}

function LanguageBadge({ src, tgt }: { src: string; tgt: string }) {
  const srcLabel = src === 'ghomala' ? "Ghomala'" : 'Français'
  const tgtLabel = tgt === 'ghomala' ? "Ghomala'" : 'Français'
  const isGhomalaToFr = src === 'ghomala'
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
        background: isGhomalaToFr ? '#ede9fe' : '#e0f2fe',
        color: isGhomalaToFr ? '#6d28d9' : '#0369a1',
      }}
    >
      <Languages size={12} />
      {srcLabel} → {tgtLabel}
    </span>
  )
}

function EntryTypeBadge({ type }: { type: string | null }) {
  const isVoice = type === 'vocal'
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
        background: isVoice ? '#fef9c3' : '#f1f5f9',
        color: isVoice ? '#92400e' : '#475569',
      }}
    >
      {isVoice ? <Mic size={12} /> : <Type size={12} />}
      {isVoice ? 'Vocal' : 'Texte'}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Translations() {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterDir, setFilterDir] = useState<'all' | 'ghomala_to_fr' | 'fr_to_ghomala'>('all')

  useEffect(() => {
    apiCall('/translations/all')
      .then((data: Translation[]) => { setTranslations(data); setError('') })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = translations
    if (filterDir === 'ghomala_to_fr') result = result.filter((t) => t.langue_source === 'ghomala')
    if (filterDir === 'fr_to_ghomala') result = result.filter((t) => t.langue_source !== 'ghomala')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        (t.message_original ?? '').toLowerCase().includes(q) ||
        (t.traduction ?? '').toLowerCase().includes(q) ||
        (t.transcription ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [translations, filterDir, search])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Communication patient
        </p>
        <h1 style={{ margin: '4px 0 8px', fontSize: '1.8rem', fontWeight: 700 }}>
          Traductions
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
          Historique des traductions Ghomala ↔ Français soumises par les patients via l'application mobile.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher dans les traductions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              border: '1px solid #d1d5db', borderRadius: 10, fontSize: '0.9rem',
              background: '#f9fafb', boxSizing: 'border-box',
            }}
          />
        </div>
        {(['all', 'ghomala_to_fr', 'fr_to_ghomala'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterDir(f)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              border: '1px solid',
              borderColor: filterDir === f ? '#0066ff' : '#d1d5db',
              background: filterDir === f ? '#0066ff' : '#f9fafb',
              color: filterDir === f ? '#fff' : '#374151',
            }}
          >
            {f === 'all' ? 'Toutes' : f === 'ghomala_to_fr' ? "Ghomala → Français" : "Français → Ghomala"}
          </button>
        ))}
        <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <p style={{ color: '#dc2626', padding: 16 }}>{error}</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <Languages size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: 600, margin: 0 }}>Aucune traduction trouvée.</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Les traductions apparaissent ici lorsque des patients utilisent l'application mobile.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 14, padding: 20,
                borderLeft: t.langue_source === 'ghomala' ? '4px solid #7c3aed' : '4px solid #0066ff',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                <LanguageBadge src={t.langue_source} tgt={t.langue_cible} />
                <EntryTypeBadge type={t.type_entree} />
                <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '0.78rem' }}>
                  {formatDate(t.created_at)}
                </span>
              </div>

              {/* Content grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Original ({t.langue_source === 'ghomala' ? "Ghomala'" : 'Français'})
                  </p>
                  <p style={{ margin: 0, color: '#1f2937', lineHeight: 1.6 }}>
                    {t.message_original || t.transcription || <em style={{ color: '#94a3b8' }}>—</em>}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Traduction ({t.langue_cible === 'ghomala' ? "Ghomala'" : 'Français'})
                  </p>
                  <p style={{ margin: 0, color: '#1f2937', lineHeight: 1.6, fontWeight: t.langue_cible !== 'ghomala' ? 500 : 400 }}>
                    {t.traduction || <em style={{ color: '#94a3b8' }}>Non disponible</em>}
                  </p>
                </div>
              </div>

              {/* Transcription (voice entries) */}
              {t.type_entree === 'vocal' && t.transcription && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400e' }}>
                    <Mic size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    <strong>Transcription vocale :</strong> {t.transcription}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
