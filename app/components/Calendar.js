// components/Calendar.js
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  InteractionManager,
} from 'react-native';
import { CalendarList, LocaleConfig } from 'react-native-calendars';
import Modal from 'react-native-modal';
import { useWindowDimensions } from 'react-native';
import FooterGeneral from './FooterGeneral';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import api from '../services/api';

const APP_BG = '#FDE1DE';
const TEXT = '#4A4A4A';
const PINK = '#E77C9D';
const CARD_BORDER = '#F2B8C6';

// ===== Locale español =====
LocaleConfig.locales.es = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  today: 'hoy',
};
LocaleConfig.defaultLocale = 'es';

// ==== helpers ====
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const prettyDate = (key) => {
  if (!key) return '';
  const [, m, d] = key.split('-');
  const month = LocaleConfig.locales.es.monthNames[Number(m) - 1];
  return `${Number(d)} ${month}`;
};

const yyyymmFromDateKey = (key) => key.slice(0, 7);

// Mapeo UI -> ENUM prisma
const toFlujoEnum = (v) =>
  ({
    Ligero: 'LIGERO',
    Moderado: 'MODERADO',
    Abundante: 'ABUNDANTE',
  }[v]);

const toAnimoEnum = (v) =>
  ({
    Feliz: 'FELIZ',
    Triste: 'TRISTE',
    Enojada: 'ENOJADA',
  }[v]);

// Mapeo ENUM prisma -> UI
const fromFlujoEnum = (v) =>
  ({
    LIGERO: 'Ligero',
    MODERADO: 'Moderado',
    ABUNDANTE: 'Abundante',
  }[v]);

const fromAnimoEnum = (v) =>
  ({
    FELIZ: 'Feliz',
    TRISTE: 'Triste',
    ENOJADA: 'Enojada',
  }[v]);

const periodoIcons = {
  Ligero: require('../assets/Ligero.png'),
  Moderado: require('../assets/Moderado.png'),
  Abundante: require('../assets/Abundante.png'),
};
const emocionIcons = {
  Feliz: require('../assets/Feliz.png'),
  Triste: require('../assets/Triste.png'),
  Enojada: require('../assets/Enojada.png'),
};

const PERIODO_COLOR = {
  Ligero: '#F9B4CB',
  Moderado: '#E77C9D',
  Abundante: '#9E4942',
};
const EMOCION_COLOR = '#886B65';

