// components/Achievements.js
import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Platform, AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import FooterGeneral from './FooterGeneral';
import api from '../services/api';

const COLORS = {
  bg: '#FDE1DE',
  white: '#FFFFFF',
  text: '#4A4A4A',

  primary: '#E77C9D',
  primaryDark: '#C45F83',
  cardBorder: '#E77C9D',

  progressBg: '#FDE1DE',
  progressFill: '#E77C9D',
  progressBorder: '#F2B8C6',

  pastelPink:   '#FFE3EF',
  pastelMelon:  '#FFE7DA',
  pastelLila:   '#F2E9FF',
  pastelCream:  '#FFF6D9',

  lockedBg: '#F3F3F3',
  lockedBorder: '#DADADA',
  lockedText: '#9E9E9E',
  lockedIcon: '#BDBDBD',
};

// ✅ Niveles (umbral acumulado)
const LEVELS = [
  { key: 'Principiante',              threshold: 8,  color: '#FFBCC5' },
  { key: 'Cambios',                   threshold: 16, color: '#F2B8C6' },
  { key: 'Conoces tu ciclo',          threshold: 24, color: '#E77C9D' },
  { key: 'Te preocupas por tu ciclo', threshold: 32, color: '#D4AAA2' },
  { key: 'Vas más allá',              threshold: 40, color: '#9E4942' },
  { key: 'Es hora de actuar',         threshold: 48, color: '#EFB0A1' },
  { key: 'Consciencia',               threshold: 56, color: '#F9C7B4' },
  { key: 'Ya nada te para',           threshold: 64, color: '#FF9BAA' },
];

// Nivel actual = último umbral alcanzado
function getCurrentLevel(pts) {
  let current = { key: 'Inicio', threshold: 0, color: '#D4AAA2' };
  for (const lvl of LEVELS) {
    if (pts >= lvl.threshold) current = lvl;
    else break;
  }
  return current;
}

// Siguiente nivel = primer umbral no alcanzado
function getNextLevel(pts) {
  for (const lvl of LEVELS) {
    if (pts < lvl.threshold) return lvl;
  }
  return LEVELS[LEVELS.length - 1];
}

const BADGE_ICON = require('../assets/logros.png');
const pastelCycle = [COLORS.pastelPink, COLORS.pastelMelon, COLORS.pastelLila, COLORS.pastelCream];

// ✅ Insignias basadas en LEVELS (mismo orden)
const badgesCatalog = LEVELS.map((lvl, idx) => ({
  id: `b${idx + 1}`,
  title: lvl.key,
  threshold: lvl.threshold,          // ✅ esto se muestra como +8, +16, +24...
  icon: BADGE_ICON,
  bg: pastelCycle[idx % pastelCycle.length],
}));

