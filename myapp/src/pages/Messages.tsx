import { useEffect, useMemo, useState, useRef } from 'react'
import { Send, UserRound, Plus } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'
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

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [patients, setPatients] = useState<PatientContact[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false)
  const [newDiscussionSearch, setNewDiscussionSearch] = useState('')
  const [conversationsSearch, setConversationsSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const chatBodyRef = useRef<HTMLDivElement>(null)

  const { pendingNotification, clearNotification } = useAppointments()

  // Fetch patients for the "new discussion" picker
  useEffect(() => {
    apiCall('/patients')
      .then((data: { id: number; name: string; category: PatientCategory }[]) => {
        setPatients(data.map((p) => ({ id: p.id, nom: p.name, category: p.category })))
      })
      .catch(() => {/* silently ignore — staff role may not have access */})
  }, [])

  // Inject reschedule notifications into conversations
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
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
    const existing = conversations.find((c) => c.nom === patient.nom)
    if (existing) {
      setSelectedConversationId(existing.id)
    } else {
      const newConv: Conversation = {
        id: Date.now(),
        nom: patient.nom,
        category: patient.category,
        status: 'En ligne',
        preview: 'Nouvelle discussion démarrée.',
        unread: 0,
        recipientId: patient.id,
        messages: [{
          id: 1,
          sender: 'me',
          text: `Bonjour ${patient.nom}, comment puis-je vous aider aujourd'hui ?`,
          time: 'Maintenant',
        }],
      }
      setConversations((prev) => [newConv, ...prev])
      setSelectedConversationId(newConv.id)
    }
    setIsNewDiscussionOpen(false)
    setNewDiscussionSearch('')
  }

  const handleSend = async () => {
    const text = messageInput.trim()
    if (!text || !selectedConversation) return

    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const tempMessage: ChatMessage = { id: Date.now(), sender: 'me', text, time: now }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, preview: text, messages: [...c.messages, tempMessage] }
          : c
      )
    )
    setMessageInput('')

    // Persist to backend if we have a recipient
    if (selectedConversation.recipientId) {
      try {
        await apiCall('/messages', {
          method: 'POST',
          body: JSON.stringify({ recipient_id: selectedConversation.recipientId, text }),
        })
      } catch (error) {
        console.error('Failed to send message:', getApiErrorMessage(error))
        // Message shown locally even if network fails
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
                onClick={() => { setSelectedConversationId(conv.id); setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c)) }}
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
