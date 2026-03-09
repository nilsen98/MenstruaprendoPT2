// components/quizzes/QuizModule3.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import api from '../../services/api';

const COLORS = {
  bg: "#FDE1DE",
  white: "#FFFFFF",
  text: "#4A4A4A",
  primary: "#E77C9D",
  border: "#F2B8C6",
};

const QUESTIONS = [
  {
    question: "¿Qué parte del cuerpo se encarga de proteger las partes internas y mantenerlas limpias?",
    options: ["La vagina", "La vulva", "El útero", "Los ovarios"],
    correct: 1,
  },
  {
    question: "¿Por qué es importante lavar la vulva regularmente?",
    options: [
      "Para eliminar completamente el flujo",
      "Para mantenerte limpia, fresca y evitar infecciones",
      "Para que no haya menstruación",
      "Para cambiar el color de la piel",
    ],
    correct: 1,
  },
  {
    question: "¿Cuál es la forma correcta de limpiar la zona íntima?",
    options: [
      "De atrás hacia adelante con jabón perfumado",
      "De adelante hacia atrás, solo con agua o jabón neutro",
      "Con toallitas perfumadas",
      "Solo durante la menstruación",
    ],
    correct: 1,
  },
  {
    question: "¿Qué producto menstrual es reutilizable y puede durar hasta 10 años si se cuida bien?",
    options: ["Toalla desechable", "Copa menstrual", "Tampón", "Disco menstrual"],
    correct: 1,
  },
  {
    question: "¿Qué puedes hacer para sentirte preparada durante tu periodo?",
    options: [
      "No salir de casa",
      "Llevar un pequeño kit menstrual con toallas sanitarias y ropa interior de repuesto",
      "No usar ningún producto menstrual",
      "Cambiarte cada 24 horas",
    ],
    correct: 1,
  },
];

export default function QuizModule6({ navigation }) {
  const moduloId = 6;
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);          // <- revela correctas cuando true
  const [showExitButton, setShowExitButton] = useState(false);

  // Guardia de salida
  const exitGuardEnabled = useRef(true);
  const isShowingExitAlert = useRef(false);

