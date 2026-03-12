import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Pdf from 'react-native-pdf';
import FooterGeneral from './FooterGeneral';

const COLORS = {
  bg: '#FDE1DE',
  white: '#FFFFFF',
  text: '#4A4A4A',
  primary: '#E77C9D',
  border: '#F2B8C6',
};

export const MODULES = {
  1: { title: 'Preadolescencia', level: 'Nivel principiante', pdf: require('../assets/pdfs/mod1.pdf') },
  2: { title: 'Cambios en la menstruación', level: 'Nivel cambios', pdf: require('../assets/pdfs/mod2.pdf') },
  3: { title: 'Ciclo menstrual', level: 'Nivel conoces tu ciclo', pdf: require('../assets/pdfs/mod3.pdf') },
  4: { title: 'Síntomas en la menstruación', level: 'Nivel te preocupas por tu ciclo', pdf: require('../assets/pdfs/mod4.pdf') },
  5: { title: 'Alimentación y ejercicio', level: 'Nivel vas más allá', pdf: require('../assets/pdfs/mod5.pdf') },
  6: { title: 'Qué hacer durante la menstruación', level: 'Nivel es hora de actuar', pdf: require('../assets/pdfs/mod6.pdf') },
  7: { title: 'Seguimiento del periodo', level: 'Nivel consciencia', pdf: require('../assets/pdfs/mod7.pdf') },
  8: { title: 'Mitos y realidades', level: 'Nivel ya nada te para', pdf: require('../assets/pdfs/mod8.pdf') },
};

export default function ModuleDetail({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const moduleId = route?.params?.moduleId ?? 1;

  const meta = useMemo(
    () => MODULES[moduleId] ?? { title: 'Módulo', level: '', pdf: null },
    [moduleId]
  );

  const pdfSource = useMemo(() => {
    if (!meta.pdf) return null;

    const resolved = Image.resolveAssetSource(meta.pdf);
    if (!resolved?.uri) return null;

    return { uri: resolved.uri, cache: true };
  }, [meta.pdf]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, hp('7%')),
            paddingBottom: hp('3%'),
          },
        ]}
      >
        <Text style={styles.topTitle}>{meta.title}</Text>
        {meta.level ? <Text style={styles.topSubtitle}>{meta.level}</Text> : null}
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          {pdfSource ? (
            <Pdf
              source={pdfSource}
              style={styles.pdf}
              onLoadComplete={(pages) => console.log(`PDF cargado: ${pages} páginas`)}
              onError={(error) => console.warn('Error PDF:', error)}
              enablePaging={false}
              trustAllCerts={false}
              spacing={4}
              renderActivityIndicator={(progress) => (
                <Text style={styles.loadingText}>
                  Cargando… {Math.round((progress || 0) * 100)}%
                </Text>
              )}
            />
          ) : (
            <Text style={styles.loadingText}>No se pudo cargar el PDF.</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.quizBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate(`QuizModule${moduleId}`)}
        >
          <Text style={styles.quizBtnText}>Realizar quiz del módulo</Text>
        </TouchableOpacity>
      </View>

      <FooterGeneral navigation={navigation} activeScreen="Módulos" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { width: '100%', paddingHorizontal: wp('5%'), paddingBottom: hp('1.8%') },
  topTitle: {
    textAlign: 'center',
    color: COLORS.text,
    fontWeight: '800',
    fontSize: Math.max(wp('5.6%'), 20),
  },
  topSubtitle: {
    textAlign: 'center',
    color: COLORS.text,
    opacity: 0.85,
    marginTop: hp('0.2%'),
    fontSize: Math.max(wp('3.6%'), 13),
  },
  container: {
    flex: 1,
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1%'),
    paddingBottom: hp('10%'),
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: wp('3.5%'),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: wp('3%'),
    marginBottom: hp('2%'),
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  pdf: { flex: 1, width: '100%', borderRadius: wp('2%') },
  loadingText: {
    textAlign: 'center',
    color: COLORS.text,
    fontWeight: '600',
    paddingVertical: hp('1%'),
  },
  quizBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: hp('1.4%'),
    alignItems: 'center',
  },
  quizBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: Math.max(wp('4.4%'), 15),
  },
});