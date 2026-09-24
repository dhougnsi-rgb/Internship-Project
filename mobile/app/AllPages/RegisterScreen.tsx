import { getApiErrorMessage, register } from '@/api/api';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useState } from 'react';
import {
Image,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'patient' | 'staff' | 'doctor' | 'administrator'>('patient');

  const [rememberPassword, setRememberPassword] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (): Promise<void> => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage('Veuillez remplir tous les champs.');
      return;
    }
    if (username.trim().length < 2) {
      setErrorMessage("Le nom d'utilisateur doit contenir au moins 2 caractères.");
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
    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await register({ name: username, email, password, role: 'patient' });
      setSuccessMessage('Inscription réussie. Ouverture de la suite...');
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

              {/* LOGO */}
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              {/* TITRE */}
              <Text style={styles.title}>Register</Text>

              <Text style={styles.subtitle}>
                Créez votre compte pour continuer
              </Text>

              {/* NOM UTILISATEUR */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#ffffff"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Nom d'utilisateur"
                  placeholderTextColor="#eeeeee"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

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
                  placeholderTextColor="#eeeeee"
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
                  placeholderTextColor="#eeeeee"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPassword(!showPassword)
                  }
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

              {/* CONFIRMATION */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#ffffff"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="#eeeeee"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword
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
                onPress={() =>
                  setRememberPassword(!rememberPassword)
                }
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberPassword && styles.checkboxSelected,
                  ]}
                >
                  {rememberPassword && (
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
                style={styles.registerButton}
                onPress={() => {
                  void handleRegister().catch((error) => {
                    setLoading(false);
                    setErrorMessage(getApiErrorMessage(error));
                  });
                }}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Inscription...' : "S'inscrire"}
                </Text>
              </TouchableOpacity>

              {/* LOGIN */}
              <View style={styles.bottomTextContainer}>
                <Text style={styles.bottomText}>
                  Vous avez déjà un compte ?
                </Text>

                <TouchableOpacity
                  onPress={() => router.push('/AllPages/LoginScreen')}
                >
                  <Text style={styles.loginText}>
                    Se connecter
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },

  container: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 25,
  },

  glassCard: {
    width: '88%',
    maxWidth: 400,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  cardContent: {
    padding: 25,
    backgroundColor: 'rgba(65,65,65,0.48)',
  },

  logo: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 7,
  },

  title: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '700',
    marginBottom: 4,
  },

  subtitle: {
    color: '#eeeeee',
    fontSize: 12,
    marginBottom: 20,
  },

  inputContainer: {
    height: 47,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 13,
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
    marginBottom: 18,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  checkboxSelected: {
    backgroundColor: '#2fd0c8',
    borderColor: '#2fd0c8',
  },

  rememberText: {
    color: '#ffffff',
    fontSize: 12,
  },

  registerButton: {
    height: 47,
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

  registerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  bottomTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },

  bottomText: {
    color: '#eeeeee',
    fontSize: 12,
  },

  loginText: {
    color: '#2fd0c8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
});
