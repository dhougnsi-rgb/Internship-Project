import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Language = 'francais' | 'ghomala';

export default function Choose() {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language>('ghomala');

  const handleContinue = () => {
    router.replace({
      pathname: '/AllPages/ChatScreen',
      params: {
        language: selectedLanguage,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View style={styles.container}>

        {/* ================= HEADER ================= */}

        <View style={styles.header}>

          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="language-outline"
                size={21}
                color="#0066ff"
              />
            </View>

            <View>
              <Text style={styles.headerTitle}>
                Choix de la langue
              </Text>

              <Text style={styles.headerSubtitle}>
                Configuration de votre espace
              </Text>
            </View>
          </View>

          {/* INDICATEUR DJOHEALTH */}

          <View style={styles.aiBadge}>
            <View style={styles.aiDot} />

            <Text style={styles.aiBadgeText}>
              Djohealth
            </Text>
          </View>

        </View>

        {/* ================= CONTENU ================= */}

        <View style={styles.content}>

          <View style={styles.welcomeIcon}>
            <Ionicons
              name="chatbubbles-outline"
              size={42}
              color="#0066ff"
            />
          </View>

          <Text style={styles.title}>
            Bienvenue sur Djohealth
          </Text>

          <Text style={styles.description}>
            Choisissez votre langue. Le système traduira
            automatiquement vers le français pour que
            votre médecin puisse comprendre.
          </Text>

          {/* ================= LANGUES ================= */}

          <View style={styles.languagesContainer}>

            {/* FRANÇAIS */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.languageCard,
                selectedLanguage === 'francais' &&
                  styles.selectedCard,
              ]}
              onPress={() =>
                setSelectedLanguage('francais')
              }
            >

              <View
                style={[
                  styles.languageIcon,
                  selectedLanguage === 'francais' &&
                    styles.selectedIcon,
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={25}
                  color={
                    selectedLanguage === 'francais'
                      ? '#ffffff'
                      : '#0878F9'
                  }
                />
              </View>

              <View style={styles.languageTextContainer}>

                <Text style={styles.languageName}>
                  Français
                </Text>

                <Text style={styles.languageDescription}>
                  Je parle français — traduire vers le Ghomala
                </Text>

              </View>

              <View
                style={[
                  styles.radio,
                  selectedLanguage === 'francais' &&
                    styles.radioSelected,
                ]}
              >
                {selectedLanguage === 'francais' && (
                  <View style={styles.radioPoint} />
                )}
              </View>

            </TouchableOpacity>

            {/* GHOMALA */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.languageCard,
                selectedLanguage === 'ghomala' &&
                  styles.selectedCard,
              ]}
              onPress={() =>
                setSelectedLanguage('ghomala')
              }
            >

              <View
                style={[
                  styles.languageIcon,
                  selectedLanguage === 'ghomala' &&
                    styles.selectedIcon,
                ]}
              >
                <Ionicons
                  name="mic-outline"
                  size={25}
                  color={
                    selectedLanguage === 'ghomala'
                      ? '#ffffff'
                      : '#0878F9'
                  }
                />
              </View>

              <View style={styles.languageTextContainer}>

                <Text style={styles.languageName}>
                  Ghomala
                </Text>

                <Text style={styles.languageDescription}>
                  Je parle Ghomala — traduire vers le français
                </Text>

              </View>

              <View
                style={[
                  styles.radio,
                  selectedLanguage === 'ghomala' &&
                    styles.radioSelected,
                ]}
              >
                {selectedLanguage === 'ghomala' && (
                  <View style={styles.radioPoint} />
                )}
              </View>

            </TouchableOpacity>

          </View>

          {/* ================= LANGUE CHOISIE ================= */}

          <View style={styles.selectedLanguageInfo}>

            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#2BC9C0"
            />

            <Text style={styles.selectedInfoText}>
              Langue sélectionnée :
            </Text>

            <Text style={styles.selectedLanguageText}>
              {selectedLanguage === 'francais'
                ? 'Français'
                : 'Ghomala'}
            </Text>

          </View>

          {/* ================= CONTINUER ================= */}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.continueButton}
            onPress={handleContinue}
          >

            <Text style={styles.continueText}>
              Continuer
            </Text>

            <View style={styles.arrowContainer}>
              <Ionicons
                name="arrow-forward"
                size={19}
                color="#0878F9"
              />
            </View>

          </TouchableOpacity>

          <Text style={styles.bottomText}>
            Vous pourrez modifier votre langue
            ultérieurement.
          </Text>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  /* ================= GLOBAL ================= */

  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },

  /* ================= HEADER ================= */

  header: {
    height: 72,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2733',
  },

  headerSubtitle: {
    fontSize: 10,
    color: '#8B96A3',
    marginTop: 2,
  },

  /* ================= DJOHEALTH ================= */

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAFBF9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  aiDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2BC9C0',
    marginRight: 6,
  },

  aiBadgeText: {
    color: '#238B85',
    fontSize: 11,
    fontWeight: '600',
  },

  /* ================= CONTENU ================= */

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 55,
  },

  welcomeIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#17212B',
    textAlign: 'center',
  },

  description: {
    maxWidth: 470,
    fontSize: 13,
    lineHeight: 20,
    color: '#737E8A',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 32,
  },

  /* ================= LANGUES ================= */

  languagesContainer: {
    width: '100%',
    maxWidth: 520,
  },

  languageCard: {
    minHeight: 88,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E1E6EC',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 13,

    /* légère ombre */
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,

    elevation: 2,
  },

  selectedCard: {
    borderColor: '#0878F9',
    borderWidth: 1.5,
    backgroundColor: '#F5F9FF',
  },

  languageIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedIcon: {
    backgroundColor: '#0878F9',
  },

  languageTextContainer: {
    flex: 1,
    marginLeft: 14,
  },

  languageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202A35',
  },

  languageDescription: {
    fontSize: 11,
    color: '#8A949F',
    marginTop: 4,
  },

  /* ================= RADIO ================= */

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#B7C0CA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioSelected: {
    borderColor: '#0878F9',
  },

  radioPoint: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#0878F9',
  },

  /* ================= INFO ================= */

  selectedLanguageInfo: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAFBF9',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 5,
  },

  selectedInfoText: {
    color: '#5F716F',
    fontSize: 11,
    marginLeft: 7,
  },

  selectedLanguageText: {
    color: '#238B85',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },

  /* ================= BOUTON ================= */

  continueButton: {
    width: '100%',
    maxWidth: 520,
    height: 51,
    borderRadius: 8,
    backgroundColor: '#0878F9',
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },

  arrowContainer: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ================= BAS ================= */

  bottomText: {
    color: '#9AA3AC',
    fontSize: 10,
    marginTop: 13,
    textAlign: 'center',
  },

});