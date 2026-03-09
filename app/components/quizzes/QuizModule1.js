// components/quizzes/QuizModule1.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import api from '../../services/api';

const COLORS = {
  bg: '#FDE1DE',
  white: '#FFFFFF',
  text: '#4A4A4A',
  primary: '#E77C9D',
  border: '#F2B8C6',
  good: '#E77C9D',
  found: '#E77C9D',
  select: '#E77C9D',
};

const DISPLAY_WORDS = [
  'PREADOLESCENCIA',
  'PUBERTAD',
  'HORMONAS',
  'EMOCIONES',
  'CRECIMIENTO',
];

const normalize = (s) =>
  s
    .toUpperCase()
    .replaceAll('Á', 'A')
    .replaceAll('É', 'E')
    .replaceAll('Í', 'I')
    .replaceAll('Ó', 'O')
    .replaceAll('Ú', 'U')
    .replaceAll('Ü', 'U')
    .replaceAll('Ñ', 'N')
    .replace(/\s+/g, '');

const WORDS = DISPLAY_WORDS.map(w => ({ display: w, norm: normalize(w) }));

const DIRS = [
  [ 1,  0], [-1,  0],
  [ 0,  1], [ 0, -1],
  [ 1,  1], [-1, -1],
  [ 1, -1], [-1,  1],
];

function buildGridEnsuringAll(words, startSize, maxSize, attemptsPerSize = 1500) {
  let size = Math.max(startSize, 2);

  while (size <= maxSize) {
    for (let attempt = 0; attempt < attemptsPerSize; attempt++) {
      const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ''));
      const placements = [];

      const fits = (x, y, dx, dy, word) => {
        let cx = x, cy = y;
        for (let i = 0; i < word.length; i++) {
          if (cx < 0 || cy < 0 || cx >= size || cy >= size) return false;
          const cell = grid[cy][cx];
          if (cell && cell !== word[i]) return false;
          cx += dx; cy += dy;
        }
        return true;
      };

      const shuffled = [...words].sort(() => Math.random() - 0.5);
      let ok = true;

      for (const w of shuffled) {
        let placed = false;
        for (let inner = 0; inner < 800 && !placed; inner++) {
          const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)];
          const x = Math.floor(Math.random() * size);
          const y = Math.floor(Math.random() * size);
          if (!fits(x, y, dx, dy, w.norm)) continue;

          const coords = [];
          let cx = x, cy = y;
          for (let i = 0; i < w.norm.length; i++) {
            grid[cy][cx] = w.norm[i];
            coords.push([cx, cy]);
            cx += dx; cy += dy;
          }
          placements.push({ norm: w.norm, display: w.display, coords });
          placed = true;
        }
        if (!placed) { ok = false; break; }
      }

      if (!ok) continue;

      const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (!grid[y][x]) grid[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
      return { grid, placements, size };
    }
    size += 1;
  }
  return buildGridEnsuringAll(words, maxSize + 1, maxSize + 3, attemptsPerSize);
}

