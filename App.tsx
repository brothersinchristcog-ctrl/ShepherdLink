import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from './src/context/AppContext';
import { TabBar } from './src/components/TabBar';
import { SplashScreenView } from './src/components/SplashScreenView';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { DirectoryScreen } from './src/screens/DirectoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { PrayerScreen } from './src/screens/PrayerScreen';
import { CreateEventScreen } from './src/screens/CreateEventScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { DonateScreen } from './src/screens/DonateScreen';
import { COLORS } from './src/constants/theme';
// Initialize Firebase
import './src/config/firebase';

// Instruct native splash screen to stay visible until app is ready
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignore error in environments where splash is not available */
});

const MainNavigator: React.FC = () => {
  const { currentScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen />;
      case 'home':
        return <HomeScreen />;
      case 'directory':
        return <DirectoryScreen />;
      case 'pastor-detail':
      case 'profile':
        return <ProfileScreen />;
      case 'events':
        return <EventsScreen />;
      case 'prayer':
        return <PrayerScreen />;
      case 'create':
        return <CreateEventScreen />;
      case 'attendance':
        return <AttendanceScreen />;
      case 'donate':
        return <DonateScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.ground} />

      {/* Active Screen View */}
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Bottom Navigation Tabs */}
      <TabBar />
    </SafeAreaView>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the native OS splash screen once the React Native JS bundle has mounted
    SplashScreen.hideAsync().catch(() => {
      /* Safe fallback */
    });
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainNavigator />
        {showSplash && <SplashScreenView onFinish={handleSplashFinish} />}
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
});
