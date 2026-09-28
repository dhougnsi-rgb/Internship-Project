import { getApiErrorMessage, saveMessage, translate, transcribeAudio } from '@/api/api';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Language = 'francais' | 'ghomala';
type ChatMessage = { id: string; sender: 'user' | 'ai'; text: string; language?: Language };

const initialMessages: ChatMessage[] = [
  { id: 'welcome', sender: 'ai', text: 'Bonjour, je suis Djohealth.', language: 'francais' },
  { id: 'hint', sender: 'ai', text: 'Écrivez une phrase à traduire.' },
];
export type DiagnosticPatient = {
  age?: number | null;
  sexe?: string | null;
  poids?: number | null;
  taille?: number | null;
  antecedents?: string[];
  maladies_connues?: string[];
  medicaments?: string[];
  allergies?: string[];
};

export type DiagnosticHypothesis = {
  nom: string;
  niveau: 'possible' | 'probable' | 'peu_probable';
  explication: string;
};

export type DiagnosticResult = {
  disponible: boolean;
  niveau_urgence: 'normal' | 'a_surveiller' | 'urgent';
  hypotheses: DiagnosticHypothesis[];
  recommandations: string[];
  signes_alerte: string[];
  message: string;
};

export type DiagnosticChatResponse = {
  reply: string;
  status: 'questions' | 'evaluation' | 'urgence';
  patient: DiagnosticPatient;
  diagnostic?: DiagnosticResult | null;
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const params = useLocalSearchParams<{ language?: string }>();
  const initialLanguage: Language = params.language === 'ghomala' ? 'ghomala' : 'francais';
  const [sourceLanguage, setSourceLanguage] = useState<Language>(initialLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(initialLanguage === 'francais' ? 'ghomala' : 'francais');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setMessage('');
  };

  const ghomalaToPhoneticSpeech = (text: string): string => text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ŋ/gi, 'ng')
    .replace(/ɲ/gi, 'ny')
    .replace(/ʉ/gi, 'ou')
    .replace(/ə/gi, 'eu')
    .replace(/ɛ/gi, 'è')
    .replace(/ɔ/gi, 'o')
    .replace(/ɑ/gi, 'a')
    .replace(/ǝ/gi, 'eu');

  const speak = (text: string, language?: Language) => {
    Speech.stop();
    // Les téléphones ne fournissent généralement pas de voix Ghomala'.
    // La voix française reste disponible comme lecture phonétique de secours.
    const utterance = language === 'ghomala' ? ghomalaToPhoneticSpeech(text) : text;
    Speech.speak(utterance, { language: language === 'ghomala' ? 'fr-CM' : 'fr-FR', rate: 0.72 });
  };

  const saveTranslation = async (text: string, translatedText: string) => {
    try {
      await saveMessage({
        langue_source: sourceLanguage,
        langue_cible: targetLanguage,
        type_entree: 'texte',
        message_original: text,
        traduction: translatedText,
      });
    } catch (error) {
      setErrorMessage(`Traduction effectuée, mais historique non enregistré : ${getApiErrorMessage(error)}`);
    }
  };

  const startRecording = async () => {
    if (sourceLanguage !== 'francais' || loading) return;
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Autorisez le microphone pour enregistrer votre message.');
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      setIsRecording(false);

      // Get the URI of the recorded file
      const uri = recorder.uri;
      if (!uri) {
        setErrorMessage('Enregistrement vide — réessayez.');
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        // Send to backend for Gemini transcription
        const result = await transcribeAudio(uri, 'audio/m4a');
        const transcribed = result.transcription.trim();
        if (transcribed) {
          setMessage(transcribed);
        } else {
          setErrorMessage('Aucune parole détectée. Réessayez.');
        }
      } catch (err) {
        setErrorMessage(`Transcription échouée : ${getApiErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setIsRecording(false);
    }
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessages((current) => [...current, { id: `${Date.now()}-user`, sender: 'user', text, language: sourceLanguage }]);
    setMessage('');
    setErrorMessage('');
    setLoading(true);
    scrollToBottom();

    try {
      const result = await translate({
        langue_source: sourceLanguage,
        langue_cible: targetLanguage,
        message_original: text,
      });
      const translatedText = result.traduction || result.translation || result.transcription || 'Aucune traduction reçue.';
      setMessages((current) => [...current, { id: `${Date.now()}-ai`, sender: 'ai', text: translatedText, language: targetLanguage }]);
      await saveTranslation(text, translatedText);
      scrollToBottom();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>D</Text></View>}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.text}</Text>
          <TouchableOpacity style={styles.playButton} onPress={() => speak(item.text, item.language)} accessibilityLabel="Écouter le message">
            <Ionicons name="play" size={16} color={isUser ? '#FFFFFF' : '#0878F9'} />
            <Text style={[styles.playLabel, isUser ? styles.userText : styles.aiText]}>Écouter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ImageBackground source={require('../../assets/images/stéthoscope.jpg')} style={styles.background} imageStyle={styles.backgroundImage} resizeMode="cover">
        <View style={styles.backgroundOverlay} />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/AllPages/ChooseScreen')} accessibilityLabel="Retour">
              <Ionicons name="arrow-back" size={22} color="#0878F9" />
            </TouchableOpacity>
            <View style={styles.titleArea}>
              <Text style={styles.title}>Djohealth</Text>
              <Text style={styles.subtitle}>Assistant de traduction</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/AllPages/HistoryScreen')} accessibilityLabel="Historique">
                <Ionicons name="time-outline" size={22} color="#0878F9" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/AllPages/ProfileScreen')} accessibilityLabel="Profil">
                <Ionicons name="person-outline" size={22} color="#0878F9" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.languageBar}>
            <View style={styles.languageCard}><Text style={styles.languageLabel}>DE</Text><Text style={styles.languageName}>{sourceLanguage === 'francais' ? 'Français' : 'Ghomala'}</Text></View>
            <TouchableOpacity style={styles.swapButton} onPress={swapLanguages} accessibilityLabel="Inverser les langues"><Ionicons name="swap-horizontal" size={22} color="#FFFFFF" /></TouchableOpacity>
            <View style={styles.languageCard}><Text style={styles.languageLabel}>VERS</Text><Text style={styles.languageName}>{targetLanguage === 'francais' ? 'Français' : 'Ghomala'}</Text></View>
          </View>

          <FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={(item) => item.id} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} onContentSizeChange={scrollToBottom} keyboardShouldPersistTaps="handled" />

          <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            {isRecording && <Text style={styles.recordingText}>En cours d’enregistrement… Appuyez sur envoyer pour terminer.</Text>}
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} value={message} onChangeText={setMessage} placeholder={sourceLanguage === 'francais' ? 'Écrivez en français...' : 'Écrivez en Ghomala...'} placeholderTextColor="#94A3B8" multiline editable={!loading} />
              <TouchableOpacity
                style={[styles.actionButton, isRecording && styles.recordButton]}
                onPress={isRecording ? stopRecording : message.trim() ? sendMessage : startRecording}
                disabled={loading || (!message.trim() && sourceLanguage !== 'francais' && !isRecording)}
                accessibilityLabel={isRecording || message.trim() ? 'Envoyer' : 'Enregistrer un message vocal'}
              >
              
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name={isRecording || message.trim() ? 'send' : 'mic'} size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFC' },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.14 },
  backgroundOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(247,250,252,0.88)' },
  container: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: 14, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E6EDF3' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  titleArea: { flex: 1, marginLeft: 10 },
  title: { color: '#0878F9', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  languageBar: { height: 78, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E6EDF3' },
  languageCard: { width: 112, height: 48, borderRadius: 12, backgroundColor: '#EAF4FF', justifyContent: 'center', alignItems: 'center' },
  languageLabel: { color: '#2FC8C0', fontSize: 9, fontWeight: '700' },
  languageName: { color: '#0878F9', fontSize: 14, fontWeight: '700', marginTop: 3 },
  swapButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2FC8C0', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  messages: { padding: 15, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2FC8C0', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  aiAvatarText: { color: '#FFFFFF', fontWeight: '800' },
  messageBubble: { maxWidth: '82%', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 18 },
  userBubble: { backgroundColor: '#0878F9', borderBottomRightRadius: 5 },
  aiBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8EF', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#1E293B' },
  playButton: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', marginTop: 8, gap: 4 },
  playLabel: { fontSize: 12, fontWeight: '600' },
  inputArea: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  errorText: { color: '#C0392B', textAlign: 'center', fontSize: 12, marginBottom: 8 },
  recordingText: { color: '#C0392B', textAlign: 'center', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputContainer: { minHeight: 56, maxHeight: 120, borderWidth: 1, borderColor: '#D6E0E8', borderRadius: 28, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 6, backgroundColor: '#FFFFFF' },
  textInput: { flex: 1, color: '#0F172A', fontSize: 16, maxHeight: 95, paddingVertical: 10 },
  actionButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0878F9', alignItems: 'center', justifyContent: 'center' },
  recordButton: { backgroundColor: '#E74C3C' },
});