export default function QuizModule1({ navigation }) {
  const moduloId = 1;
  const insets = useSafeAreaInsets();

const { width, height } = useWindowDimensions();
const isTablet = Math.min(width, height) >= 600;

  const MAX_LEN = Math.max(...WORDS.map(w => w.norm.length));
  const { grid, placements, size } = useMemo(
    () => buildGridEnsuringAll(WORDS, MAX_LEN, MAX_LEN + 4, 2000),
    []
  );

  const [found, setFound] = useState(new Set());
  const [selStart, setSelStart] = useState(null); // {x,y}
  const exitingRef = useRef(false);      // evita doble prompt al salir
  const completedRef = useRef(false);    // evita repetir alertas al terminar

  // ✅ Guarda score y al OK regresa directo a Modules (para refrescar desbloqueo)
  const saveScore = async (score, maxPoints) => {
    try {
      const puntuacion = score >= maxPoints ? 10 : 8;

      await api.post(`/modulos/${moduloId}/score`, { puntuacion });

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

  // Bloqueo de back con confirmación (sin duplicados)
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
      if (exitingRef.current) return; // ya decidido salir
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

  // === tamaño dinámico: cuadro cuadrado sin padding lateral ===
  const GRID_SIDE = wp('100%');
  const GRID_PADDING = 0;
  const CELL_GAP = 1;

  const CELL_SIZE = Math.floor(
    (GRID_SIDE - 2 * GRID_PADDING - (size - 1) * CELL_GAP) / size
  );
  const CELL_FONTSIZE = Math.max(Math.floor(CELL_SIZE * 0.58), 12);

  // === lógica de selección ===
  const onCellPress = (x, y) => {
    if (!selStart) {
      setSelStart({ x, y });
      return;
    }
    const sx = selStart.x, sy = selStart.y;
    const dx = Math.sign(x - sx);
    const dy = Math.sign(y - sy);

    if (dx === 0 && dy === 0) {
      setSelStart({ x, y });
      return;
    }
    if (dx !== 0 && dy !== 0 && Math.abs(x - sx) !== Math.abs(y - sy)) {
      setSelStart(null);
      return;
    }

    const path = [];
    let cx = sx, cy = sy;
    path.push([cx, cy]);
    while (cx !== x || cy !== y) {
      cx += dx; cy += dy;
      if (cx < 0 || cy < 0 || cx >= size || cy >= size) break;
      path.push([cx, cy]);
    }
    const selected = path.map(([px, py]) => grid[py][px]).join('');

    const match = placements.find(p => {
      const target = p.coords.map(([px, py]) => grid[py][px]).join('');
      return selected === target || selected === target.split('').reverse().join('');
    });

    if (match && !found.has(match.norm)) {
      const nf = new Set(found);
      nf.add(match.norm);
      setFound(nf);
      setSelStart(null);
    } else {
      setSelStart(null);
    }
  };

  // coords encontradas
  const foundCoordsKey = useMemo(() => {
    const map = new Set();
    placements.forEach(p => {
      if (found.has(p.norm)) p.coords.forEach(([x, y]) => map.add(`${x},${y}`));
    });
    return map;
  }, [found, placements]);

  // === AUTO: cuando llegas a 10 puntos (5 palabras) ===
  useEffect(() => {
    const wordsFound = found.size;
    const score = wordsFound * 2;
    const maxPoints = placements.length * 2;

    if (score === maxPoints && !completedRef.current) {
      completedRef.current = true; // evita repetir
      Alert.alert(
        '¡Terminaste la sopa! 🎉',
        'Encontraste todas las palabras.',
        [
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
                      await saveScore(score, maxPoints);
                    },
                  },
                ],
                { cancelable: false }
              );
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [found, placements.length]);

  // === Enviar / calificar con confirmación si tiene 8 o 9 ===
  const handleSubmit = () => {
    const wordsFound = found.size;
    const score = wordsFound * 2;
    const maxPoints = placements.length * 2;

    if (score >= 8 && score < maxPoints) {
      Alert.alert(
        '¿Enviar ahora?',
        `Llevas ${score}/${maxPoints} puntos. ¿Quieres enviar tu quiz o seguir buscando para lograr el 10/10?`,
        [
          { text: 'Seguir buscando', style: 'cancel' },
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
                      await saveScore(score, maxPoints);
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

    if (score < 8) {
      const faltan = 8 - score;
      Alert.alert(
        '¡Casi! 💪',
        `Llevas ${score}/${maxPoints} puntos. Te faltan ${faltan} punto(s) para pasar de nivel. ¡Inténtalo de nuevo, tú puedes!`,
        [{ text: 'Seguir intentando' }],
        { cancelable: true }
      );
      return;
    }

    // Si ya tiene el máximo, probablemente el auto-flow ya lo manejó;
    // pero por si presiona Enviar, mostramos directo “Bien hecho”.
    if (score === maxPoints) {
      Alert.alert(
        '¡Bien hecho! 🎉',
        `Obtuviste ${score}/${maxPoints} puntos.`,
        [
          {
            text: 'Guardar',
            onPress: async () => {
              await saveScore(score, maxPoints);
            },
          },
        ],
        { cancelable: false }
      );
    }
  };

  const isStartCell = (x, y) => selStart && selStart.x === x && selStart.y === y;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, hp('1%')) }]}>
      <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: hp('4%') }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Text style={styles.title}>Módulo 1: Preadolescencia</Text>
        <Text style={styles.subtitle}>Encuentra las palabras escondidas ✨</Text>
      </View>

      {/* Palabras (arriba) */}
      <View style={styles.wordsCard}>
        <Text style={styles.wordsTitle}>Palabras</Text>
        <View style={styles.wordsWrap}>
          {placements.map(p => {
            const done = found.has(p.norm);
            return (
              <View
                key={p.norm}
                style={[
                  styles.wordPill,
                  {
                    backgroundColor: done ? COLORS.good : COLORS.white,
                    borderColor: done ? COLORS.primary : COLORS.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.wordPillText,
                    { textDecorationLine: done ? 'line-through' : 'none', color: COLORS.text },
                  ]}
                >
                  {p.display}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Cuadro sin padding lateral, ocupa 100% del ancho */}
      <View style={[styles.gridWrap, { width: GRID_SIDE, height: GRID_SIDE, padding: GRID_PADDING, alignSelf: 'center' }]}>
        <View>
          {grid.map((row, y) => (
            <View key={`r${y}`} style={[styles.row, { marginBottom: y < size - 1 ? CELL_GAP : 0 }]}>
              {row.map((ch, x) => {
                const key = `${x},${y}`;
                const isFoundCell = foundCoordsKey.has(key);
                const isStart = isStartCell(x, y);
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => onCellPress(x, y)}
                    activeOpacity={0.8}
                    style={[
                      styles.cell,
                      {
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        marginRight: x < size - 1 ? CELL_GAP : 0,
                        backgroundColor: isFoundCell
                          ? COLORS.found
                          : isStart
                          ? COLORS.select
                          : COLORS.white,
                        borderColor: isFoundCell ? COLORS.primary : COLORS.border,
                      },
                    ]}
                  >
                    <Text style={[styles.cellText, { fontSize: CELL_FONTSIZE }]}>{ch}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.hint}>Toca la letra de inicio y luego la letra final de la palabra.</Text>

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
    paddingBottom: hp('1.8%'),
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: Math.max(wp('5.2%'), 18),
  },
  subtitle: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: Math.max(wp('3.6%'), 12),
    marginTop: hp('0.3%'),
  },

  wordsCard: {
    marginTop: hp('0.6%'),
    marginHorizontal: wp('6%'),
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: wp('3%'),
    elevation: 2,
  },
  wordsTitle: {
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: hp('0.6%'),
    fontSize: Math.max(wp('4.4%'), 16),
    textAlign: 'center',
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  wordPill: {
    borderRadius: 999,
    paddingVertical: hp('0.4%'),
    paddingHorizontal: wp('3%'),
    borderWidth: 1,
  },
  wordPillText: {
    fontWeight: '800',
    fontSize: Math.max(wp('3.2%'), 11.5),
  },

  gridWrap: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
    borderRadius: 0,
    borderWidth: 0,
    marginTop: hp('1.0%'),
    justifyContent: 'center',
    alignItems: 'center',
  },

  row: { flexDirection: 'row' },

  cell: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderColor: COLORS.border,
  },
  cellText: {
    color: COLORS.text,
    fontWeight: '800',
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
    color: COLORS.white,
    fontWeight: '800',
    fontSize: Math.max(wp('4.2%'), 14),
  },
});