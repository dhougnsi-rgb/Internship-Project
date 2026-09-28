import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, UserRound, Plus, Wifi, WifiOff } from 'lucide-react'
import { apiCall, getApiErrorMessage, API_URL } from '../api'
import '../style/message.css'
import { useAppointments } from '../context/AppointmentContext'

type ChatMessage = {
  id: number
  sender: 'me' | 'them'
  text: string
  time: string
}

type PatientCategory = 'Hospitalise' | 'En Observation' | 'Ambulatoire' | 'Urgences' | 'Sortant'

type Conversation = {
  id: number
  nom: string
  category?: PatientCategory
  status: string
  preview: string
  unread: number
  messages: ChatMessage[]
  recipientId?: number | null
}

type PatientContact = {
  id: number
  nom: string
  category: PatientCategory
}

// ── WebSocket URL helper ──────────────────────────────────────────────────────
function wsUrl(): string {
  const base = API_URL.replace(/^http/, 'ws')
  const token = localStorage.getItem('token') ?? ''
  return `${base}/ws?token=${encodeURIComponent(token)}`
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [patients, setPatients] = useState<PatientContact[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false)
  const [newDiscussionSearch, setNewDiscussionSearch] = useState('')
  const [conversationsSearch, setConversationsSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { pendingNotification, clearNotification } = useAppointments()

  // ── Load history from backend ────────────────────────────────────────────
  useEffect(() => {
    apiCall('/messages')
      .then((data: any[]) => {
        const myId = (() => {
          try { return JSON.parse(localStorage.getItem('user') ?? '{}').id as number } catch { return -1 }
        })()

        // Group messages by conversation partner
        const convMap = new Map<number, Conversation>()
        for (const m of data) {
          const isMe = m.sender_id === myId
          const partnerId: number = isMe ? m.recipient_id : m.sender_id
          const partnerName: string = isMe ? (m.recipient_name ?? 'Inconnu') : (m.sender_name ?? 'Inconnu')
          if (!convMap.has(partnerId)) {
            convMap.set(partnerId, {
              id: partnerId,
              nom: partnerName,
              status: 'En ligne',
              preview: '',
              unread: 0,
              recipientId: partnerId,
              messages: [],
            })
          }
          const conv = convMap.get(partnerId)!
          conv.messages.push({
            id: m.id,
            sender: isMe ? 'me' : 'them',
            text: m.text,
            time: formatTime(m.created_at),
          })
          conv.preview = m.text
        }
        setConversations([...convMap.values()])
      })
      .catch(() => {/* silently ignore */})

    // Fetch patients for new-discussion picker
    apiCall('/patients')
      .then((data: { id: number; name: string; category: PatientCategory }[]) => {
        setPatients(data.map((p) => ({ id: p.id, nom: p.name, category: p.category })))
      })
      .catch(() => {})
  }, [])

  // ── WebSocket connection ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true

    function connect() {
      if (!active) return
      const ws = new WebSocket(wsUrl())
      wsRef.current = ws

      ws.onopen = () => { if (active) setWsConnected(true) }

      ws.onmessage = (evt) => {
        try {
          const frame = JSON.parse(evt.data)
          if (frame.type !== 'message') return
          const myId = (() => {
            try { return JSON.parse(localStorage.getItem('user') ?? '{}').id as number } catch { return -1 }
          })()
          const isMe = frame.sender_id === myId
          const partnerId: number = isMe ? frame.recipient_id : frame.sender_id
          const partnerName: string = isMe ? (frame.recipient_name ?? 'Inconnu') : (frame.sender_name ?? 'Inconnu')
          const newMsg: ChatMessage = {
            id: frame.id,
            sender: isMe ? 'me' : 'them',
            text: frame.text,
            time: formatTime(frame.created_at),
          }
          setConversations((prev) => {
            const existing = prev.find((c) => c.recipientId === partnerId)
            if (existing) {
              return prev.map((c) =>
                c.recipientId === partnerId
                  ? { ...c, preview: frame.text, messages: [...c.messages, newMsg], unread: c.unread + (isMe ? 0 : 1) }
                  : c
              )
            }
            return [{
              id: partnerId,
              nom: partnerName,
              status: 'En ligne',
              preview: frame.text,
              unread: isMe ? 0 : 1,
              recipientId: partnerId,
              messages: [newMsg],
            }, ...prev]
          })
        } catch { /* ignore bad frames */ }
      }

      ws.onerror = () => { /* handled by onclose */ }

      ws.onclose = () => {
        if (active) {
          setWsConnected(false)
          // Exponential back-off reconnect
          reconnectTimer.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      active = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [])

  // ── Reschedule notification injection ────────────────────────────────────
  useEffect(() => {
    if (!pendingNotification) return
    const { patientName, patientCategory, newDate, newTime } = pendingNotification
    const notifText = `Votre rendez-vous a été reprogrammé au ${newDate} à ${newTime}. Merci de votre compréhension.`
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    setConversations((prev) => {
      const existing = prev.find((c) => c.nom === patientName)
      if (existing) {
        return prev.map((c) =>
          c.nom === patientName
            ? { ...c, preview: notifText, unread: c.unread + 1, messages: [...c.messages, { id: Date.now(), sender: 'me' as const, text: notifText, time: now }] }
            : c
        )
      }
      return [{
        id: Date.now(),
        nom: patientName,
        category: patientCategory as PatientCategory,
        status: 'En ligne',
        preview: notifText,
        unread: 1,
        messages: [{ id: 1, sender: 'me' as const, text: notifText, time: now }],
      }, ...prev]
    })
    clearNotification()
  }, [pendingNotification, clearNotification])

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
  }, [selectedConversationId, conversations])

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) ?? conversations[0] ?? null

  const filteredConversations = useMemo(() => {
    const q = conversationsSearch.trim().toLowerCase()
    return conversations.filter((c) => !q || c.nom.toLowerCase().includes(q))
  }, [conversations, conversationsSearch])

  const patientsToStart = useMemo(() => {
    const q = newDiscussionSearch.trim().toLowerCase()
    return patients.filter((p) => !q || p.nom.toLowerCase().includes(q))
  }, [newDiscussionSearch, patients])

  const handleCreateConversation = (patient: PatientContact) => {
    const existing = conversations.find((c) => c.recipientId === patient.id)
    if (existing) {
      setSelectedConversationId(existing.id)
    } else {
      const newConv: Conversation = {
        id: patient.id,
        nom: patient.nom,
        category: patient.category,
        status: 'En ligne',
        preview: 'Nouvelle discussion démarrée.',
        unread: 0,
        recipientId: patient.id,
        messages: [],
      }
      setConversations((prev) => [newConv, ...prev])
      setSelectedConversationId(newConv.id)
    }
    setIsNewDiscussionOpen(false)
    setNewDiscussionSearch('')
  }

  const handleSend = () => {
    const text = messageInput.trim()
    if (!text || !selectedConversation) return
    setMessageInput('')

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send via WebSocket — the server will echo it back and persist it
      wsRef.current.send(JSON.stringify({
        type: 'message',
        recipient_id: selectedConversation.recipientId,
        text,
      }))
    } else {
      // Fallback: REST POST
      const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const tempMsg: ChatMessage = { id: Date.now(), sender: 'me', text, time: now }
      setConversations((prev) =>
        prev.map((c) => c.id === selectedConversation.id ? { ...c, preview: text, messages: [...c.messages, tempMsg] } : c)
      )
      if (selectedConversation.recipientId) {
        apiCall('/messages', {
          method: 'POST',
          body: JSON.stringify({ recipient_id: selectedConversation.recipientId, text }),
        }).catch((err) => console.error('Failed to send message:', getApiErrorMessage(err)))
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="message-page">
      {isNewDiscussionOpen && (
        <div className="discussion-modal-backdrop" onClick={() => setIsNewDiscussionOpen(false)}>
          <div className="discussion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="discussion-modal-header">
              <h3>Nouvelle discussion</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsNewDiscussionOpen(false)}>×</button>
            </div>
            <input
              type="text"
              className="discussion-search"
              placeholder="Rechercher un patient..."
              value={newDiscussionSearch}
              onChange={(e) => setNewDiscussionSearch(e.target.value)}
            />
            <div className="discussion-patient-list">
              {patientsToStart.length > 0 ? (
                patientsToStart.map((patient) => (
                  <button
                    type="button"
                    key={patient.id}
                    className="discussion-patient-item"
                    onClick={() => handleCreateConversation(patient)}
                  >
                    <div className="conversation-avatar"><UserRound size={20} /></div>
                    <div className="discussion-patient-meta"><strong>{patient.nom}</strong><small>{patient.category}</small></div>
                  </button>
                ))
              ) : (
                <div className="empty-state">Aucun patient trouvé.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="messaging-shell">
        <aside className="conversation-sidebar">
          <div className="sidebar-header">
            <h2>Conversations</h2>
            <div className="sidebar-header-actions">
              <span
                className={`ws-indicator ${wsConnected ? 'connected' : 'disconnected'}`}
                title={wsConnected ? 'Connecté en temps réel' : 'Reconnexion...'}
              >
                {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              </span>
              <button type="button" className="new-message-btn" onClick={() => setIsNewDiscussionOpen(true)}>
                <Plus size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
          <input
            type="text"
            className="conversations-search"
            placeholder="Rechercher..."
            value={conversationsSearch}
            onChange={(e) => setConversationsSearch(e.target.value)}
          />
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <button
                type="button"
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedConversationId(conv.id)
                  setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c))
                }}
              >
                <div className="conversation-avatar"><UserRound size={20} /></div>
                <div className="conversation-copy">
                  <div className="conversation-topline">
                    <h3>{conv.nom}</h3>
                    <span>{conv.messages[conv.messages.length - 1]?.time ?? ''}</span>
                  </div>
                  <p>{conv.preview}</p>
                </div>
                {conv.unread > 0 && <span className="conversation-badge">{conv.unread}</span>}
              </button>
            ))
          ) : (
            <div className="empty-state">{conversationsSearch ? 'Aucune conversation trouvée.' : 'Aucune conversation.'}</div>
          )}
        </aside>

        <section className="chat-panel">
          {selectedConversation ? (
            <>
              <header className="chat-header">
                <div className="chat-user">
                  <div className="conversation-avatar large"><UserRound size={32} /></div>
                  <div>
                    <h3>{selectedConversation.nom}</h3>
                    <span>{selectedConversation.status}</span>
                  </div>
                </div>
              </header>

              <div className="chat-body" ref={chatBodyRef}>
                {selectedConversation.messages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'me' ? 'me' : 'them'}`}>
                    <div className="chat-bubble">
                      <p>{msg.text}</p>
                      <time>{msg.time}</time>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-composer">
                <input
                  type="text"
                  placeholder="Écrire un message..."
                  aria-label="Message input"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button type="button" onClick={handleSend}><Send size={16} aria-hidden="true" /> Envoyer</button>
              </div>
            </>
          ) : (
            <div className="empty-state chat-empty">Sélectionnez une conversation.</div>
          )}
        </section>
      </div>
    </div>
  )
}