const saveScore = async (score, maxPoints) => {
  try {
    const puntuacion = score >= maxPoints ? 10 : 8;
    await api.post(`/modulos/${moduloId}/score`, { puntuacion });
  } catch (e) {
    console.log('Error guardando score:', e?.response?.status, e?.response?.data || e.message);
    const msg =
      e?.response?.data?.error ||
      `No se pudo guardar tu puntuación (HTTP ${e?.response?.status || '—'})`;
    Alert.alert('Error', msg);
    throw e;
  }
};


  useEffect(() => {
    navigation?.setOptions?.({ gestureEnabled: false });

    const confirmExit = async () => {
      if (isShowingExitAlert.current) return false;
      isShowingExitAlert.current = true;
      return new Promise((resolve) => {
        Alert.alert(
          "¿Salir del quiz?",
          "Si sales ahora, se borrará tu progreso en esta prueba.",
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => {
                isShowingExitAlert.current = false;
                resolve(false);
              },
            },
            {
              text: "Salir",
              style: "destructive",
              onPress: () => {
                isShowingExitAlert.current = false;
                resolve(true);
              },
            },
          ],
          { cancelable: true }
        );
      });
    };

    const unsubBeforeRemove = navigation.addListener("beforeRemove", async (e) => {
      if (!exitGuardEnabled.current) return;
      e.preventDefault();
      const ok = await confirmExit();
      if (ok) {
        exitGuardEnabled.current = false;
        navigation.dispatch(e.data.action);
      }
    });

    const backHW = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!exitGuardEnabled.current) return false;
      (async () => {
        const ok = await confirmExit();
        if (ok) {
          exitGuardEnabled.current = false;
          navigation.goBack();
        }
      })();
      return true;
    });

    return () => {
      unsubBeforeRemove?.();
      backHW.remove();
    };
  }, [navigation]);

  const handleSelect = (qIndex, optionIndex) => {
    if (passed) return; // si ya se envió, solo revisión
    const next = [...answers];
    next[qIndex] = optionIndex;
    setAnswers(next);
  };

  const handleSubmit = () => {
    // Calcula puntaje actual (2 puntos por acierto)
    const currentScore = answers.reduce(
      (acc, ans, i) => acc + (ans === QUESTIONS[i].correct ? 2 : 0),
      0
    );
    setScore(currentScore);

    if (currentScore >= 8) {
      // NO revelamos todavía. Pedimos decisión.
      Alert.alert(
        "¡Buen trabajo! ✨",
        currentScore === 10
          ? "Tienes 10/10 puntos."
          : "Tienes 8/10 puntos. ¿Quieres enviar tu quiz ahora o seguir practicando?",
        [
          {
            text: "Seguir practicando",
            onPress: () => {
              // Sigue sin revelar correctas, guardia activa
            },
          },
          {
            text: "Enviar quiz",
            onPress: async () => {
            const maxPoints = QUESTIONS.length * 2; // 10

    await saveScore(currentScore, maxPoints); // ✅ guarda 8 o 10 en backend

    setPassed(true);
    setShowExitButton(true);
    exitGuardEnabled.current = false;


              Alert.alert(
                "¡Bien hecho! 🎉",
                "Tu resultado se ha guardado. Puedes revisar tus respuestas o salir cuando quieras.",
                [{ text: "Entendido" }]
              );
            },
          },
        ]
      );
    } else {
      const faltan = 8 - currentScore;
      Alert.alert(
        "¡Casi! 💪",
        `Llevas ${currentScore}/10 puntos. Te faltan ${faltan} punto(s) para pasar. ¡Inténtalo de nuevo, tú puedes!`,
        [{ text: "Seguir practicando" }]
      );
    }
  };

 const handleExit = () => {
  exitGuardEnabled.current = false;
  navigation.navigate('Modules', { refresh: Date.now() });
};

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, hp("1%")) }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Módulo 6: ¿Qué hacer durante la menstruación? </Text>
        <Text style={styles.subtitle}>Selecciona la respuesta correcta ✨</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.bg }}
        contentContainerStyle={{ paddingBottom: hp("6%") }}
      >
        {QUESTIONS.map((q, qi) => (
          <View key={qi} style={styles.questionCard}>
            <Text style={styles.questionText}>{`${qi + 1}. ${q.question}`}</Text>

            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = q.correct === oi;

              let bg = COLORS.white;
              if (passed) {
                if (isCorrect) bg = "#E0F7E9";          // verde solo después de ENVIAR
                else if (selected && !isCorrect) bg = "#FFD9E3"; // rosa suave
              } else if (selected) {
                bg = "#FFE7F0"; // selección mientras responde
              }

              return (
                <TouchableOpacity
                  key={oi}
                  onPress={() => handleSelect(qi, oi)}
                  style={[styles.optionBtn, { backgroundColor: bg }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {showExitButton ? (
          <TouchableOpacity style={styles.exitBtn} onPress={handleExit} activeOpacity={0.9}>
            <Text style={styles.exitTxt}>Salir del quiz</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.9}>
            <Text style={styles.submitTxt}>Enviar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    width: "100%",
    paddingHorizontal: wp("5%"),
    paddingTop: hp("1.8%"),
    paddingBottom: hp("1.8%"),
    alignItems: "center",
  },
  title: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: Math.max(wp("5.2%"), 18),
  },
  subtitle: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: Math.max(wp("3.6%"), 12),
    marginTop: hp("0.3%"),
  },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginHorizontal: wp("5%"),
    marginVertical: hp("1%"),
    padding: wp("4%"),
    elevation: 2,
  },
  questionText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: Math.max(wp("4%"), 14),
    marginBottom: hp("1%"),
  },
  optionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: hp("1%"),
    paddingHorizontal: wp("3%"),
    marginVertical: hp("0.4%"),
  },
  optionText: {
    color: COLORS.text,
    fontSize: Math.max(wp("3.6%"), 12.5),
  },
  submitBtn: {
    alignSelf: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("20%"),
    marginVertical: hp("2%"),
  },
  submitTxt: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: Math.max(wp("4.2%"), 14),
  },
  exitBtn: {
    alignSelf: "center",
    backgroundColor: "#9E4942",
    borderRadius: 14,
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("20%"),
    marginVertical: hp("2%"),
  },
  exitTxt: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: Math.max(wp("4.2%"), 14),
  },
});
