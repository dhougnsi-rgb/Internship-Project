/**
 * DiagnosticScreen — guided symptom-entry chat that builds an AI pre-diagnostic
 * and submits it as an appointment request.
 *
 * Flow:
 *  1. Bot asks a series of questions (symptom, duration, severity, other notes).
 *  2. Patient answers in the chat input.
 *  3. After all questions are answered, the app computes a simple ai_assessment
 *     from the answers and lets the patient pick a date/time.
 *  4. Tapping "Envoyer" calls POST /appointments with the gathered fields.
 *
 * Note: the "AI" logic here is client-side keyword matching — a real ML service
 * can replace it by pointing TRANSLATION_API_URL at a /diagnose endpoint later.
 */
import { createAppointment, getCurrentUser, getApiErrorMessage, apiClient } from '@/api/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Sender = 'bot' | 'user';

interface ChatMsg {
  id: string;
  sender: Sender;
  text: string;
}

interface Answers {
  symptom: string;
  duration: string;
  severity: string;       // 1-10
  extra: string;
  date: string;
  time: string;
}

type Step = 'symptom' | 'duration' | 'severity' | 'extra' | 'date' | 'time' | 'confirm' | 'done';

// ── Guided questions ──────────────────────────────────────────────────────────

const QUESTIONS: Record<Step, string> = {
  symptom:  'Salut, Quel est votre symptôme principal ? (ex: fièvre, douleur abdominale...)',
  duration: 'Depuis combien de temps avez-vous ce symptôme ? (ex: 2 jours, 1 semaine)',
  severity: 'Sur une échelle de 1 à 10, quelle est l\'intensité de votre symptôme ?',
  extra:    'Avez-vous d\'autres symptômes associés ? (ex: nausées, toux) — tapez "non" si aucun.',
  date:     'Quelle date vous conviendrait pour le rendez-vous ? (format AAAA-MM-JJ)',
  time:     'À quelle heure ? (format HH:MM, ex: 09:30)',
  confirm:  '', // built dynamically
  done:     '',
};

const STEP_ORDER: Step[] = ['symptom', 'duration', 'severity', 'extra', 'date', 'time', 'confirm'];

// ── AI diagnosis via backend /diagnose endpoint ───────────────────────────────

interface DiagnoseResponse {
  assessment: string;
  urgency: 'normal' | 'a_surveiller' | 'urgent';
  confidence: number;
  symptoms: string[];
  recommendations: string[];
  warning: string | null;
  powered_by: string;
}

async function fetchDiagnosis(a: Answers): Promise<DiagnoseResponse> {
  const response = await apiClient.post<DiagnoseResponse>('/diagnose', {
    symptom: a.symptom,
    duration: a.duration,
    severity: a.severity,
    extra_symptoms: a.extra,
  });
  return response.data;
}

// ── Keep simple keyword fallback for summary display only ─────────────────────

