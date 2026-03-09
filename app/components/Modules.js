// screens/Modules.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import FooterGeneral from './FooterGeneral';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://10.0.2.2:3000/api';

const COLORS = {
  bg: '#FDE1DE',
  primary: '#E77C9D',
  dark: '#9E4942',
  neutral: '#D4AAA2',
  text: '#4A4A4A',
  white: '#FFFFFF',
  cardBorder: '#F2B8C6',
};

const modulesData = [
  {
    id: 1,
    title: 'Preadolescencia',
    nivel: 'Nivel principiante',
    temas: ['¿Qué es la preadolescencia?', 'Cambios físicos y emocionales', 'Cómo hablarlo en casa'],
  },
  {
    id: 2,
    title: 'Cambios en la menstruación',
    nivel: 'Nivel cambios',
    temas: ['Cambios corporales', 'Cambios de humor'],
  },
  {
    id: 3,
    title: 'Ciclo menstrual',
    nivel: 'Nivel conoces tu ciclo',
    temas: ['Ciclo menstrual', 'Menstruación', 'Afecciones comunes', 'Ciclo regular e irregular'],
  },
  {
    id: 4,
    title: 'Síntomas en la menstruación',
    nivel: 'Nivel te preocupas por tu ciclo',
    temas: ['Síntomas físicos y emocionales'],
  },
  {
    id: 5,
    title: '¿Cómo afecta la alimentación y ejercicio?',
    nivel: 'Nivel vas más allá',
    temas: ['Alimentación', 'Ejercicio y su influencia'],
  },
  {
    id: 6,
    title: '¿Qué hacer durante la menstruación?',
    nivel: 'Nivel es hora de actuar',
    temas: ['Higiene menstrual', 'Cuidados especiales', 'Productos menstruales'],
  },
  {
    id: 7,
    title: 'Importancia del seguimiento del periodo',
    nivel: 'Nivel consciencia',
    temas: ['Seguimiento del periodo', 'Señales de alerta'],
  },
  {
    id: 8,
    title: 'Lo que nunca debes creer de tu periodo',
    nivel: 'Nivel ya nada te para',
    temas: ['Mitos y realidades'],
  },
];

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('token'); // cambia si tu key es otra
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export default function Modules({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [moduloActual, setModuloActual] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadProgreso = useCallback(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/modulos/progreso`, { headers });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || 'Error progreso');

        if (mounted) setModuloActual(data.moduloActual ?? 1);
      } catch (e) {
        console.warn(e);
        if (mounted) setModuloActual(1);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);


  // ✅ Se ejecuta cada vez que la pantalla entra en foco (volver desde ModuleDetail/Quiz/etc.)
  useFocusEffect(loadProgreso);

  // ✅ También refresca si vienes del footer con params refresh (FooterGeneral con merge:true)
  useEffect(() => {
    if (route?.params?.refresh) {
      loadProgreso();
    }
  }, [route?.params?.refresh, loadProgreso]);

  const renderItem = ({ item, index }) => {
    const desc = item.temas?.[0] ?? item.nivel;
    const bloqueado = !loading && item.id > moduloActual;

    return (
      <View style={[styles.card, bloqueado && { opacity: 0.6 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderText}>{`Módulo ${index + 1}`}</Text>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {desc}
        </Text>

        <TouchableOpacity
          style={[styles.ctaButton, bloqueado && styles.ctaButtonLocked]}
          activeOpacity={0.9}
          onPress={() => {
            if (bloqueado) {
              Alert.alert('Módulo bloqueado', `Primero termina el módulo ${moduloActual} para desbloquear este.`);
              return;
            }
            navigation?.navigate('ModuleDetail', { moduleId: item.id });
          }}
        >
          <Text style={styles.ctaButtonText}>{bloqueado ? 'Bloqueado 🔒' : 'Leer más...'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Módulos informativos</Text>
      </View>

      <FlatList
        data={modulesData}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: hp('12%'), paddingTop: hp('1%') }}
        style={{ flex: 1, backgroundColor: COLORS.bg }}
      />

      <FooterGeneral navigation={navigation} activeScreen="Módulos" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  topBar: {
    width: '100%',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.8%'),
  },
  topTitle: {
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: Math.max(wp('5.6%'), 20),
  },

  card: {
    marginHorizontal: wp('5%'),
    marginVertical: hp('1%'),
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('4%'),
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF6F9',
    borderColor: COLORS.white,
    borderWidth: 1,
    paddingVertical: hp('0.4%'),
    paddingHorizontal: wp('3%'),
    borderRadius: 999,
    marginBottom: hp('1%'),
  },
  cardHeaderText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: Math.max(wp('3.4%'), 12),
  },
  cardTitle: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: Math.max(wp('4.8%'), 18),
    marginBottom: hp('0.6%'),
  },
  cardDesc: {
    color: COLORS.text,
    fontSize: Math.max(wp('3.6%'), 13),
    opacity: 0.85,
    marginBottom: hp('1.6%'),
  },

  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
  },
  ctaButtonLocked: {
    backgroundColor: COLORS.neutral,
  },
  ctaButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: Math.max(wp('3.8%'), 14),
  },
});