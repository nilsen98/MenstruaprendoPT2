// components/quizzes/QuizModule4.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import api from '../../services/api';

const COLORS = {
  bg: '#FDE1DE',
  white: '#FFFFFF',
  text: '#4A4A4A',
  primary: '#E77C9D',
  border: '#F2B8C6',
  danger: '#9E4942',
};

const PAIRS = [
  { id: 'p1', left: 'SPM', right: 'Síndrome premenstrual se abrevia con las siglas...' },
  { id: 'p2', left: 'Estrógeno', right: 'Hormona que nos hace sentir más alegres y activas' },
  { id: 'p3', left: 'Progesterona', right: 'Hormona que nos invita a descansar, nos sentimos más tranquilas' },
  { id: 'p4', left: 'Inflamación, cólicos', right: 'Síntomas durante la menstruación' },
  { id: 'p5', left: 'Folicular', right: 'Fase en la que el cuerpo produce estrógeno' },
  { id: 'p6', left: 'Fase Lútea', right: 'Aparece la progesterona' },
  { id: 'p7', left: 'Te puedes sentir más sensible o emocional', right: 'Cuando las hormonas bajan...' },
  { id: 'p8', left: 'El síndrome premenstrual', right: 'Presentar diarrea durante la menstruación, es un síntoma de...' },
  { id: 'p9', left: 'Verdadero', right: '¿Es normal sentir cólicos durante o previo a la menstruación?' },
  { id: 'p10', left: 'Falso', right: '¿Es normal dormir más de 13 horas durante o previo a la menstruación?' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizModule4({ navigation }) {
  const moduloId = 4;
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const exitingRef = useRef(false);
  const completedRef = useRef(false);

  const leftItems = useMemo(() => PAIRS.map((p) => ({ id: p.id, label: p.left })), []);
  const rightItems = useMemo(() => shuffle(PAIRS.map((p) => ({ id: p.id, label: p.right }))), []);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [wrongPulse, setWrongPulse] = useState(false);

const maxPoints = PAIRS.length; // 10 cuando tengas 10 pares
const score = matchedIds.size;  // 1 punto por match correcto
const MIN_PASS = 8;

const saveScore = async (scoreValue) => {
  try {
    // Solo permitimos guardar 8, 9 o 10
    if (scoreValue < 8 || scoreValue > 10) return;

    await api.post(`/modulos/${moduloId}/score`, { puntuacion: scoreValue });

    Alert.alert('Guardado', 'Tu puntuación se registró correctamente.', [
      {
        text: 'OK',
        onPress: () => {
          exitingRef.current = true;
          navigation.navigate('Modules', { refresh: Date.now() });
        },
      },
    ]);
  } catch (e) {
    console.log('Error guardando score:', e?.response?.status, e?.response?.data || e.message);
    const msg =
      e?.response?.data?.error ||
      `No se pudo guardar tu puntuación (HTTP ${e?.response?.status || '—'})`;
    Alert.alert('Error', msg);
  }
};

  // Confirmación al salir (igual que tu sopa)
  useEffect(() => {
    navigation?.setOptions?.({ gestureEnabled: false });

    const confirmExit = () =>
      new Promise((resolve) => {
        Alert.alert(
          '¿Salir del quiz?',
          'Si sales ahora, se borrará tu progreso en esta prueba.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Salir', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });

    const sub = navigation.addListener('beforeRemove', async (e) => {
      if (exitingRef.current) return;
      e.preventDefault();
      const ok = await confirmExit();
      if (ok) {
        exitingRef.current = true;
        navigation.dispatch(e.data.action);
      }
    });

    const backHW = BackHandler.addEventListener('hardwareBackPress', () => {
      (async () => {
        if (exitingRef.current) return true;
        const ok = await confirmExit();
        if (ok) {
          exitingRef.current = true;
          navigation.goBack();
        }
      })();
      return true;
    });

    return () => {
      sub?.();
      backHW.remove();
    };
  }, [navigation]);

  // Validar cuando hay selección de ambos lados
  useEffect(() => {
    if (!selectedLeft || !selectedRight) return;

    const ok = selectedLeft === selectedRight;

    if (ok && !matchedIds.has(selectedLeft)) {
      setMatchedIds((prev) => {
        const next = new Set(prev);
        next.add(selectedLeft);
        return next;
      });
    } else {
      setWrongPulse(true);
      setTimeout(() => setWrongPulse(false), 220);
    }

    setTimeout(() => {
      setSelectedLeft(null);
      setSelectedRight(null);
    }, ok ? 120 : 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeft, selectedRight]);

  // Auto-final cuando completa todos
  useEffect(() => {
    if (score === maxPoints && !completedRef.current) {
      completedRef.current = true;
      Alert.alert('¡Terminaste! 🎉', 'Relacionaste todas correctamente.', [
        {
          text: 'Continuar',
          onPress: () => {
            Alert.alert(
              '¡Bien hecho! 🎉',
              `Obtuviste ${score}/${maxPoints} puntos.`,
              [
                {
                  text: 'Guardar',
                  onPress: async () => {
                    await saveScore(score);
                  },
                },
              ],
              { cancelable: false }
            );
          },
        },
      ]);
    }
  }, [score, maxPoints]);

  const handleSubmit = () => {
  if (score >= MIN_PASS && score < maxPoints) {
    Alert.alert(
      '¿Enviar ahora?',
      `Llevas ${score}/${maxPoints} puntos. ¿Quieres enviar tu quiz o seguir intentando para lograr el 10/10?`,
      [
        { text: 'Seguir intentando', style: 'cancel' },
        {
          text: 'Enviar ahora',
          onPress: () => {
            Alert.alert(
              '¡Bien hecho! 🎉',
              `Obtuviste ${score}/${maxPoints} puntos.`,
              [
                {
                  text: 'Guardar',
                  onPress: async () => {
                    await saveScore(score); // ✅ guarda 8 o 9
                  },
                },
              ],
              { cancelable: false }
            );
          },
        },
      ],
      { cancelable: true }
    );
    return;
  }

  if (score < MIN_PASS) {
    const faltan = MIN_PASS - score;
    Alert.alert(
      '¡Casi! 💪',
      `Llevas ${score}/${maxPoints} puntos. Te faltan ${faltan} punto(s) para pasar de nivel. ¡Inténtalo de nuevo!`,
      [{ text: 'Seguir intentando' }],
      { cancelable: true }
    );
    return;
  }

  // score === maxPoints (10/10)
  Alert.alert(
    '¡Bien hecho! 🎉',
    `Obtuviste ${score}/${maxPoints} puntos.`,
    [
      {
        text: 'Guardar',
        onPress: async () => {
          await saveScore(score); // ✅ guarda 10
        },
      },
    ],
    { cancelable: false }
  );
};

  const isMatched = (id) => matchedIds.has(id);

  // Ajustes visuales tablet (sin estirar feo)
  const wrapStyleTablet = {
    width: '100%',
    alignSelf: 'center',
    maxWidth: isTablet ? 1100 : undefined,
    marginHorizontal: isTablet ? wp('3%') : wp('6%'),
    padding: isTablet ? wp('4%') : wp('3%'),
    minHeight: isTablet ? hp('42%') : undefined,
  };

  const itemPad = {
    paddingVertical: isTablet ? hp('1.6%') : hp('1.1%'),
    paddingHorizontal: isTablet ? wp('3.5%') : wp('3%'),
  };

  const itemFont = { fontSize: isTablet ? 20 : Math.max(wp('3.4%'), 12) };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, hp('1%')) }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: hp('4%') }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.title}>Módulo 4: Síntomas en la menstruación</Text>
          <Text style={styles.subtitle}>Relaciona cada concepto con su definición ✨</Text>
        </View>

        <View style={[styles.matchWrap, wrongPulse && styles.matchWrapWrong, wrapStyleTablet]}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Conceptos</Text>
            {leftItems.map((it) => {
              const done = isMatched(it.id);
              const active = selectedLeft === it.id;

              return (
                <TouchableOpacity
                  key={it.id}
                  activeOpacity={0.9}
                  disabled={done}
                  onPress={() => setSelectedLeft((prev) => (prev === it.id ? null : it.id))}
                  style={[
                    styles.matchItem,
                    itemPad,
                    done && styles.matchItemDone,
                    active && styles.matchItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.matchItemText,
                      itemFont,
                      done && styles.matchItemTextDone,
                    ]}
                  >
                    {it.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.col}>
            <Text style={styles.colTitle}>Definiciones</Text>
            {rightItems.map((it) => {
              const done = isMatched(it.id);
              const active = selectedRight === it.id;

              return (
                <TouchableOpacity
                  key={it.id}
                  activeOpacity={0.9}
                  disabled={done}
                  onPress={() => setSelectedRight((prev) => (prev === it.id ? null : it.id))}
                  style={[
                    styles.matchItem,
                    itemPad,
                    done && styles.matchItemDone,
                    active && styles.matchItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.matchItemText,
                      itemFont,
                      done && styles.matchItemTextDone,
                    ]}
                  >
                    {it.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.hint}>Toca uno de la izquierda y luego su pareja de la derecha.</Text>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.9}>
          <Text style={styles.submitTxt}>Enviar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    width: '100%',
    paddingHorizontal: wp('5%'),
    paddingTop: hp('1.8%'),
    paddingBottom: hp('1%'),
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: Math.max(wp('5.2%'), 18),
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: Math.max(wp('3.6%'), 12),
    marginTop: hp('0.3%'),
    textAlign: 'center',
  },

  matchWrap: {
    marginTop: hp('1.0%'),
    marginHorizontal: wp('6%'),
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: wp('3%'),
    flexDirection: 'row',
    gap: 10,
  },
  matchWrapWrong: { borderColor: COLORS.danger },

  // ✅ sin space-between (evita huecos feos)
  col: { flex: 1 },

  colTitle: {
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: hp('0.8%'),
    textAlign: 'center',
    fontSize: Math.max(wp('3.8%'), 13),
  },

  matchItem: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: hp('1.1%'),
    paddingHorizontal: wp('3%'),
    marginBottom: hp('1%'),
  },
  matchItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FDE1DE',
  },
  matchItemDone: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  matchItemText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: Math.max(wp('3.4%'), 12),
    textAlign: 'center',
  },
  matchItemTextDone: {
    color: '#fff',
    textDecorationLine: 'line-through',
  },

  hint: {
    textAlign: 'center',
    color: COLORS.text,
    opacity: 0.8,
    marginTop: hp('1%'),
    fontSize: Math.max(wp('3.2%'), 11.5),
  },

  submitBtn: {
    marginTop: hp('1.2%'),
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('20%'),
    marginBottom: hp('2.2%'),
  },
  submitTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: Math.max(wp('4.2%'), 14),
  },
});