function confidenceFromSeverity(severity: string): number {
  const n = parseInt(severity, 10);
  if (isNaN(n)) return 55;
  return Math.min(95, 40 + n * 5);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiagnosticScreen() {
  const flatListRef = useRef<FlatList<ChatMsg>>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', sender: 'bot', text: QUESTIONS.symptom },
  ]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<Step>('symptom');
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [submitting, setSubmitting] = useState(false);

  const addMsg = (sender: Sender, text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${sender}`, sender, text }]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || step === 'done') return;
    setInput('');
    addMsg('user', text);

    const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1] as Step;

    // Store this answer
    const updated: Partial<Answers> = { ...answers, [step]: text };
    setAnswers(updated);

    // Validation
    if (step === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      setTimeout(() => addMsg('bot', 'Format de date invalide. Essayez AAAA-MM-JJ, ex: 2026-11-10'), 400);
      return;
    }
    if (step === 'time' && !/^\d{2}:\d{2}$/.test(text)) {
      setTimeout(() => addMsg('bot', 'Format d\'heure invalide. Essayez HH:MM, ex: 09:30'), 400);
      return;
    }

    if (step === 'time') {
      // All answers collected — call /diagnose for AI analysis
      const full = updated as Answers;
      setStep('confirm');

      // Show a loading message while Gemini thinks
      setTimeout(() => addMsg('bot', 'Analyse de vos symptômes en cours...'), 400);

      try {
        const diagnosis = await fetchDiagnosis(full);

        const urgencyLabel =
          diagnosis.urgency === 'urgent' ? 'URGENT' :
          diagnosis.urgency === 'a_surveiller' ? ' À surveiller' : ' Normal';

        const recoText = diagnosis.recommendations.length > 0
          ? '\n\nRecommandations :\n' + diagnosis.recommendations.map(r => `• ${r}`).join('\n')
          : '';

        const warningText = diagnosis.warning
          ? `\n\n ${diagnosis.warning}` : '';

        const poweredBy = diagnosis.powered_by === 'gemini' ? '\n\nAnalyse par Gemini AI' : '';

        const summary =
          `Pré-diagnostic IA :\n\n` +
          `• Symptôme principal : ${full.symptom}\n` +
          `• Durée : ${full.duration}\n` +
          `• Intensité : ${full.severity}/10\n` +
          `• Hypothèse : ${diagnosis.assessment}\n` +
          `• Confiance : ${diagnosis.confidence}%\n` +
          `• Urgence : ${urgencyLabel}` +
          recoText +
          warningText +
          poweredBy +
          `\n\nRendez-vous souhaité : ${full.date} à ${full.time}\n\n` +
          `Tapez "oui" pour envoyer la demande, ou "non" pour annuler.`;

        addMsg('bot', summary);

        // Store diagnosis result for use in confirm step
        setAnswers({ ...full, _diagnosis: diagnosis } as any);
      } catch (err) {
        // If /diagnose fails, show summary with fallback data
        const confidence = confidenceFromSeverity(full.severity);
        addMsg('bot',
          `📋 Résumé :\n• Symptôme : ${full.symptom}\n• Durée : ${full.duration}\n• Intensité : ${full.severity}/10\n\n` +
          `📅 Rendez-vous : ${full.date} à ${full.time}\n\nTapez "oui" pour confirmer.`
        );
      }
      return;
    }

    if (step === 'confirm') {
      if (text.toLowerCase() === 'oui') {
        const full = answers as Answers & { _diagnosis?: DiagnoseResponse };
        const diagnosis = full._diagnosis;
        const assessment = diagnosis?.assessment ?? 'Consultation générale recommandée';
        const symptoms = diagnosis?.symptoms ?? [full.symptom];
        const confidence = diagnosis?.confidence ?? confidenceFromSeverity(full.severity);

        setSubmitting(true);
        setStep('done');
        try {
          const user = await getCurrentUser().catch(() => null);
          await createAppointment({
            patient_name: user?.name ?? 'Patient',
            patient_category: diagnosis?.urgency === 'urgent' ? 'Urgences' : 'Ambulatoire',
            requested_date: full.date,
            requested_time: full.time,
            ai_assessment: assessment,
            ai_symptoms: symptoms,
            ai_confidence: confidence,
          });
          addMsg('bot', '✅ Votre demande a été envoyée avec succès ! Le service médical vous contactera pour confirmer.');
          setTimeout(() => {
            Alert.alert('Demande envoyée', 'Votre pré-diagnostic a été transmis à l\'équipe médicale.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          }, 1200);
        } catch (err) {
          addMsg('bot', `❌ Erreur lors de l'envoi : ${getApiErrorMessage(err)}`);
          setStep('confirm');
        } finally {
          setSubmitting(false);
        }
      } else {
        addMsg('bot', 'Demande annulée. Tapez un nouveau message pour recommencer.');
        setStep('symptom');
        setAnswers({});
        setTimeout(() => addMsg('bot', QUESTIONS.symptom), 400);
      }
      return;
    }

    // Advance to next step
    setStep(next);
    setTimeout(() => addMsg('bot', QUESTIONS[next]), 400);
  };

  const renderMsg = ({ item }: { item: ChatMsg }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="medkit" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#0878F9" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Pré-diagnostic IA</Text>
          <Text style={styles.headerSub}>Décrivez vos symptômes</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMsg}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {step !== 'done' && (
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder="Votre réponse..."
              placeholderTextColor="#94A3B8"
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!submitting}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || submitting) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || submitting}
              accessibilityLabel="Envoyer"
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E6EDF3',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  headerSub: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  rowUser: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#0878F9',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1E8EF', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: '#0878F9', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  composer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  composerInput: {
    flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    color: '#0F172A', backgroundColor: '#F9FAFB', marginRight: 8,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0878F9', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
