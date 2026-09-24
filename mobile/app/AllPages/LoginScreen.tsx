import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { getApiErrorMessage, login } from '@/api/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password) {
      setErrorMessage('Veuillez renseigner tous les champs.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await login({ email, password });
      setSuccessMessage('Connexion réussie. Ouverture de la suite...');
      router.replace('/AllPages/ChooseScreen');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require('../../assets/images/stéthoscope.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <BlurView
            intensity={50}
            tint="dark"
            style={styles.glassCard}
          >
            <View style={styles.cardContent}>

              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.title}>Login</Text>

              <Text style={styles.subtitle}>
                Bienvenue, connectez-vous à votre compte
              </Text>

              {/* EMAIL */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#ffffff"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#dddddd"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* MOT DE PASSE */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#ffffff"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor="#dddddd"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-outline'
                        : 'eye-off-outline'
                    }
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>
              </View>

              {/* SE SOUVENIR */}
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRemember(!remember)}
              >
                <View
                  style={[
                    styles.checkbox,
                    remember && styles.checkboxSelected,
                  ]}
                >
                  {remember && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#ffffff"
                    />
                  )}
                </View>

                <Text style={styles.rememberText}>
                  Se souvenir de moi
                </Text>
              </TouchableOpacity>

              {/* BOUTON */}
              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
              {!!successMessage && <Text style={styles.successText}>{successMessage}</Text>}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => {
                  void handleLogin().catch((error) => {
                    setLoading(false);
                    setErrorMessage(getApiErrorMessage(error));
                  });
                }}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Text>
              </TouchableOpacity>

              {/* REGISTER */}
              <View style={styles.bottomContainer}>
                <Text style={styles.bottomText}>
                  Vous n'avez pas de compte ?
                </Text>

                <TouchableOpacity
                  onPress={() => router.push('/AllPages/RegisterScreen')}
                >
                  <Text style={styles.registerText}>
                    S'inscrire
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111111',
  },

  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },

  container: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },

  glassCard: {
    width: '86%',
    maxWidth: 380,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  cardContent: {
    padding: 25,
    backgroundColor: 'rgba(65,65,65,0.55)',
  },

  logo: {
    width: 65,
    height: 65,
    alignSelf: 'center',
    marginBottom: 8,
  },

  title: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '700',
  },

  subtitle: {
    color: '#eeeeee',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 25,
  },

  inputContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },

  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#2fd0c8',
    borderColor: '#2fd0c8',
  },

  rememberText: {
    color: '#ffffff',
    fontSize: 12,
  },

  loginButton: {
    height: 48,
    borderRadius: 5,
    backgroundColor: '#2fd0c8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    color: '#FFD4D4',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },

  successText: {
    color: '#A7F3D0',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  bottomText: {
    color: '#eeeeee',
    fontSize: 12,
  },

  registerText: {
    color: '#2fd0c8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
});
