// GoalPass.js
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Keyboard, Platform, Alert, ScrollView, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import api from '../services/api';
import { useForm, Controller } from 'react-hook-form';
import LogoSvg from '../assets/menstruAprendo.svg';

const COLORS = {
  bg: '#FFFFFF',
  header: '#FFBCC5',
  text: '#4A4A4A',
  primary: '#E77C9D',
  neutral: '#ADA8A8',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GoalPass({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360 || height < 700;

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const headerHeight = isSmall ? hp('34%') : hp('48%');
  const logoSide = isSmall ? wp('50%') : wp('52%');
  //const cardLift = hp('1%');

  const { control, handleSubmit, formState } = useForm({
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const isBlocked = formState.isSubmitting || !formState.isValid;

  const handlePass = async ({ email }) => {
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: email.toLowerCase().trim(),
      });

      let msg =
        'Si el correo existe en nuestra base, te enviaremos un código para restablecer tu contraseña.';

      Alert.alert(
        'Revisa tu correo',
        msg,
        [{ text: 'OK'}],
        { cancelable: true }
      );
    } catch (err) {
      console.error('Forgot password error:', err?.response?.data || err.message);
      const msg = err?.response?.data?.error || 'No pudimos procesar la solicitud. Intenta de nuevo.';
      Alert.alert('Error', msg);
    }
  };

  const handleInvalid = (errors) => {
    if (errors?.email) console.log('Email inválido');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: insets.top, android: 0 })}
      >
        <StatusBar style="dark" backgroundColor={COLORS.header} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: hp('12%') }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header rosado con logo */}
          <View
            style={[
              styles.header,
              {
                height: headerHeight,
                borderBottomLeftRadius: wp('17%'),
                borderBottomRightRadius: wp('17%'),
                paddingBottom: isSmall ? hp('4%') : hp('6%'), // ✅
                zIndex: 1,
              },
            ]}
          >
            {/* ✅ Logo cuadrado y con tamaño controlado */}
            <View style={[styles.logoWrap, { width: logoSide }]}>
              <LogoSvg width="100%" height="100%" />
            </View>
          </View>

          {/* Card flotante */}
          <View
            style={[
              styles.formContainer, 
             {
      marginTop: isSmall ? -hp('1%') : -hp('5%'), // ✅ igual que Inicio
      zIndex: 2,
      alignSelf: 'center',
    },
            ]}
          >
            <Text style={styles.goalPass}>Recupera tu contraseña</Text>

            {/* Email */}
            <Controller
              control={control}
              name="email"
              rules={{ required: true, pattern: EMAIL_REGEX }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa tu correo electrónico"
                  value={value}
                  onChangeText={(t) => onChange(t.trim())}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholderTextColor={COLORS.neutral}
                  textContentType="emailAddress"
                  returnKeyType="done"
                />
              )}
            />

            {/* Botón Enviar */}
            <TouchableOpacity
              style={[styles.button, isBlocked && styles.buttonDisabled]}
              onPress={handleSubmit(handlePass, handleInvalid)}
              disabled={isBlocked}
            >
              <Text style={styles.buttonText}>
                {formState.isSubmitting ? 'Enviando…' : 'Enviar'}
              </Text>
            </TouchableOpacity>

            {/* Volver a inicio (si no hay teclado) */}
            {!isKeyboardVisible && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Inicio')}
                style={{ marginTop: hp('2%'), alignSelf: 'center' }}
              >
                <Text style={{ color: COLORS.text, textDecorationLine: 'underline' }}>
                  Volver a iniciar sesión
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    backgroundColor: COLORS.header,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ✅ Logo consistente con login/register
  logoWrap: {
    aspectRatio: 1,
    borderRadius: wp('6%'),
    backgroundColor: '#FFF3F2',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  formContainer: {
    backgroundColor: '#fff',
    borderRadius: wp('3%'),
    padding: wp('5%'),
    width: wp('80%'),
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  goalPass: {
    fontSize: Math.max(wp('5.5%'), 18),
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: hp('1.5%'),
    textAlign: 'left',
  },

  input: {
    height: Math.max(hp('5.5%'), 44),
    width: '100%',
    borderBottomColor: COLORS.neutral,
    borderBottomWidth: 1,
    marginBottom: hp('2.2%'),
    paddingHorizontal: wp('2%'),
    fontSize: Math.max(wp('3.9%'), 13),
    color: COLORS.text,
  },

  button: {
    backgroundColor: COLORS.primary,
    borderRadius: wp('6%'),
    height: Math.max(hp('5.5%'), 48),
    justifyContent: 'center',
    alignItems: 'center',
    width: wp('50%'),
    alignSelf: 'center',
    marginTop: hp('1%'),
  },
  buttonDisabled: { opacity: 0.6 },

  buttonText: {
    color: '#fff',
    fontSize: Math.max(wp('4%'), 14),
    fontWeight: 'bold',
  },
});