export default function Calendar({ navigation }) {
  const insets = useSafeAreaInsets();
const { width, height } = useWindowDimensions();
const isTablet = Math.min(width, height) >= 600;
  // círculo responsivo para los días
  const CIRCLE = useMemo(() => Math.max(32, Math.min(wp('9%'), 40)), []);

  const [markedDates, setMarkedDates] = useState({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [selectedEmocion, setSelectedEmocion] = useState(null);

  const todayKey = localDateKey();
  const [currentMonth, setCurrentMonth] = useState(yyyymmFromDateKey(todayKey));

  // ✅ Protecciones anti-crash (unknown view tag)
  const mountedRef = useRef(true);
  const interactionRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (interactionRef.current?.cancel) interactionRef.current.cancel();
    };
  }, []);

  const resetSelection = () => {
    setSelectedDate('');
    setSelectedPeriodo(null);
    setSelectedEmocion(null);
  };

  const closeModal = () => {
    if (interactionRef.current?.cancel) interactionRef.current.cancel();
    setModalVisible(false);
  };

  const handleDayPress = (day) => {
    if (isModalVisible) return;

    const key = day.dateString;
    const existing = markedDates[key];

    setSelectedDate(key);
    setSelectedPeriodo(existing?.periodo || null);
    setSelectedEmocion(existing?.emociones || null);

    // ✅ Cancela interacción anterior si existía
    if (interactionRef.current?.cancel) interactionRef.current.cancel();

    // ✅ Abre el modal después de terminar interacciones del calendario
    interactionRef.current = InteractionManager.runAfterInteractions(() => {
      if (!mountedRef.current) return;
      setModalVisible(true);
    });
  };

  // ======== Cargar periodos del mes (GET /api/periodos?mes=YYYY-MM) ========
  const loadPeriodos = async (mesYYYYMM) => {
    try {
      const { data } = await api.get(`/periodos?mes=${mesYYYYMM}`);

      const nextMarked = {};

      data.forEach((periodo) => {
        (periodo.dias || []).forEach((dia) => {
          const key = new Date(dia.fecha).toISOString().slice(0, 10);
          const periodoUI = fromFlujoEnum(dia.flujo);
          const emocionUI = fromAnimoEnum(dia.animo);
          const color = PERIODO_COLOR[periodoUI] || PINK;

          nextMarked[key] = {
            selected: true,
            selectedColor: color,
            periodo: periodoUI,
            emociones: emocionUI,
            diaId: dia.id,
            periodoId: periodo.id,
          };
        });
      });

      if (!mountedRef.current) return;
      // merge para evitar “pisar” el tap/edición en el mismo instante
      setMarkedDates((prev) => ({ ...prev, ...nextMarked }));
    } catch (e) {
      console.log('Error cargando periodos:', e?.response?.data || e.message);
    }
  };

  useEffect(() => {
    loadPeriodos(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  // ======== Guardar día (POST /api/periodos/dias) ========
  const handleSave = async () => {
    if (!selectedPeriodo || !selectedEmocion || !selectedDate) return;

    try {
      const flujoEnum = toFlujoEnum(selectedPeriodo);
      const animoEnum = toAnimoEnum(selectedEmocion);

      const { data } = await api.post('/periodos/dias', {
        fecha: selectedDate,
        flujo: flujoEnum,
        animo: animoEnum,
      });

      const diaId = data?.dia?.id;
      const periodoId = data?.periodoId;
      const color = PERIODO_COLOR[selectedPeriodo];

      if (!mountedRef.current) return;
      setMarkedDates((prev) => ({
        ...prev,
        [selectedDate]: {
          selected: true,
          selectedColor: color,
          periodo: selectedPeriodo,
          emociones: selectedEmocion,
          diaId,
          periodoId,
        },
      }));

      closeModal(); // limpiar ocurre en onModalHide
    } catch (e) {
      console.log('Error guardando día:', e?.response?.data || e.message);
    }
  };

  // ======== Eliminar día (DELETE /api/periodos/dias/:diaId) ========
  const handleDelete = async () => {
    try {
      const diaId = markedDates[selectedDate]?.diaId;

      if (diaId) {
        await api.delete(`/periodos/dias/${diaId}`);
      }

      if (!mountedRef.current) return;
      setMarkedDates((prev) => {
        const copy = { ...prev };
        delete copy[selectedDate];
        return copy;
      });

      closeModal(); // limpiar ocurre en onModalHide
    } catch (e) {
      console.log('Error eliminando día:', e?.response?.data || e.message);
    }
  };

  // ====== Mapear a "custom" + HOY rosa en negritas ======
  const computedMarked = useMemo(() => {
    const mapped = Object.fromEntries(
      Object.entries(markedDates).map(([k, v]) => {
        if (v?.selected) {
          const bg = v.selectedColor || PINK;
          return [
            k,
            {
              customStyles: {
                container: {
                  backgroundColor: bg,
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: CIRCLE / 2,
                  alignSelf: 'center',
                  justifyContent: 'center',
                },
                text: { color: '#FFFFFF', fontWeight: '700' },
              },
              periodo: v.periodo,
              emociones: v.emociones,
              diaId: v.diaId,
              periodoId: v.periodoId,
            },
          ];
        }
        return [k, v];
      })
    );

    // Estilo especial para HOY si no está marcado
    if (!mapped[todayKey] || !mapped[todayKey].customStyles) {
      mapped[todayKey] = {
        customStyles: {
          container: {},
          text: { color: PINK, fontWeight: '700' },
        },
      };
    } else {
      mapped[todayKey] = {
        ...mapped[todayKey],
        customStyles: {
          ...mapped[todayKey].customStyles,
          text: {
            ...(mapped[todayKey].customStyles?.text || {}),
            fontWeight: '700',
          },
        },
      };
    }

    return mapped;
  }, [markedDates, todayKey, CIRCLE]);

  // Círculo “presionado”: SOLO mientras el modal está abierto
  const finalMarked = useMemo(() => {
    const out = { ...computedMarked };

    if (selectedDate && isModalVisible) {
      const prev = out[selectedDate]?.customStyles || {};
      const existingBg = prev.container?.backgroundColor;
      const bg = existingBg || '#9E4942'; // color de “presionado” si no estaba marcado

      out[selectedDate] = {
        ...out[selectedDate],
        customStyles: {
          container: {
            ...(prev.container || {}),
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: CIRCLE / 2,
            alignSelf: 'center',
            justifyContent: 'center',
            backgroundColor: bg,
          },
          text: {
            ...(prev.text || {}),
            color: '#FFFFFF',
            fontWeight: '700',
          },
        },
      };
    }

    return out;
  }, [computedMarked, selectedDate, isModalVisible, CIRCLE]);

  return (
    <View style={{ flex: 1, backgroundColor: APP_BG }}>
      {/* Header igual que Home */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, hp('0.2%')),
            paddingBottom: hp('0.4%'),
          },
        ]}
      >
        <Text style={styles.title} accessibilityRole="header">
          Mi calendario
        </Text>
        <View style={styles.rightShim} />
      </View>

      {/* Calendario */}
      <View style={styles.calendarWrapper}>
        <View style={[styles.calendarFrame, isTablet && styles.calendarFrameTablet]}>
        <CalendarList
          current={todayKey}
          onDayPress={handleDayPress}
          onVisibleMonthsChange={(months) => {
            if (months?.[0]?.dateString) {
              setCurrentMonth(yyyymmFromDateKey(months[0].dateString));
            }
          }}
          markedDates={finalMarked}
          markingType="custom"
          pastScrollRange={12}
          futureScrollRange={12}
          scrollEnabled
          showScrollIndicator
          firstDay={0}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: TEXT,
            selectedDayBackgroundColor: PINK,
            selectedDayTextColor: '#ffffff',
            todayTextColor: PINK,
            dayTextColor: TEXT,
            textDisabledColor: '#d4aaa2',
            monthTextColor: PINK,
            arrowColor: PINK,
            textDayFontWeight: '400',
          }}
        />
