/**
 * AppointmentScreen — lets patients submit a new appointment request.
 * They fill in their name, preferred date/time, and a short reason.
 * The form calls POST /appointments on the backend.
 */
import { createAppointment, getCurrentUser, getApiErrorMessage } from '@/api/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['Ambulatoire', 'Urgences', 'En Observation', 'Hospitalise', 'Sortant'] as const;
type Category = (typeof CATEGORIES)[number];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function validateDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function validateTime(v: string): boolean {
  return /^\d{2}:\d{2}$/.test(v);
}

export default function AppointmentScreen() {
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<Category>('Ambulatoire');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name from stored user
  useState(() => {
    getCurrentUser()
      .then((u) => { if (u.name) setPatientName(u.name); })
      .catch(() => undefined);
  });

  const handleSubmit = async () => {
    setError('');
    if (!patientName.trim()) { setError('Veuillez entrer votre nom.'); return; }
    if (!validateDate(date)) { setError('Date invalide. Format attendu : AAAA-MM-JJ'); return; }
    if (!validateTime(time)) { setError('Heure invalide. Format attendu : HH:MM'); return; }

    setLoading(true);
    try {
      await createAppointment({
        patient_name: patientName.trim(),
        patient_category: category,
        requested_date: date,
        requested_time: time,
        ai_assessment: reason.trim() || undefined,
        ai_symptoms: [],
        ai_confidence: 0,
      });
      Alert.alert(
        'Demande envoyée',
        'Votre demande de rendez-vous a été transmise au service médical. Vous serez notifié dès qu\'elle est traitée.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color="#0878F9" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prendre rendez-vous</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informations patient</Text>

            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Votre nom"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === c }}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Date et heure souhaitées</Text>

            <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-10-15"
              placeholderTextColor="#94A3B8"
              keyboardType="default"
              maxLength={10}
            />

            <Text style={styles.label}>Heure (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="09:30"
              placeholderTextColor="#94A3B8"
              keyboardType="default"
              maxLength={5}
            />

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Motif de la consultation</Text>

            <Text style={styles.label}>Décrivez vos symptômes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Ex: fièvre depuis 3 jours, douleurs abdominales..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Envoyer la demande</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EDF3',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  body: { padding: 18, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0878F9', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F9FAFB',
  },
  textarea: { minHeight: 100, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB',
  },
  chipActive: { backgroundColor: '#0878F9', borderColor: '#0878F9' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#FFFFFF' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
  },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13 },
  submitBtn: {
    backgroundColor: '#0878F9', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
