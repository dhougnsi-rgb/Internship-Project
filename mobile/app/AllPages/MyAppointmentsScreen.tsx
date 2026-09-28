/**
 * MyAppointmentsScreen — shows the current patient's submitted appointments
 * and their review/scheduling status in real time.
 */
import { getMyAppointments, getApiErrorMessage, AppointmentOut } from '@/api/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:     { label: 'En attente',  color: '#F59E0B', icon: 'time-outline' },
  accepted:    { label: 'Accepté',     color: '#10B981', icon: 'checkmark-circle-outline' },
  rescheduled: { label: 'Reprogrammé', color: '#6366F1', icon: 'calendar-outline' },
};

const REVIEW_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Diagnostic en attente', color: '#94A3B8' },
  confirmed: { label: 'Diagnostic confirmé',   color: '#10B981' },
  rejected:  { label: 'À revoir',              color: '#EF4444' },
};

function StatusChip({ status, type }: { status: string; type: 'appointment' | 'review' }) {
  const cfg =
    type === 'appointment'
      ? STATUS_CONFIG[status] ?? { label: status, color: '#94A3B8', icon: 'ellipse-outline' }
      : REVIEW_CONFIG[status] ?? { label: status, color: '#94A3B8' };

  return (
    <View style={[styles.chip, { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
      {type === 'appointment' && 'icon' in cfg && (
        <Ionicons name={(cfg as any).icon} size={12} color={cfg.color} />
      )}
      <Text style={[styles.chipText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function AppointmentCard({ appt }: { appt: AppointmentOut }) {
  const hasReschedule = appt.status === 'rescheduled' && appt.new_date && appt.new_time;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="calendar" size={22} color="#0878F9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardDate}>
            {hasReschedule ? appt.new_date! : appt.requested_date}
            {'  '}
            <Text style={styles.cardTime}>
              {hasReschedule ? appt.new_time! : appt.requested_time}
            </Text>
          </Text>
          {hasReschedule && (
            <Text style={styles.originalDate}>
              Demande initiale : {appt.requested_date} à {appt.requested_time}
            </Text>
          )}
        </View>
      </View>

      {/* AI assessment */}
      {!!appt.ai_assessment && (
        <View style={styles.assessmentRow}>
          <Ionicons name="medkit-outline" size={14} color="#6366F1" />
          <Text style={styles.assessmentText} numberOfLines={2}>
            {appt.ai_assessment}
          </Text>
          {appt.ai_confidence > 0 && (
            <Text style={styles.confidence}>{appt.ai_confidence}%</Text>
          )}
        </View>
      )}

      {/* Symptoms */}
      {appt.ai_symptoms.length > 0 && (
        <View style={styles.symptomsRow}>
          {appt.ai_symptoms.slice(0, 3).map((s) => (
            <View key={s} style={styles.symptomTag}>
              <Text style={styles.symptomText}>{s}</Text>
            </View>
          ))}
          {appt.ai_symptoms.length > 3 && (
            <Text style={styles.moreSymptoms}>+{appt.ai_symptoms.length - 3}</Text>
          )}
        </View>
      )}

      {/* Status chips */}
      <View style={styles.chipsRow}>
        <StatusChip status={appt.status} type="appointment" />
        {appt.review_status && (
          <StatusChip status={appt.review_status} type="review" />
        )}
      </View>

      {/* Doctor notes if available */}
      {!!appt.review_notes && (
        <View style={styles.notesBox}>
          <Ionicons name="document-text-outline" size={13} color="#64748B" />
          <Text style={styles.notesText} numberOfLines={3}>{appt.review_notes}</Text>
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MyAppointmentsScreen() {
  const [appointments, setAppointments] = useState<AppointmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getMyAppointments();
      setAppointments(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#0878F9" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Mes rendez-vous</Text>
          <Text style={styles.headerSub}>{appointments.length} demande{appointments.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn} accessibilityLabel="Rafraîchir">
          <Ionicons name="refresh-outline" size={20} color="#0878F9" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0878F9" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={56} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
          <Text style={styles.emptySub}>
            Vos demandes de rendez-vous apparaîtront ici après soumission.
          </Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/AllPages/AppointmentScreen')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>Prendre un rendez-vous</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#0878F9']} />
          }
          renderItem={({ item }) => <AppointmentCard appt={item} />}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.newBtnBottom}
              onPress={() => router.push('/AllPages/AppointmentScreen')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#0878F9" />
              <Text style={styles.newBtnBottomText}>Nouveau rendez-vous</Text>
            </TouchableOpacity>
          }
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E6EDF3',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center',
  },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: 12 },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: '#0878F9', borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 16 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 24, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#0878F9', borderRadius: 12,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  cardDate: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardTime: { fontSize: 15, fontWeight: '500', color: '#0878F9' },
  originalDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  assessmentRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 8, padding: 8, marginBottom: 8,
  },
  assessmentText: { flex: 1, fontSize: 13, color: '#4C1D95', lineHeight: 18 },
  confidence: { fontSize: 12, fontWeight: '700', color: '#6366F1' },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  symptomTag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#F1F5F9', borderRadius: 999,
  },
  symptomText: { fontSize: 12, color: '#475569' },
  moreSymptoms: { fontSize: 12, color: '#94A3B8', alignSelf: 'center' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: '#CBD5E1',
  },
  notesText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 },
  newBtnBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginTop: 8,
  },
  newBtnBottomText: { color: '#0878F9', fontSize: 15, fontWeight: '600' },
});
