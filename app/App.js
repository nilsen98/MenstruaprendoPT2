import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import api from './services/api';
import 'react-native-gesture-handler';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { LogBox } from 'react-native';
// SVG
import LogoSvg from './assets/menstruAprendo.svg';

// Screens
import GoalPass from './components/GoalPass';
import Register from './components/Register';
import Home from './components/Home';
import Profile from './components/Profile';
import Modules from './components/Modules';
import Calendar from './components/Calendar';
import Achievements from './components/Achievements';
import ModuleDetail from './components/ModuleDetail';

// Quizzes
import QuizModule1 from './components/quizzes/QuizModule1';
import QuizModule2 from './components/quizzes/QuizModule2';
import QuizModule3 from './components/quizzes/QuizModule3';
import QuizModule4 from './components/quizzes/QuizModule4';
import QuizModule5 from './components/quizzes/QuizModule5';
import QuizModule6 from './components/quizzes/QuizModule6';
import QuizModule7 from './components/quizzes/QuizModule7';
import QuizModule8 from './components/quizzes/QuizModule8';

const Stack = createStackNavigator();

LogBox.ignoreLogs([
  'TypeError: Network request failed',
  'Network request failed',
]);

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Inicio">
        <Stack.Screen name="Inicio" component={Inicio} />
        <Stack.Screen name="GoalPass" component={GoalPass} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="Calendar" component={Calendar} />
        <Stack.Screen name="Achievements" component={Achievements} />
        <Stack.Screen name="Modules" component={Modules} />
        <Stack.Screen name="ModuleDetail" component={ModuleDetail} />
        <Stack.Screen name="QuizModule1" component={QuizModule1} />
        <Stack.Screen name="QuizModule2" component={QuizModule2} />
        <Stack.Screen name="QuizModule3" component={QuizModule3} />
        <Stack.Screen name="QuizModule4" component={QuizModule4} />
        <Stack.Screen name="QuizModule5" component={QuizModule5} />
        <Stack.Screen name="QuizModule6" component={QuizModule6} />
        <Stack.Screen name="QuizModule7" component={QuizModule7} />
        <Stack.Screen name="QuizModule8" component={QuizModule8} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function Inicio({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360 || height < 700;

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
  //const cardLift = hp('%');

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Faltan datos', 'Ingresa correo y contraseña');
    return;
  }

  if (password.length !== 8) {
    Alert.alert('Contraseña inválida', 'Debe tener 8 caracteres');
    return;
  }

  try {
    setLoading(true);

    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    if (data?.token) {
      await AsyncStorage.setItem('token', data.token);
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });

  } catch (err) {
    Alert.alert('Error', 'Correo o contraseña incorrectos');
  } finally {
    setLoading(false);
  }
};
 

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
      <StatusBar style="dark" backgroundColor="#FFBCC5" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: insets.top, android: 0 })}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: hp('12%') }}
        >
          {/* HEADER */}
          <View
            style={[
              styles.header,
              {
                height: headerHeight,
                borderBottomLeftRadius: wp('17%'),
                borderBottomRightRadius: wp('17%'),
                paddingBottom: isSmall ? hp('5%') : hp('7%'),
              },
            ]}
          >
            <View style={[styles.logoWrap, { width: logoSide }]}>
              <LogoSvg width="100%" height="100%" />
            </View>
          </View>

          {/* LOGIN CARD */}
          <View style={[styles.formContainer, { marginTop: isSmall ? -hp('1%') : -hp('5%') },]}>
            <Text style={styles.login}>Iniciar Sesión</Text>

            <View style={styles.inputRow}>
              <Image source={require('./assets/user.png')} style={styles.icon} />
              <TextInput
                style={styles.inputRowText}
                placeholder="Correo electrónico"
                placeholderTextColor="#ADA8A8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputRow}>
              <Image source={require('./assets/pass.png')} style={styles.icon} />
              <TextInput
                style={styles.inputRowText}
                placeholder="Contraseña"
                placeholderTextColor="#ADA8A8"
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                <Text style={styles.showText}>{showPwd ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('GoalPass')}>
              <Text style={styles.pass}>¿Se te olvidó la contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {!isKeyboardVisible && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, hp('2%')) }]}>
            <Text style={styles.finalText}>
              ¿No tienes cuenta?{' '}
              <Text style={styles.finalLink} onPress={() => navigation.navigate('Register')}>
                Regístrate.
              </Text>
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    backgroundColor: '#FFBCC5',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
    borderRadius: wp('2%'),
    padding: wp('5%'),
    width: wp('80%'),
    elevation: 4,
  },

  login: {
    fontSize: Math.max(wp('5.5%'), 18),
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: hp('1.3%'),
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ADA8A8',
    marginBottom: hp('1.5%'),
  },

  icon: { width: wp('6%'), height: wp('6%'), marginHorizontal: wp('2%') },

  inputRowText: {
    flex: 1,
    fontSize: Math.max(wp('4%'), 14),
    height: Math.max(hp('5%'), 44),
    color: '#4A4A4A',
  },

  showText: {
    fontSize: Math.max(wp('3.7%'), 13),
    color: '#ADA8A8',
  },

  pass: {
    fontSize: Math.max(wp('3.5%'), 12),
    textDecorationLine: 'underline',
    color: '#4A4A4A',
    marginBottom: hp('1.7%'),
  },

  button: {
    backgroundColor: '#E77C9D',
    borderRadius: wp('6%'),
    height: Math.max(hp('5.5%'), 48),
    justifyContent: 'center',
    alignItems: 'center',
    width: wp('50%'),
    alignSelf: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: Math.max(wp('4%'), 14),
  },

  footer: {
    position: 'absolute',
    bottom: hp('3%'),
    width: '100%',
    alignItems: 'center',
  },

  finalText: {
    color: '#4A4A4A',
    fontSize: Math.max(wp('3.9%'), 13),
  },

  finalLink: {
    color: '#E77C9D',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});
