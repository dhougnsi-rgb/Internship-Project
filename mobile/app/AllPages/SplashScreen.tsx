import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/AllPages/LoginScreen');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.background}>
      <View style={styles.accentTop} />
      <View style={styles.accentBottom} />
      <View style={styles.container}>

        {/* LOGO */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* NOM DE L'APPLICATION */}
        <Text style={styles.appName}>DjoHealth</Text>

        <Text style={styles.subtitle}>
          Votre assistant de santé intelligent
        </Text>

        {/* PETIT INDICATEUR */}
        <View style={styles.loader}>
          <View style={styles.loaderDot} />
          <View style={styles.loaderDot} />
          <View style={styles.loaderDot} />
        </View>

      </View>
    </View>
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
    backgroundColor: '#0B1F33',
  },

  accentTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#123F5A',
    top: -120,
    right: -80,
  },

  accentBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0878F9',
    opacity: 0.18,
    bottom: -100,
    left: -70,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  logo: {
    width: 140,
    height: 140,
  },

  appName: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },

  subtitle: {
    color: '#eeeeee',
    fontSize: 13,
    marginTop: 8,
  },

  loader: {
    flexDirection: 'row',
    marginTop: 35,
  },

  loaderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2fd0c8',
    marginHorizontal: 4,
  },
});