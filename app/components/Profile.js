// components/Profile.js
import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import * as ImagePicker from 'expo-image-picker';
import FooterGeneral from './FooterGeneral';
import api from '../services/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const COLORS = {
  bg: '#FDE1DE',
  text: '#4A4A4A',
  primary: '#E77C9D',
  neutral: '#ADA8A8',
  white: '#FFFFFF',
  cardBorder: '#FFD9E3',
};

const validateEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function Profile({ navigation }) {
  const insets = useSafeAreaInsets();

  // ======== Estado real del perfil (desde backend) ========
  const [perfil, setPerfil] = useState({
    nombre: '',
    apellido: '',
    email: '',
    fechaNacimiento: '',
    tutorNombre: '',
    tutorCorreo: '',
  });

  // Tutor editable
  const [tutorNombre, setTutorNombre] = useState('');
  const [tutorCorreo, setTutorCorreo] = useState('');
  const [editTutor, setEditTutor] = useState(false);

  // Password
  const [changePassword, setChangePassword] = useState(false);
  const [actualPasswordInput, setActualPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const [photoUri, setPhotoUri] = useState(null);

  const [showActual, setShowActual] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

  // ======== Cargar perfil al entrar ========
  const loadPerfil = async () => {
    try {
      const { data } = await api.get('/usuarias/me');

      const fecha = data.fechaNacimiento
        ? new Date(data.fechaNacimiento).toISOString().slice(0, 10)
        : '';

      const tutorN = data.tutor?.nombre || '';
      const tutorC = data.tutor?.correo || '';

      setPerfil({
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        email: data.email || '',
        fechaNacimiento: fecha,
        tutorNombre: tutorN,
        tutorCorreo: tutorC,
      });

      // sincroniza inputs del tutor
      setTutorNombre(tutorN);
      setTutorCorreo(tutorC);
    } catch (e) {
      console.log('Error cargando perfil:', e?.response?.data || e.message);
      Alert.alert('Error', 'No se pudo cargar tu perfil.');
    }
  };

  useEffect(() => {
    loadPerfil();
  }, []);

  // ======== Validaciones password (MOCK) ========
  const isNewPwdLenOK = newPassword.length === 8;
  const isRepeatPwdLenOK = repeatPassword.length === 8;
  const isPwdMatch = newPassword === repeatPassword;

  const isPasswordReady =
    changePassword &&
    isNewPwdLenOK &&
    isRepeatPwdLenOK &&
    isPwdMatch &&
    actualPasswordInput.length === 8;

  const tutorChanged = useMemo(
    () => tutorNombre !== perfil.tutorNombre || tutorCorreo !== perfil.tutorCorreo,
    [tutorNombre, tutorCorreo, perfil.tutorNombre, perfil.tutorCorreo]
  );

  const isTutorValid =
    editTutor &&
    tutorChanged &&
    tutorNombre.trim().length > 0 &&
    validateEmail(tutorCorreo);

  // ======== Guardar tutor (PATCH /usuarias/me) ========
 // ======== Guardar tutor (PATCH /usuarias/me) ========
const handleSaveTutor = async () => {
  if (!isTutorValid) {
    Alert.alert('Revisa tus datos', 'El nombre del tutor no puede estar vacío y el correo debe ser válido.');
    return;
  }

  try {
    await api.patch('/usuarias/me', {
      tutor: {
        nombre: tutorNombre.trim(),
        correo: tutorCorreo.trim().toLowerCase(),
      }
    });

    Alert.alert('Listo', 'Tutor guardado correctamente.');
    setEditTutor(false);

    // recarga perfil para reflejar datos reales
    await loadPerfil();
  } catch (e) {
    const msg = e?.response?.data?.error || 'No se pudo guardar el tutor.';
    Alert.alert('Error', msg);
    console.log('Guardar tutor error:', e?.response?.data || e.message);
  }
};


  const handleCancelTutor = () => {
    setEditTutor(false);
    setTutorNombre(perfil.tutorNombre);
    setTutorCorreo(perfil.tutorCorreo);
  };

  // ======== Guardar contraseña (conectado a back) ========
 // ======== Guardar contraseña (conectado al backend) ========
const handleSavePassword = async () => {
  if (!isPasswordReady) {
    let msg = 'Verifica tu contraseña:';
    const issues = [];
    if (!isNewPwdLenOK) issues.push('• La nueva contraseña debe tener 8 caracteres');
    if (!isRepeatPwdLenOK) issues.push('• La confirmación debe tener 8 caracteres');
    if (!isPwdMatch) issues.push('• La nueva y la confirmación no coinciden');
    if (actualPasswordInput.length !== 8) issues.push('• La contraseña actual debe tener 8 caracteres');
    if (issues.length) msg += '\n' + issues.join('\n');
    Alert.alert('No se pudo guardar', msg);
    return;
  }

  try {
    // ✅ OJO: este endpoint debe existir en tu backend (cambio de contraseña autenticado)
    await api.patch('/usuarias/change-password', {
      currentPassword: actualPasswordInput,
      newPassword: newPassword,
    });

    Alert.alert('Listo', 'Contraseña actualizada correctamente.');

    setChangePassword(false);
    setActualPasswordInput('');
    setNewPassword('');
    setRepeatPassword('');
    setShowActual(false);
    setShowNew(false);
    setShowRepeat(false);
  } catch (e) {
    const msg = e?.response?.data?.error || 'No se pudo actualizar la contraseña.';
    Alert.alert('Error', msg);
    console.log('Change password error:', e?.response?.data || e.message);
  }
};


  const handleCancelPwd = () => {
    setChangePassword(false);
    setActualPasswordInput('');
    setNewPassword('');
    setRepeatPassword('');
    setShowActual(false);
    setShowNew(false);
    setShowRepeat(false);
  };

  // ======== Foto local (solo UI) ========
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para actualizar tu imagen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      Alert.alert('Listo', 'Tu foto se actualizó.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View
        style={[
          styles.topBar,
          { paddingTop: Math.max(insets.top, hp('0.5%')), paddingBottom: hp('1.8%') },
        ]}
      >
        <Text style={styles.topTitle}>Tu perfil</Text>
      </View>

      <KeyboardAwareScrollView
       style={{ flex: 1, backgroundColor: COLORS.bg }}
  contentContainerStyle={{ paddingBottom: hp('12%') }}
  keyboardShouldPersistTaps="handled"
  enableOnAndroid
  extraScrollHeight={hp('6%')}
  showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={styles.avatarBtn}>
            <Image
              source={photoUri ? { uri: photoUri } : require('../assets/menstruAprendo.png')}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.changePhotoRow}>
              <Text style={styles.cameraEmoji}>📷</Text>
              <Text style={styles.changePhotoText}>Cambiar foto</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Información del perfil */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Información del perfil</Text>

          <View style={styles.card}>
            <InfoRow label="Nombre" value={perfil.nombre || '-'} />
            <InfoRow label="Apellido" value={perfil.apellido || '-'} />
            <InfoRow label="Correo electrónico" value={perfil.email || '-'} />
            <InfoRow label="Fecha de nacimiento" value={perfil.fechaNacimiento || '-'} />

            <View style={[styles.rowBetween, { marginTop: hp('1%') }]}>
              <Text style={styles.label}>Contraseña</Text>
              {!changePassword ? (
                <>
                  <Text style={styles.valueRight}>*******</Text>
                  <TouchableOpacity onPress={() => setChangePassword(true)} style={styles.smallAction}>
                    <Text style={styles.smallActionText}>Cambiar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ width: '100%', marginTop: hp('0.6%') }}>
                  {/* Actual */}
                  <View style={styles.inputLineRow}>
                    <TextInput
                      placeholder="Contraseña actual"
                      placeholderTextColor={COLORS.neutral}
                      secureTextEntry={!showActual}
                      style={styles.inputInline}
                      value={actualPasswordInput}
                      onChangeText={setActualPasswordInput}
                      maxLength={8}
                    />
                    <TouchableOpacity onPress={() => setShowActual(s => !s)}>
                      <Text style={styles.toggleText}>{showActual ? 'Ocultar' : 'Mostrar'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Nueva */}
                  <View style={styles.inputLineRow}>
                    <TextInput
                      placeholder="Nueva contraseña (8 caracteres)"
                      placeholderTextColor={COLORS.neutral}
                      secureTextEntry={!showNew}
                      style={styles.inputInline}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      maxLength={8}
                    />
                    <TouchableOpacity onPress={() => setShowNew(s => !s)}>
                      <Text style={styles.toggleText}>{showNew ? 'Ocultar' : 'Mostrar'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Repetir */}
                  <View style={[styles.inputLineRow, styles.lastNoDivider]}>
                    <TextInput
                      placeholder="Repite contraseña (8 caracteres)"
                      placeholderTextColor={COLORS.neutral}
                      secureTextEntry={!showRepeat}
                      style={styles.inputInline}
                      value={repeatPassword}
                      onChangeText={setRepeatPassword}
                      maxLength={8}
                    />
                    <TouchableOpacity onPress={() => setShowRepeat(s => !s)}>
                      <Text style={styles.toggleText}>{showRepeat ? 'Ocultar' : 'Mostrar'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Botones */}
                  <View style={styles.actionsRowEnd}>
                    <TouchableOpacity onPress={handleCancelPwd} style={styles.linkBtn}>
                      <Text style={styles.linkBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSavePassword}
                      style={[styles.saveMiniBtn, { opacity: isPasswordReady ? 1 : 0.5 }]}
                      disabled={!isPasswordReady}
                    >
                      <Text style={styles.saveMiniBtnText}>Guardar contraseña</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Tutor */}
          <Text style={[styles.sectionTitle, { marginTop: hp('2.2%') }]}>Datos del tutor</Text>
          <View style={styles.card}>
            {!editTutor ? (
              <>
                <InfoRow label="Nombre del tutor" value={perfil.tutorNombre || 'No registrado'} />
                <InfoRow label="Correo del tutor" value={perfil.tutorCorreo || 'No registrado'} isLast />
                <TouchableOpacity onPress={() => setEditTutor(true)} style={styles.smallAction}>
                  <Text style={styles.smallActionText}>Editar tutor</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ width: '100%' }}>
                <TextInput
                  placeholder="Nombre del tutor"
                  placeholderTextColor={COLORS.neutral}
                  style={styles.inputUnderline}
                  value={tutorNombre}
                  onChangeText={setTutorNombre}
                />
                <TextInput
                  placeholder="Correo del tutor"
                  placeholderTextColor={COLORS.neutral}
                  style={styles.inputUnderline}
                  value={tutorCorreo}
                  onChangeText={setTutorCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.actionsRowEnd}>
                  <TouchableOpacity onPress={handleCancelTutor} style={styles.linkBtn}>
                    <Text style={styles.linkBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveTutor}
                    style={[styles.saveMiniBtn, { opacity: isTutorValid ? 1 : 0.5 }]}
                    disabled={!isTutorValid}
                  >
                    <Text style={styles.saveMiniBtnText}>Guardar tutor</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
</KeyboardAwareScrollView>

      <FooterGeneral navigation={navigation} activeScreen="Perfil" />
    </SafeAreaView>
  );
}

