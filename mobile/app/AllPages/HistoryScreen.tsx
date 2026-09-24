import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';
import { getApiErrorMessage, getMessages, Message } from '@/api/api';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function HistoryScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const loadMessages = async (): Promise<void> => {
      try {
        setMessages(await getMessages());
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void loadMessages();
  }, []);

  const formatDate = (date?: string): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (

    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          onPress={() =>
            router.back()
          }
        >

          <Ionicons
            name="arrow-back"
            size={25}
            color="#0878F9"
          />

        </TouchableOpacity>


        <View style={styles.headerText}>

          <Text style={styles.title}>
            Historique
          </Text>

          <Text style={styles.subtitle}>
            Vos conversations
          </Text>

        </View>

      </View>


      {/* LISTE */}

      <FlatList
        data={messages}

        keyExtractor={(item) =>
          String(item.id)
        }

        contentContainerStyle={
          styles.list
        }

        showsVerticalScrollIndicator={false}

        refreshing={loading}

        onRefresh={() => {
          setLoading(true);
          setErrorMessage('');
          getMessages()
            .then(setMessages)
            .catch((error) => setErrorMessage(getApiErrorMessage(error)))
            .finally(() => setLoading(false));
        }}

        ListEmptyComponent={
          loading
            ? <ActivityIndicator size="large" color="#0878F9" />
            : <Text style={styles.emptyText}>{errorMessage || 'Aucune traduction enregistrée.'}</Text>
        }

        renderItem={({ item }) => (

          <TouchableOpacity
            style={styles.card}
          >

            <View style={styles.iconContainer}>

              <Ionicons
                name="chatbubble-outline"
                size={21}
                color="#0878F9"
              />

            </View>


            <View style={styles.info}>

              <Text style={styles.cardTitle}>
                {item.langue_source || 'Langue source'} {'->'} {item.langue_cible || 'Langue cible'}
              </Text>


              <Text style={styles.sourceMessage} numberOfLines={2}>
                {item.message_original || item.transcription || 'Message vocal'}
              </Text>

              <Text style={styles.translationMessage} numberOfLines={2}>
                {item.traduction || item.translation || 'Traduction indisponible'}
              </Text>


              <Text style={styles.date}>
                {formatDate(item.created_at)}
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={20}
              color="#999999"
            />

          </TouchableOpacity>

        )}

      />

    </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },


  header: {
    backgroundColor: '#FFFFFF',

    paddingTop: 48,
    paddingBottom: 15,
    paddingHorizontal: 18,

    flexDirection: 'row',
    alignItems: 'center',
  },


  headerText: {
    marginLeft: 15,
  },


  title: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#0878F9',
  },


  subtitle: {
    color: '#777777',
    fontSize: 12,
    marginTop: 3,
  },


  list: {
    padding: 15,
  },


  card: {
    backgroundColor: '#FFFFFF',

    borderRadius: 15,

    padding: 14,

    marginBottom: 12,

    flexDirection: 'row',

    alignItems: 'center',

    elevation: 2,
  },


  iconContainer: {
    width: 45,
    height: 45,

    borderRadius: 25,

    backgroundColor: '#EAF4FF',

    justifyContent: 'center',
    alignItems: 'center',
  },


  info: {
    flex: 1,
    marginLeft: 12,
  },


  cardTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#111111',
  },


  sourceMessage: {
    color: '#777777',
    fontSize: 12,
    marginTop: 4,
  },

  translationMessage: {
    color: '#0878F9',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },


  date: {
    color: '#0878F9',
    fontSize: 10,
    marginTop: 5,
  },

  emptyText: {
    color: '#777777',
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },

});
