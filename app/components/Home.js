// components/Home.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  Animated, TouchableWithoutFeedback, BackHandler
} from 'react-native';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import FooterGeneral from './FooterGeneral';
import api from '../services/api';

const PINK = '#E77C9D';
const TEXT = '#4A4A4A';
const APP_BG = '#FDE1DE';

// Helper: etiqueta "Hoy, DD Mes" en español con timezone forzada y sin "." ni "-"
const getTodayLabelES = () => {
  try {
    const tz = 'America/Mexico_City';
    const d = new Date();
    const dd = new Intl.DateTimeFormat('es-MX', { day: '2-digit', timeZone: tz }).format(d);
    let mon = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: tz }).format(d);
    mon = mon.replace(/[.\-]/g, '').trim();         // quita “.” y “-”
    mon = mon.charAt(0).toUpperCase() + mon.slice(1);
    if (mon.toLowerCase().startsWith('sept')) mon = 'Sep'; // normaliza “sept”
    return `Hoy, ${dd} ${mon}`;
  } catch {
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const d2 = new Date();
    const dd2 = String(d2.getDate()).padStart(2, '0');
    return `Hoy, ${dd2} ${MESES[d2.getMonth()]}`;
  }
};

export default function Home({ navigation, route }) {
  const insets = useSafeAreaInsets();


const [pred, setPred] = useState({
  loading: true,
  cycleDays: 28,
  daysLeft: null,
  nextISO: null,          // teórica
  nextISOAdjusted: null,  // ajustada al futuro
});



const progress = useMemo(() => {
  if (pred.daysLeft == null) return 0;
  const total = pred.cycleDays || 28;
  const left = Math.max(0, pred.daysLeft);
  return Math.max(0, Math.min(1, (total - left) / total));
}, [pred.daysLeft, pred.cycleDays]);

const fillPercent = useMemo(() => {
  if (pred.daysLeft == null) return 0;
  const p = progress * 100;
  return Math.max(8, p); // mínimo para que se note
}, [progress, pred.daysLeft]);

  // Fecha “Hoy, DD Mes”
  const todayLabel = useMemo(() => getTodayLabelES(), []);

const fetchPred = async () => {
  try {
    setPred((p) => ({ ...p, loading: true }));

    const { data } = await api.get('/prediccion');
   console.log('pred', {
  now: new Date().toISOString().slice(0,10),
  next: data?.nextPeriodStart,
  adjusted: data?.adjustedNextPeriodStart,
  days: data?.daysRemaining,
  cycle: data?.predictedCycleLengthDays,
});


   if (data?.ok) {
  setPred({
    loading: false,
    cycleDays: data.predictedCycleLengthDays ?? 28,
    daysLeft: typeof data.daysRemaining === 'number' ? data.daysRemaining : null,
    nextISO: data.nextPeriodStart ?? null,
    nextISOAdjusted: data.adjustedNextPeriodStart ?? null,
  });
  return;
}

    setPred((p) => ({
      ...p,
      loading: false,
      daysLeft: null,
      nextISO: null,
      nextISOAdjusted: null,
    }));
  } catch (e) {
      console.log(
      'HOME /prediccion ERROR =>',
      e?.response?.status,
      e?.response?.data || e.message
    ); // 👈 aquí
    setPred((p) => ({
      ...p,
      loading: false,
      daysLeft: null,
      nextISO: null,
      nextISOAdjusted: null,
    }));
  }
};




useEffect(() => {
  fetchPred();
}, []);
useEffect(() => {
  if (route?.params?.refreshHome) {
    fetchPred();
  }
}, [route?.params?.refreshHome]);

  // ---- Mensajes barra informativa ----
  const infoData = [
    { emoji: '🧘‍♀️', text: 'Recuerda llevar un control sobre tu periodo.' },
    { emoji: '💧',   text: '¿Ya marcaste en el calendario cuando empezó tu ciclo?' },
    { emoji: '🌸',   text: 'Si estás en tus días, no olvides cambiar tu toalla sanitaria o el producto que uses.' },
    { emoji: '😊',   text: '¿Sabías que... existen más de 4 productos menstruales?' },
    { emoji: '🍫',   text: '¿Sabías que... las toallas sanitarias y los tampones deben cambiarse cada 4 horas?' },
    { emoji: '🧘‍♀️', text: 'Si tienes cólicos, aplica una compresa caliente o un paño tibio sobre el abdomen.' },
    { emoji: '💧',   text: 'Descansa lo suficiente durante la menstruación para ayudar a tu cuerpo a recuperarse.' },
    { emoji: '🌸',   text: 'Recuerda que la menstruación es una parte normal en la vida de las mujeres.' },
    { emoji: '😊',   text: '¿Sabías que... normalmente la primera menstruación llega de los 9 hasta los 15 años?' },
    { emoji: '🍫',   text: '¿Sabías que... cuando llegues al Nivel ya nada te para habrás completado todos los módulos de la aplicación?' },
    {emoji: '🗓️', text:'¿Sabías que...en la pantalla Calendario puedes registrar tu periodo? '},
    {emoji:'🗒️', text:'¿Sabías que...en la pantalla Editar perfil puedes agregar a un tutor para poderle mandar un registro menstrual?'},
  ];

const [infoIndex, setInfoIndex] = useState(0);
const fade = useRef(new Animated.Value(1)).current;
const tickTimeoutRef = useRef(null);


  // Fade con setTimeout (menos wakeups que setInterval)
useEffect(() => {
  let mounted = true;

  const tick = () => {
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: false }).start(() => {
      if (!mounted) return;

      setInfoIndex((prev) => (prev + 1) % infoData.length);

      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: false }).start(() => {
        if (!mounted) return;
        tickTimeoutRef.current = setTimeout(tick, 3000);
      });
    });
  };

  tickTimeoutRef.current = setTimeout(tick, 3000);

  return () => {
    mounted = false;
    if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
    fade.stopAnimation();
  };
}, [fade, infoData.length]);



  // ---- Menú hamburguesa ----
  const [menuOpen, setMenuOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const menuWidth = Math.min(wp('58%'), 300);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  };
  const closeMenu = () => {
    Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      setMenuOpen(false);
    });
  };
  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [menuWidth, 0],
  });

  // Cerrar panel con botón back (Android)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuOpen) { closeMenu(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menuOpen]);

  // ---- Anillo (más grande y más grueso) ----
  const RING_SIZE   = Math.max(Math.min(wp('75%'), 300), 200);
  const RING_STROKE = Math.max(Math.min(wp('7%'), 24), 12);

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* TopBar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, hp('1%')) }]}>
          <View style={styles.topBarSide} />
          <Text style={styles.appTitle} accessibilityRole="header">MenstruAprendo</Text>
          <TouchableOpacity
            onPress={openMenu}
            style={styles.hamburgerBtn}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Barra informativa — rosa, full-bleed, sin radio, más abajo */}
        <Animated.View
          style={[
            styles.infoBarCard,
            { opacity: fade, marginTop: hp('0%') }
          ]}
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji} allowFontScaling>
              {infoData[infoIndex].emoji}
            </Text>
            <Text style={styles.infoTextCard} numberOfLines={3}>
              {infoData[infoIndex].text}
            </Text>
          </View>
        </Animated.View>

        {/* Progreso del ciclo */}
        <View style={styles.progressContainer}>
         <ScrollView
    style={styles.miCicloScroll}
    contentContainerStyle={styles.miCicloScrollContent}
    showsVerticalScrollIndicator={false}
  >
          <View style={styles.progressBox}>
            {/* Fecha en pastilla (solo borde rosa), esquina sup. izq */}
            <View style={styles.dateBadge} accessible accessibilityLabel={todayLabel}>
              <Text style={styles.dateBadgeText}>{todayLabel}</Text>
            </View>

            <Text style={styles.calendarTitle} accessibilityRole="header">Mi ciclo</Text>

            <AnimatedCircularProgress
              key={`${pred.cycleDays}-${pred.daysLeft}-${pred.nextISOAdjusted || pred.nextISO || ''}`}
              size={RING_SIZE}
              width={RING_STROKE}
              fill={fillPercent}
              tintColor={PINK}
              backgroundColor="#FDE1DE"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <View style={styles.progressInnerContainer}>
                 <Text style={styles.daysLeftTextInsideCircle}>
  {pred.loading
  ? 'Calculando…'
  : pred.nextISO
    ? `Faltan ${Math.max(0, pred.daysLeft ?? 0)} día${Math.max(0, pred.daysLeft ?? 0) === 1 ? '' : 's'}\npara tu periodo`
    : 'Sin predicción'}

