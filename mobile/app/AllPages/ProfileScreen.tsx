import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';
import { getCurrentUser, logout, User } from '@/api/api';
import { registerPushToken, unregisterPushToken } from '@/utils/pushNotifications';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => undefined);
    // Register push token when profile screen mounts (user is logged in)
    registerPushToken();
  }, []);


  const handleLogout = async (): Promise<void> => {
    await unregisterPushToken();
    await logout();
    router.replace('/AllPages/LoginScreen');
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


        <Text style={styles.title}>
          Profil
        </Text>


        <View style={styles.headerSpace} />

      </View>


      {/* INFORMATIONS UTILISATEUR */}

      <View style={styles.profileSection}>

        <View style={styles.avatar}>

          <Ionicons
            name="person"
            size={40}
            color="#0878F9"
          />

        </View>


        <Text style={styles.name}>
          {user?.name || 'Utilisateur Djohealth'}
        </Text>


        <Text style={styles.email}>
          {user?.email || 'Utilisateur non chargé'}
        </Text>

      </View>


      {/* MENU */}

      <View style={styles.menu}>

        {/* MES RENDEZ-VOUS */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/AllPages/MyAppointmentsScreen')}
        >
          <Ionicons name="list-outline" size={22} color="#0878F9" />
          <Text style={styles.menuText}>Mes rendez-vous</Text>
          <Ionicons name="chevron-forward" size={19} color="#999999" />
        </TouchableOpacity>

        {/* MESSAGES */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/AllPages/MessagesScreen')}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#0878F9" />
          <Text style={styles.menuText}>Messages</Text>
          <Ionicons name="chevron-forward" size={19} color="#999999" />
        </TouchableOpacity>

        {/* RENDEZ-VOUS */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/AllPages/AppointmentScreen')}
        >
          <Ionicons name="calendar-outline" size={22} color="#0878F9" />
          <Text style={styles.menuText}>Prendre rendez-vous</Text>
          <Ionicons name="chevron-forward" size={19} color="#999999" />
        </TouchableOpacity>

        {/* DIAGNOSTIC IA */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/AllPages/DiagnosticScreen')}
        >
          <Ionicons name="medkit-outline" size={22} color="#0878F9" />
          <Text style={styles.menuText}>Pré-diagnostic IA</Text>
          <Ionicons name="chevron-forward" size={19} color="#999999" />
        </TouchableOpacity>

        {/* LANGUE */}

        <TouchableOpacity
          style={styles.menuItem}
        >

          <Ionicons
            name="language-outline"
            size={22}
            color="#0878F9"
          />


          <Text style={styles.menuText}>
            Langue de traduction
          </Text>


          <Text style={styles.value}>
            Ghomálá' ↔ Français
          </Text>

        </TouchableOpacity>


        {/* PARAMETRES */}

        <TouchableOpacity
          style={styles.menuItem}
        >

          <Ionicons
            name="settings-outline"
            size={22}
            color="#0878F9"
          />


          <Text style={styles.menuText}>
            Paramètres
          </Text>


          <Ionicons
            name="chevron-forward"
            size={19}
            color="#999999"
          />

        </TouchableOpacity>


        {/* DECONNEXION */}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleLogout}
        >

          <Ionicons
            name="log-out-outline"
            size={22}
            color="#E74C3C"
          />


          <Text
            style={[
              styles.menuText,
              styles.logoutText,
            ]}
          >
            Se déconnecter
          </Text>

        </TouchableOpacity>

      </View>

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

    justifyContent: 'space-between',
  },


  title: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#0878F9',
  },


  headerSpace: {
    width: 25,
  },


  profileSection: {
    backgroundColor: '#FFFFFF',

    alignItems: 'center',

    paddingBottom: 25,
  },


  avatar: {
    width: 85,
    height: 85,

    borderRadius: 50,

    backgroundColor: '#EAF4FF',

    justifyContent: 'center',
    alignItems: 'center',

    marginTop: 10,
  },


  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#111111',
  },


  email: {
    color: '#777777',
    marginTop: 5,
  },


  menu: {
    padding: 15,
  },


  menuItem: {
    minHeight: 60,

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 15,

    marginBottom: 10,
  },


  menuText: {
    flex: 1,

    marginLeft: 14,

    color: '#111111',

    fontSize: 14,
  },


  value: {
    color: '#777777',
    fontSize: 10,
  },


  logoutText: {
    color: '#E74C3C',
  },

});