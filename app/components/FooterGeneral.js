// components/FooterGeneral.js
import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const icons = {
  home: require('../assets/home.png'),
  calendario: require('../assets/calendario.png'),
  modulos: require('../assets/modulos.png'),
  logros: require('../assets/logros.png'),
};

export default function FooterGeneral() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const current = route?.name;

  const tabs = useMemo(
    () => ([
      { name: 'Home',        label: 'Inicio',     icon: icons.home },
      { name: 'Calendar',    label: 'Calendario', icon: icons.calendario },
      { name: 'Modules',     label: 'Módulos',    icon: icons.modulos },
      { name: 'Achievements',label: 'Logros',     icon: icons.logros },
    ]),
    []
  );

  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, hp('1.5%')) }]}>
      {tabs.map((item) => {
        const isActive = current === item.name;

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.iconButton}
   onPress={() => {
  // si ya estás en esa pantalla, solo fuerza refresh
  if (current === item.name) {
    navigation.setParams({ refresh: Date.now() });
    return;
  }

  // en stack: mejor reemplazar para no acumular pantallas
  navigation.dispatch(
    StackActions.replace(item.name, { refresh: Date.now() })
  );
}}

            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            <Image
              source={item.icon}
              style={[styles.icon, { tintColor: isActive ? '#E77C9D' : '#4A4A4A' }]}
            />
            <Text style={[styles.iconText, { color: isActive ? '#E77C9D' : '#4A4A4A' }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',

    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

    paddingVertical: hp('0.5%'),
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 0.5,
    borderTopColor: '#ADA8A8',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: wp('6.8%'),
    height: wp('6.8%'),
    marginBottom: hp('0.2%'),
    resizeMode: 'contain',
  },
  iconText: {
    fontSize: Math.max(wp('3%'), 11),
    color: '#4A4A4A',
  },
});