function InfoRow({ label, value, isLast }) {
  return (
    <View
      style={[
        styles.rowBetween,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ADA8A8' },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valueRight}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    width: '100%',
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp('5%'),
  },
  topTitle: {
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: Math.max(wp('5.6%'), 20),
  },
  avatarWrap: { alignItems: 'center', marginTop: hp('2%'), marginBottom: hp('1%') },
  avatarBtn: { alignItems: 'center' },
  avatar: {
    width: Math.max(wp('36%'), 140),
    height: Math.max(wp('36%'), 140),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  changePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp('0.8%'),
  },
  cameraEmoji: {
    fontSize: Math.max(wp('4.6%'), 18),
    marginRight: wp('1.5%'),
  },
  changePhotoText: {
    color: COLORS.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
    fontSize: Math.max(wp('3.6%'), 13),
  },
  sectionWrap: { paddingHorizontal: wp('6%'), paddingTop: hp('1%') },
  sectionTitle: {
    fontSize: Math.max(wp('5%'), 18),
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: hp('1%'),
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: wp('3.5%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    elevation: 2,
    marginBottom: hp('1.2%'),
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp('1%'),
  },
  label: {
    flex: 1,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: Math.max(wp('3.9%'), 14),
  },
  valueRight: {
    flex: 1.2,
    textAlign: 'right',
    color: COLORS.text,
    fontSize: Math.max(wp('3.9%'), 14),
  },
  inputUnderline: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.neutral,
    fontSize: Math.max(wp('3.9%'), 14),
    color: COLORS.text,
    paddingVertical: hp('1%'),
    marginBottom: hp('1%'),
  },
  inputLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.neutral,
    paddingVertical: hp('0.8%'),
  },
  inputInline: {
    flex: 1,
    fontSize: Math.max(wp('3.9%'), 14),
    color: COLORS.text,
    paddingVertical: hp('0.4%'),
  },
  toggleText: {
    color: COLORS.neutral,
    fontSize: Math.max(wp('3.6%'), 13),
    marginLeft: wp('2%'),
    paddingVertical: hp('0.6%'),
  },
  lastNoDivider: { borderBottomWidth: 0 },
  smallAction: {
    backgroundColor: '#E7E7EF',
    paddingVertical: hp('0.7%'),
    paddingHorizontal: wp('4.5%'),
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  smallActionText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: Math.max(wp('3.6%'), 13),
  },
  linkBtn: { paddingVertical: hp('0.4%') },
  linkBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
    fontSize: Math.max(wp('3.4%'), 12),
  },
  actionsRowEnd: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: wp('3%'),
    marginTop: hp('0.6%'),
  },
  saveMiniBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp('0.9%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 10,
  },
  saveMiniBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: Math.max(wp('3.6%'), 13),
  },
});