</Text>

                  <Image
                    source={require('../assets/Menstrua.png')}
                    style={styles.menstruaIcon}
                    resizeMode="contain"
                    accessible
                    accessibilityLabel="Icono menstruación"
                  />
                </View>
              )}
            </AnimatedCircularProgress>

            <Text style={styles.motivationText}>
              Cada etapa es única, aprende a escuchar tu cuerpo.
            </Text>
          </View>
          </ScrollView>
        </View>
      </View>

      {/* Overlay + Panel menú */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
      <Animated.View
        style={[
          styles.menuPanel,
          { width: menuWidth, paddingTop: Math.max(insets.top, hp('2%')), transform: [{ translateX }] },
        ]}
        pointerEvents={menuOpen ? 'auto' : 'none'}
        accessibilityRole="menu"
      >
        <TouchableOpacity
          onPress={closeMenu}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
        >
          <Image source={require('../assets/close.png')} style={styles.closeIcon} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { closeMenu(); navigation.navigate('Profile'); }}
          accessibilityRole="button"
          accessibilityLabel="Editar perfil"
        >
          <Text style={styles.menuItemText}>Editar perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { closeMenu(); navigation.replace('Inicio'); }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={styles.menuItemText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>

      <FooterGeneral />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_BG },
  container: { flex: 1, paddingHorizontal: wp('5%'), paddingTop: 0 },

  // TopBar
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('2%'),
    minHeight: hp('6.5%'),
  },
  topBarSide: { width: wp('10%') },
  appTitle: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: Math.max(wp('5.2%'), 20),
    color: TEXT,
    fontWeight: 'bold',
  },
  hamburgerBtn: { width: wp('10%'), alignItems: 'flex-end', paddingVertical: hp('1%') },
  hamburgerIcon: { fontSize: Math.max(wp('7.5%'), 22), color: PINK },

  // ===== Barra informativa: rosa, full-bleed, sin radio =====
  infoBarCard: {
    alignSelf: 'stretch',
    marginHorizontal: -wp('5%'), // full-bleed: ocupa todo el ancho
    width: 'auto',
    minHeight: Math.max(hp('14%'), 110),
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('5%'),
    backgroundColor:  'rgba(231, 124, 157, 0.90)', 
    borderRadius: 0,             // sin radio
    // sombra suave
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'center',
    marginBottom: hp('8%'),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: wp('3%') },
  infoEmoji: {
    fontSize: Math.max(wp('7.4%'), 26),
    lineHeight: Math.max(wp('8%'), 28),
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: '#FFFFFF',
  },
  infoTextCard: {
    flex: 1,
    fontSize: Math.max(wp('2.4%'), 16),
    lineHeight: Math.max(hp('2.2%'), 20),
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Progreso
  progressContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: hp('3%') },
  progressBox: {
    backgroundColor: '#fff',
    borderRadius: wp('4%'),
    paddingVertical: hp('3%'),
    paddingHorizontal: wp('6%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
    position: 'relative',
  },

  // Pastilla de fecha: solo borde rosa, texto rosa
  dateBadge: {
    position: 'absolute',
    top: hp('1.6%'),
    left: wp('4%'),
    paddingVertical: hp('0.6%'),
    paddingHorizontal: wp('3%'),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PINK,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  dateBadgeText: {
    color: PINK,
    fontWeight: '700',
    fontSize: Math.max(wp('3.6%'), 12),
  },

  // Más espacio para “Mi ciclo”
  calendarTitle: {
    fontSize: Math.max(wp('6.6%'), 22),
    color: TEXT,
    textAlign: 'center',
    marginTop: hp('2.2%'),   // más aire arriba
    marginBottom: hp('2%'),  // más aire abajo
    fontWeight: 'bold',
  },

  progressInnerContainer: { alignItems: 'center', justifyContent: 'center', marginTop: hp('0.8%') },
  daysLeftTextInsideCircle: {
    fontSize: Math.max(wp('4.7%'), 18),
    color: TEXT,
    textAlign: 'center',
    marginBottom: hp('1%'),
  },
  menstruaIcon: { width: wp('10%'), height: wp('10%'), marginTop: hp('1%') },

  motivationText: {
    marginTop: hp('2%'),
    fontSize: Math.max(wp('4.2%'), 15),
    color: TEXT,
    textAlign: 'center',
  },

  // Overlay + Panel
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 200 },
  menuPanel: {
    position: 'absolute', top: 0, bottom: 0, right: 0,
    backgroundColor: '#FFFFFF', paddingHorizontal: wp('3%'),
    zIndex: 210, elevation: 8, borderTopLeftRadius: wp('4%'), borderBottomLeftRadius: wp('4%'),
  },
  closeBtn: { alignSelf: 'flex-end', padding: hp('0.4%') },
  closeIcon: { width: wp('7.5%'), height: wp('7.5%') },
  menuItem: {
    paddingVertical: hp('1.6%'),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee'
  },
  menuItemText: { fontSize: Math.max(wp('4%'), 14), color: TEXT },
  miCicloScroll: {
  maxHeight: hp('62%'),   //(60–70% suele quedar bien)
  width: '100%',
},
miCicloScrollContent: {
  paddingBottom: hp('15%'), // espacio extra al final del scroll
},
});