</View>
        {/* Modal (sin native driver) */}
        <Modal
          isVisible={isModalVisible}
          onBackdropPress={closeModal}
          onBackButtonPress={closeModal}
          onModalHide={resetSelection}
          backdropOpacity={0.35}
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeIconContainer}
              onPress={closeModal}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Image source={require('../assets/close.png')} style={styles.closeIcon} />
            </TouchableOpacity>

            {/* Chip de fecha */}
            {selectedDate ? (
              <View style={styles.dateChip}>
                <Text style={styles.dateChipText}>{prettyDate(selectedDate)}</Text>
              </View>
            ) : null}

            {/* Periodo */}
            <Text style={styles.modalTitle} accessibilityRole="header">
              Periodo
            </Text>
            <Text style={styles.helperText}>Elige la intensidad de tu flujo hoy.</Text>
            <View style={styles.optionsRow}>
              {['Ligero', 'Moderado', 'Abundante'].map((tipo) => {
                const isActive = selectedPeriodo === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.optionButton,
                      isActive && styles.activeOption,
                      isActive && styles.activeShadow,
                    ]}
                    onPress={() => setSelectedPeriodo((prev) => (prev === tipo ? null : tipo))}
                    accessibilityRole="button"
                    accessibilityLabel={`Periodo ${tipo}`}
                  >
                    <Image source={periodoIcons[tipo]} style={styles.icon} />
                    <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Emociones */}
            <Text style={[styles.modalTitle, { marginTop: hp('2%') }]} accessibilityRole="header">
              Emociones
            </Text>
            <Text style={styles.helperText}>Selecciona cómo te sientes hoy.</Text>
            <View style={styles.optionsRow}>
              {['Feliz', 'Triste', 'Enojada'].map((tipo) => {
                const isActive = selectedEmocion === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.optionButton,
                      { borderColor: EMOCION_COLOR },
                      isActive && { backgroundColor: APP_BG, borderColor: EMOCION_COLOR },
                      isActive && styles.activeShadow,
                    ]}
                    onPress={() => setSelectedEmocion((prev) => (prev === tipo ? null : tipo))}
                    accessibilityRole="button"
                    accessibilityLabel={`Emoción ${tipo}`}
                  >
                    <Image source={emocionIcons[tipo]} style={styles.icon} />
                    <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Guardar */}
            <TouchableOpacity
              style={[styles.saveButton, { opacity: selectedPeriodo && selectedEmocion ? 1 : 0.5 }]}
              onPress={handleSave}
              disabled={!(selectedPeriodo && selectedEmocion)}
              accessibilityRole="button"
              accessibilityLabel="Guardar selección"
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>

            {/* Eliminar */}
            {selectedDate && markedDates[selectedDate] && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel="Eliminar día"
              >
                <Text style={styles.deleteButtonText}>Eliminar día</Text>
              </TouchableOpacity>
            )}
          </View>
        </Modal>
      </View>

      <FooterGeneral navigation={navigation} activeScreen="Calendar" />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: wp('1%'),
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: Math.max(wp('5.2%'), 20),
    color: TEXT,
    fontWeight: 'bold',
  },
  rightShim: {
    alignSelf: 'flex-end',
    width: wp('7%'),
    height: Math.max(wp('10%'), 20),
  },

  calendarWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: hp('1%'),
    paddingBottom: hp('12%'),
  },

  modal: { justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: '#ffffff',
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2%'),
    paddingBottom: hp('2%'),
    alignItems: 'center',
    width: '96%',
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  closeIconContainer: { position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 6 },
  closeIcon: { width: wp('6%'), height: wp('6%'), tintColor: PINK, resizeMode: 'contain' },

  dateChip: {
    alignSelf: 'center',
    paddingVertical: hp('0.6%'),
    paddingHorizontal: wp('3.5%'),
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: PINK,
    marginBottom: hp('1.2%'),
  },
  dateChipText: { color: PINK, fontSize: Math.max(wp('3.6%'), 12), fontWeight: '700' },

  modalTitle: {
    fontSize: Math.max(wp('5%'), 18),
    fontWeight: 'bold',
    color: TEXT,
    marginTop: hp('0.5%'),
  },
  helperText: {
    color: '#7A7A7A',
    fontSize: Math.max(wp('3.3%'), 12),
    marginBottom: hp('1.2%'),
    marginTop: hp('0.6%'),
    textAlign: 'center',
  },

  optionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp('3.5%'),
    marginBottom: hp('1.8%'),
  },
  optionButton: {
    flex: 1,
    marginHorizontal: wp('1.5%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('2%'),
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeOption: { backgroundColor: '#FDE1DE', borderColor: PINK },
  activeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  optionText: { color: '#000', fontSize: Math.max(wp('3%'), 12), marginTop: 6, textAlign: 'center' },
  optionTextActive: { color: '#000' },
  icon: { width: wp('9%'), height: wp('9%'), marginBottom: 4, resizeMode: 'contain' },

  saveButton: {
    marginTop: hp('1.6%'),
    padding: hp('1.2%'),
    backgroundColor: PINK,
    borderRadius: 12,
    alignItems: 'center',
    width: wp('48%'),
  },
  saveButtonText: { fontWeight: 'bold', color: '#FFFFFF', fontSize: Math.max(wp('4%'), 14) },

  deleteButton: {
    marginTop: hp('1.2%'),
    padding: hp('1.1%'),
    borderWidth: 2,
    borderColor: '#9E4942',
    borderRadius: 12,
    alignItems: 'center',
    width: wp('48%'),
  },
  deleteButtonText: { fontWeight: 'bold', color: '#9E4942', fontSize: Math.max(wp('4%'), 14) },
  calendarFrame: {
  flex: 1,
  alignSelf: 'center',
  width: '100%',
},

calendarFrameTablet: {
  maxWidth: 560, // puedes ajustar 520–620
},
});
