/**
 * MessagesScreen — two-way chat between patients and medical staff.
 *
 * Architecture:
 *  - On mount: loads full message history from GET /messages, groups by
 *    conversation partner (the other person in each exchange).
 *  - WebSocket /ws?token=<jwt> keeps the inbox live. New frames update the
 *    correct conversation instantly without polling.
 *  - Sending: uses WebSocket when connected, falls back to POST /messages.
 *  - Two views: inbox list → conversation thread (mirroring the web dashboard).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  API_URL,
  ChatMessageData,
  getChatMessages,
  getCurrentUser,
  getApiErrorMessage,
  sendChatMessage,
  User,
  apiClient,
} from '@/api/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  partnerId: number | null;
  partnerName: string;
  messages: ChatMessageData[];
  unread: number;
}

// ── WebSocket URL ─────────────────────────────────────────────────────────────

async function buildWsUrl(): Promise<string> {
  const token = (await AsyncStorage.getItem('access_token')) ?? '';
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/ws?token=${encodeURIComponent(token)}`;
}

// ── Group flat messages into conversations ────────────────────────────────────

function groupMessages(
  msgs: ChatMessageData[],
  myId: number | string | null | undefined,
): Map<number | null, Conversation> {
  const map = new Map<number | null, Conversation>();
  for (const m of msgs) {
    const isMe = String(m.sender_id) === String(myId);
    const partnerId = isMe ? m.recipient_id : m.sender_id;
    const partnerName = isMe
      ? (m.recipient_name ?? 'Équipe médicale')
      : (m.sender_name ?? 'Équipe médicale');

    if (!map.has(partnerId)) {
      map.set(partnerId, { partnerId, partnerName, messages: [], unread: 0 });
    }
    map.get(partnerId)!.messages.push(m);
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const [me, setMe] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList<ChatMessageData>>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConv;

  // ── Load history ────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (user: User) => {
    try {
      const msgs = await getChatMessages();
      const grouped = groupMessages(msgs, user.id);
      setConversations([...grouped.values()]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setMe(u);
        loadHistory(u);
      })
      .catch(() => setLoading(false));
  }, [loadHistory]);

  // ── WebSocket ───────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function connect() {
      if (!active) return;
      const url = await buildWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => { if (active) setWsConnected(true); };

      ws.onmessage = (evt) => {
        try {
          const frame: ChatMessageData & { type: string } = JSON.parse(evt.data);
          if (frame.type !== 'message') return;

          const myId = me?.id;
          const isMe = String(frame.sender_id) === String(myId);
          const partnerId = isMe ? frame.recipient_id : frame.sender_id;
          const partnerName = isMe
            ? (frame.recipient_name ?? 'Équipe médicale')
            : (frame.sender_name ?? 'Équipe médicale');

          setConversations((prev) => {
            const existing = prev.find((c) => c.partnerId === partnerId);
            const newMsg: ChatMessageData = frame;
            if (existing) {
              return prev.map((c) =>
                c.partnerId === partnerId
                  ? {
                      ...c,
                      messages: [...c.messages, newMsg],
                      unread:
                        activeConvRef.current?.partnerId === partnerId
                          ? 0
                          : c.unread + (isMe ? 0 : 1),
                    }
                  : c,
              );
            }
            return [
              ...prev,
              {
                partnerId,
                partnerName,
                messages: [newMsg],
                unread: isMe ? 0 : 1,
              },
            ];
          });

          // Auto-scroll if in active conversation
          if (activeConvRef.current?.partnerId === partnerId) {
            setTimeout(
              () => flatListRef.current?.scrollToEnd({ animated: true }),
              80,
            );
          }
        } catch { /* ignore bad frames */ }
      };

      ws.onerror = () => { /* handled by onclose */ };
      ws.onclose = () => {
        if (active) {
          setWsConnected(false);
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();
    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [me]);

  // ── Send ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeConv) return;
    setInput('');
    setSending(true);

    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            recipient_id: activeConv.partnerId,
            text,
          }),
        );
      } else {
        // REST fallback
        const saved = await sendChatMessage({
          recipient_id: activeConv.partnerId,
          recipient_name: activeConv.partnerName,
          text,
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.partnerId === activeConv.partnerId
              ? { ...c, messages: [...c.messages, saved] }
              : c,
          ),
        );
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          80,
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const openConversation = (conv: Conversation) => {
    // Clear unread
    setConversations((prev) =>
      prev.map((c) => (c.partnerId === conv.partnerId ? { ...c, unread: 0 } : c)),
    );
    setActiveConv(conv);
  };

  // ── Render: conversation thread ─────────────────────────────────────────
  if (activeConv) {
    const myId = me?.id;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setActiveConv(null)}
            style={styles.backBtn}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color="#0878F9" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeConv.partnerName}
            </Text>
            <Text style={styles.wsStatus}>
              {wsConnected ? '🟢 Connecté' : '🔴 Hors ligne'}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <FlatList
            ref={flatListRef}
            data={activeConv.messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item }) => {
              const isMe = String(item.sender_id) === String(myId);
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    isMe ? styles.bubbleRowMe : styles.bubbleRowThem,
                  ]}
                >
                  {!isMe && (
                    <View style={styles.avatarSmall}>
                      <Ionicons name="person" size={14} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleThem,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isMe && styles.bubbleTextMe,
                      ]}
                    >
                      {item.text}
                    </Text>
                    {item.created_at && (
                      <Text style={styles.bubbleTime}>
                        {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder="Écrire un message..."
              placeholderTextColor="#94A3B8"
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!sending}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!input.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
              accessibilityLabel="Envoyer"
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Render: inbox ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#0878F9" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, marginLeft: 12 }]}>
          Messages
        </Text>
        <View
          style={[
            styles.wsDot,
            { backgroundColor: wsConnected ? '#22c55e' : '#ef4444' },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0878F9" size="large" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="chatbubbles-outline"
            size={56}
            color="#CBD5E1"
          />
          <Text style={styles.emptyTitle}>Aucun message</Text>
          <Text style={styles.emptySub}>
            L'équipe médicale vous contactera ici après validation de votre
            rendez-vous.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.partnerId)}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const last = item.messages[item.messages.length - 1];
            return (
              <TouchableOpacity
                style={styles.convRow}
                onPress={() => openConversation(item)}
                activeOpacity={0.7}
              >
                <View style={styles.convAvatar}>
                  <Ionicons name="person" size={22} color="#0878F9" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.convTopRow}>
                    <Text style={styles.convName} numberOfLines={1}>
                      {item.partnerName}
                    </Text>
                    {last?.created_at && (
                      <Text style={styles.convTime}>
                        {new Date(last.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.convPreview} numberOfLines={1}>
                    {last?.text ?? ''}
                  </Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFC' },

  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EDF3',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF4FF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  wsStatus: { fontSize: 11, color: '#64748B', marginTop: 1 },
  wsDot: { width: 10, height: 10, borderRadius: 5 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 16,
  },
  emptySub: {
    fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20,
  },

  // Inbox
  convRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  convAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#EAF4FF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  convTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  convName: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1 },
  convTime: { fontSize: 11, color: '#94A3B8', marginLeft: 8 },
  convPreview: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#0878F9',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: 8,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Thread
  msgList: { padding: 16, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  avatarSmall: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#0878F9',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '78%', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#0878F9', borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#E1E8EF', borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, alignSelf: 'flex-end' },

  // Composer
  composer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  composerInput: {
    flex: 1, borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15, color: '#0F172A',
    backgroundColor: '#F9FAFB', maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0878F9',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  errorText: {
    color: '#B91C1C', fontSize: 12,
    textAlign: 'center', padding: 8,
    backgroundColor: '#FEF2F2',
  },
});