export default function Achievements({ navigation }) {
  const insets = useSafeAreaInsets();

  // ✅ Puntos reales (backend)
  const [puntosUsuario, setPuntosUsuario] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(true);

  // Trae puntuaciones reales de la usuaria
  useEffect(() => {
    let mounted = true;

    const fetchScores = async () => {
      try {
        setLoadingPoints(true);
        const { data } = await api.get('/modulos/scores'); // requiere token

        // data esperado: [{ moduloId, puntuacion }, ...]
        const total = Array.isArray(data)
          ? data.reduce((sum, s) => sum + (Number(s.puntuacion) || 0), 0)
          : 0;

        if (mounted) setPuntosUsuario(total);
      } catch (e) {
        if (mounted) setPuntosUsuario(0);
      } finally {
        if (mounted) setLoadingPoints(false);
      }
    };

    fetchScores();
    return () => { mounted = false; };
  }, []);

  const currentLevel = useMemo(() => getCurrentLevel(puntosUsuario), [puntosUsuario]);
  const nextLevel = useMemo(() => getNextLevel(puntosUsuario), [puntosUsuario]);

  const nextThreshold = nextLevel.threshold || 8;
  const progress = Math.min(puntosUsuario / nextThreshold, 1);
  const percent = Math.round(progress * 100);

  // Accesibilidad (anunciar cuando ya hay puntos)
  useEffect(() => {
    if (loadingPoints) return;
    const progressAnnounce = `Tienes ${puntosUsuario} de ${nextThreshold} puntos, ${percent} por ciento completado.`;
    if (Platform.OS !== 'ios') {
      AccessibilityInfo.announceForAccessibility?.(progressAnnounce);
    }
  }, [puntosUsuario, nextThreshold, percent, loadingPoints]);

  const renderBadge = ({ item }) => {
    const unlocked = puntosUsuario >= item.threshold;

    const bg = unlocked ? item.bg : COLORS.lockedBg;
    const border = unlocked ? '#F2B8C6' : COLORS.lockedBorder;
    const textColor = unlocked ? COLORS.text : COLORS.lockedText;

    return (
      <View style={[styles.badgeCard, { backgroundColor: bg, borderColor: border }]}>
        <Image
          source={item.icon}
          style={[styles.badgeIcon, !unlocked && { tintColor: COLORS.lockedIcon, opacity: 0.85 }]}
          resizeMode="contain"
        />
        <Text style={[styles.badgeTitle, { color: textColor }]} numberOfLines={2}>
          {item.title}
        </Text>

        {/* ✅ Chip: muestra el acumulado requerido (+8, +16, +24...) */}
        <View style={[styles.pointsPill, unlocked ? styles.pointsPillUnlocked : styles.pointsPillLocked]}>
          <Text style={[styles.pointsPillText, !unlocked && { color: COLORS.lockedText }]}>
            +{item.threshold}
          </Text>
        </View>

        {!unlocked && <Text style={styles.badgeLockedLabel}>Bloqueada</Text>}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, hp('2.2%')) }]}>
        <Text style={styles.topTitle}>Tus logros</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <LottieView source={require('../assets/lottie/sparkles.json')} autoPlay loop style={styles.sparkles} />
            <Text style={styles.cardTitle}>LOGROS</Text>
            <LottieView source={require('../assets/lottie/sparkles.json')} autoPlay loop style={styles.sparkles} />
          </View>

          <View style={styles.centerScore}>
            <Text style={styles.scoreLabel}>Puntaje actual</Text>
            <Animatable.Text animation="pulse" iterationCount="infinite" duration={1400} style={styles.bigScore}>
              {loadingPoints ? '—' : puntosUsuario}
            </Animatable.Text>
          </View>

          <View style={styles.levelRow}>
            <Text style={styles.levelText}>Nivel</Text>
            <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
              <Text style={styles.levelBadgeText}>🏅 {currentLevel.key}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              {puntosUsuario} / {nextThreshold} para siguiente nivel
            </Text>

            <View style={styles.progressWrap}>
              <View style={styles.progressBarBG}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressStar}>⭐</Text>
            </View>
          </View>

          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation?.navigate('Modules')}
              style={styles.ctaButtonHit}
            >
              <Text style={styles.ctaButtonText}>¡Sigue aprendiendo!</Text>
            </TouchableOpacity>
          </LinearGradient>

          <Text style={styles.microcopy}>
            Cada logro te acerca a conocer mejor tu cuerpo 💪
          </Text>
        </View>

        <View style={styles.badgesHeaderRow}>
          <Text style={styles.badgesHeader}>Insignias</Text>
          <Text style={styles.badgesSubheader}>Desbloqueadas y por desbloquear</Text>
        </View>

        <FlatList
          data={badgesCatalog}
          keyExtractor={(it) => it.id}
          renderItem={renderBadge}
          numColumns={3}
          columnWrapperStyle={styles.badgesRow}
          contentContainerStyle={{ paddingBottom: hp('12%') }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <FooterGeneral navigation={navigation} activeScreen="Logros" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { width: '100%', paddingHorizontal: wp('5%'), paddingBottom: hp('1%') },
  topTitle: {
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: Math.max(wp('5.6%'), 20),
    marginTop: hp('1.8%'),
  },
  container: { flex: 1, paddingHorizontal: wp('4%') },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: COLORS.cardBorder,
    paddingVertical: hp('2.2%'),
    paddingHorizontal: wp('4%'),
    marginTop: hp('1%'),
    marginBottom: hp('1.5%'),
    shadowColor: '#A8A9BA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    marginBottom: hp('0.8%'),
  },
  sparkles: { width: wp('12%'), height: wp('12%') },
  cardTitle: {
    fontSize: Math.max(wp('7%'), 26),
    fontWeight: '900',
    color: COLORS.cardBorder,
    letterSpacing: 3,
    textAlign: 'center',
  },
  centerScore: { alignItems: 'center', marginTop: hp('0.2%'), marginBottom: hp('1%') },
  scoreLabel: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: Math.max(wp('3.4%'), 12),
    marginBottom: hp('0.2%'),
  },
  bigScore: {
    fontSize: Math.max(wp('11.5%'), 48),
    fontWeight: '900',
    color: COLORS.primary,
    textShadowColor: '#fff',
    textShadowRadius: 10,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: hp('1.2%') },
  levelText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: Math.max(wp('4.2%'), 16),
    marginRight: wp('2%'),
  },
  levelBadge: {
    borderRadius: 16,
    paddingVertical: hp('0.6%'),
    paddingHorizontal: wp('3.4%'),
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  levelBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: Math.max(wp('3.8%'), 14),
  },
  progressSection: { alignItems: 'center', width: '100%', marginBottom: hp('1.2%') },
  progressText: {
    fontSize: Math.max(wp('3.4%'), 12),
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: hp('0.4%'),
  },
  progressWrap: { width: '90%', alignItems: 'center' },
  progressBarBG: {
    width: '100%',
    height: Math.max(hp('2%'), 16),
    backgroundColor: COLORS.progressBg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.progressBorder,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.progressFill,
    borderRadius: 12,
  },
  progressStar: {
    position: 'absolute',
    right: -wp('2.5%'),
    top: -hp('0.6%'),
    fontSize: Math.max(wp('5.5%'), 18),
  },
  ctaGradient: {
    borderRadius: 16,
    marginTop: hp('1.4%'),
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  ctaButtonHit: {
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('7%'),
    borderRadius: 16,
  },
  ctaButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: Math.max(wp('4.6%'), 16),
    textAlign: 'center',
  },
  microcopy: {
    marginTop: hp('1%'),
    color: COLORS.text,
    fontSize: Math.max(wp('3.6%'), 13),
    opacity: 0.9,
    textAlign: 'center',
  },

  // ==== Insignias (grid sin hueco al centro) ====
  badgesHeaderRow: { paddingHorizontal: wp('1%'), marginTop: hp('1%'), marginBottom: hp('0.6%') },
  badgesHeader: { color: COLORS.text, fontWeight: '800', fontSize: Math.max(wp('4.8%'), 18) },
  badgesSubheader: { color: COLORS.text, opacity: 0.8, fontSize: Math.max(wp('3.4%'), 12) },

  // Alinea a la izquierda para que las últimas queden juntas
  badgesRow: {
    justifyContent: 'flex-start',
    paddingHorizontal: wp('1%'),
  },

  // 3 por fila con separación consistente
  badgeCard: {
    flexBasis: '31%',
    maxWidth: '31%',
    marginRight: wp('3%'),         // separación horizontal
    marginBottom: hp('1.2%'),      // separación vertical
    borderRadius: 16,
    paddingVertical: hp('1.1%'),
    paddingHorizontal: wp('2%'),
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  badgeIcon: { width: wp('12%'), height: wp('12%'), marginBottom: hp('0.5%') },
  badgeTitle: {
    textAlign: 'center',
    fontSize: Math.max(wp('3.2%'), 11),
    fontWeight: '700',
    minHeight: hp('3.2%'),
  },
  pointsPill: {
    marginTop: hp('0.3%'),
    borderRadius: 999,
    paddingVertical: hp('0.2%'),
    paddingHorizontal: wp('2.3%'),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsPillUnlocked: { backgroundColor: '#FFFFFF', borderColor: '#E9CFD9' },
  pointsPillLocked:   { backgroundColor: '#F7F7F7', borderColor: COLORS.lockedBorder },
  pointsPillText: { fontSize: Math.max(wp('3%'), 10), fontWeight: '800', color: COLORS.text },
  badgeLockedLabel: { marginTop: hp('0.2%'), color: COLORS.lockedText, fontSize: Math.max(wp('2.8%'), 10) },
});
