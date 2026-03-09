// Register.js — versión conectada al backend real
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  Image,
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useForm, Controller } from 'react-hook-form';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import LogoSvg from '../assets/menstruAprendo.svg';


const COLORS = {
  bg: '#FFFFFF',
  header: '#FFBCC5',
  surface: '#FFFFFF',
  text: '#4A4A4A',
  primary: '#E77C9D',
  neutral: '#ADA8A8',
  link: '#E77C9D',
};

// --- Validaciones helpers (sin Zod) ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{2}\/(0[1-9]|1[0-2])\/\d{4}$/;

const isValidDDMMYYYY = (v) => {
  if (!DATE_REGEX.test(v)) return false;
  const [dd, mm, yyyy] = v.split('/');
  const d = parseInt(dd, 10);
  const mo = parseInt(mm, 10) - 1;
  const y = parseInt(yyyy, 10);
  const dt = new Date(y, mo, d);
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d;
};

// --- Helper: convertir fecha a formato ISO ---
function ddmmyyyyToISO(dateStr) {
  const [dd, mm, yyyy] = (dateStr || '').split('/');
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

export default function Register({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360 || height < 700;

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const headerHeight = isSmall ? hp('34%') : hp('48%');
  const logoSide = isSmall ? wp('50%') : wp('52%');
  //const cardLift = hp('1%');

  const { control, handleSubmit, formState, getValues } = useForm({
    mode: 'onChange',
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      date: '',
      password: '',
      confirmPassword: '',
    },
  });

  const isBlocked = formState.isSubmitting || !formState.isValid;

  const handleDateChange = (text, onChange) => {
    const digits = String(text || '').replace(/[^\d]/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length >= 5) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length >= 3) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChange(formatted);
  };

  const onValid = async () => {
    try {
      const { nombre, apellido, email, date, password } = getValues();
      const fechaIso = ddmmyyyyToISO(date);
      if (!fechaIso) {
        Alert.alert('Fecha inválida', 'Verifica el formato dd/mm/aaaa');
        return;
      }

      const payload = {
        email,
        password,
        nombre,
        apellido,
        fechaNacimiento: fechaIso,
      };

      const { data } = await api.post('/auth/register', payload);
      // data: { user, token }

      if (data?.token) {
        await AsyncStorage.setItem('token', data.token);
      }

      Alert.alert(
        'Registro exitoso',
        '¡Bienvenida! 🙂',
        [{ text: 'OK', onPress: () => navigation.navigate('Inicio') }],
        { cancelable: true }
      );
    } catch (err) {
      console.error('Register error:', err?.response?.data || err.message);
      const msg = err?.response?.data?.error || 'No pudimos completar el registro.';
      Alert.alert('Error', msg);
    }
  };

  const onInvalid = (errors) => {
    if (errors?.email) console.log('Email inválido');
    if (errors?.confirmPassword) console.log('Las contraseñas no coinciden');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="dark" backgroundColor={COLORS.header} />
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={hp('5%')}
        enableOnAndroid
      >
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: hp('12%') }}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                height: headerHeight,
                borderBottomLeftRadius: wp('17%'),
                borderBottomRightRadius: wp('17%'),
                paddingBottom: isSmall ? hp('4%') : hp('6%'),
              },
            ]}
          >
       <View style={[styles.logoWrap, { width: logoSide }]}>
                     <LogoSvg width="100%" height="100%" />
                   </View>

          </View>

          {/* Form Card */}
          <View style={[styles.formContainer, { marginTop: isSmall ? -hp('1%') : -hp('5%') }]}>
            <Text style={styles.title}>Regístrate</Text>

            {/* Nombre */}
            <Controller
              control={control}
              name="nombre"
              rules={{ required: true, minLength: 1 }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Nombre" value={value} onChangeText={onChange} />
              )}
            />

            {/* Apellido */}
            <Controller
              control={control}
              name="apellido"
              rules={{ required: true, minLength: 1 }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Apellido" value={value} onChangeText={onChange} />
              )}
            />

            {/* Email */}
            <Controller
              control={control}
              name="email"
              rules={{ required: true, pattern: EMAIL_REGEX }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />

            {/* Fecha */}
            <Controller
              control={control}
              name="date"
              rules={{
                required: true,
                validate: (v) => isValidDDMMYYYY(v),
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Fecha de nacimiento (dd/mm/aaaa)"
                  value={value}
                  onChangeText={(t) => handleDateChange(t, onChange)}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              )}
            />

            {/* Contraseña */}
            <Controller
              control={control}
              name="password"
              rules={{ required: true, minLength: 8, maxLength: 8 }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.inputRowText}
                    placeholder="Contraseña (8 caracteres)"
                    secureTextEntry={!showPwd}
                    value={value}
                    onChangeText={onChange}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((s) => !s)}>
                    <Text style={styles.showText}>{showPwd ? 'Ocultar' : 'Mostrar'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* Confirmar */}
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: true,
                minLength: 8,
                maxLength: 8,
                validate: (v) => v === getValues('password'),
              }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.inputRowText}
                    placeholder="Confirma tu contraseña"
                    secureTextEntry={!showPwd2}
                    value={value}
                    onChangeText={onChange}
                  />
                  <TouchableOpacity onPress={() => setShowPwd2((s) => !s)}>
                    <Text style={styles.showText}>{showPwd2 ? 'Ocultar' : 'Mostrar'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* Botón */}
            <TouchableOpacity
              style={[styles.button, isBlocked && styles.buttonDisabled]}
              onPress={handleSubmit(onValid, onInvalid)}
              disabled={isBlocked}
            >
              <Text style={styles.buttonText}>{formState.isSubmitting ? 'Creando…' : 'Regístrate'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        {!isKeyboardVisible && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, hp('1%')) }]}>
            <Text style={styles.finalText}>
              ¿Ya tienes cuenta?{' '}
              <Text style={styles.finalLink} onPress={() => navigation.navigate('Inicio')}>
                Inicia sesión.
              </Text>
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.header, width: '100%', alignItems: 'center', justifyContent: 'center' },
  formContainer: { backgroundColor: COLORS.surface, borderRadius: wp('3%'), padding: wp('5%'), width: wp('80%'), elevation: 4 },
  logoWrap: {
 aspectRatio: 1,
    borderRadius: wp('6%'),
    backgroundColor: '#FFF3F2',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
},
  title: { fontSize: Math.max(wp('5.5%'), 18), fontWeight: 'bold', marginBottom: hp('1.5%'), color: COLORS.text },
  input: { fontSize: 16, height: 44, borderBottomColor: COLORS.neutral, borderBottomWidth: 1, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomColor: COLORS.neutral, borderBottomWidth: 1, marginBottom: 12 },
  inputRowText: { flex: 1, fontSize: 16, height: 44 },
  showText: { fontSize: 14, color: COLORS.neutral, marginLeft: 8 },
  button: { backgroundColor: COLORS.primary, borderRadius: 25, height: 48, justifyContent: 'center', alignItems: 'center', width: wp('50%'), alignSelf: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: Math.max(wp('4%'), 14), fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: hp('5%'), width: '100%', alignItems: 'center' },
  finalText: { color: COLORS.text, fontSize: Math.max(wp('3.9%'), 13) },
  finalLink: { color: COLORS.link, textDecorationLine: 'underline', fontWeight: 'bold' },
});
