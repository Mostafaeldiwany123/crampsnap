import React, { useRef, useState, useEffect } from 'react';
import { withLayoutContext } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import {
  View,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { Images, User } from 'phosphor-react-native';
import { getNotes, DEFAULT_NOTES } from '@/services/notes';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  any,
  any
>(Navigator);

function CustomConcentricTabBar({ state, descriptors, navigation }: any) {
  const currentRouteName = state.routes[state.index]?.name;
  const isCameraActive = currentRouteName === 'index' || currentRouteName === 'scan';
  const shutterAnim = useRef(new Animated.Value(1)).current;
  const [latestPhotoUri, setLatestPhotoUri] = useState<string | null>(null);

  const fetchLatestPhoto = async () => {
    try {
      const notes = await getNotes();
      const withImage = (notes && notes.length > 0 ? notes : DEFAULT_NOTES).find((n) => !!n.image_url);
      if (withImage?.image_url) {
        setLatestPhotoUri(withImage.image_url);
      }
    } catch (e) {
      if (DEFAULT_NOTES[0]?.image_url) {
        setLatestPhotoUri(DEFAULT_NOTES[0].image_url);
      }
    }
  };

  useEffect(() => {
    fetchLatestPhoto();
    const sub = DeviceEventEmitter.addListener('PHOTO_SAVED', (event?: any) => {
      if (event?.uri) {
        setLatestPhotoUri(event.uri);
      } else {
        fetchLatestPhoto();
      }
    });
    return () => sub.remove();
  }, []);

  const handleCenterButtonPress = () => {
    // Tactile micro-spring scale feedback (NO border changes)
    Animated.sequence([
      Animated.timing(shutterAnim, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(shutterAnim, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }),
    ]).start();

    if (!isCameraActive) {
      // If not currently on the Camera tab, go to the Camera tab
      navigation.navigate('index');
    } else {
      // If already on the Camera tab, take the image!
      DeviceEventEmitter.emit('TRIGGER_CAPTURE_PHOTO');
    }
  };

  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      {/* ─── ELEVATED SHUTTER BUTTON (Solid filled, no transparency, white inner disc) ─── */}
      <View style={styles.centerButtonWrapper} pointerEvents="box-none">
        <TouchableOpacity
          onPress={handleCenterButtonPress}
          activeOpacity={0.88}
          style={styles.centerTouchable}
        >
          <Animated.View
            style={[
              styles.centerOuterRing,
              { transform: [{ scale: shutterAnim }] },
            ]}
          >
            {/* Solid White Inner Disc */}
            <View style={styles.centerInnerDot} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ─── BOTTOM NAVIGATION BAR (Light Theme: Clean White & Slate) ─── */}
      <View style={styles.tabBar}>
        {/* Left Tab: Photos Preview (Big enough to see photo clearly, with empty state) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('library')}
          activeOpacity={0.75}
        >
          {latestPhotoUri ? (
            <View
              style={[
                styles.photoThumbWrapper,
                currentRouteName === 'library' && styles.photoThumbWrapperActive,
              ]}
            >
              <Image source={{ uri: latestPhotoUri }} style={styles.photoThumbImage} />
            </View>
          ) : (
            <View
              style={[
                styles.photoThumbEmpty,
                currentRouteName === 'library' && styles.photoThumbWrapperActive,
              ]}
            >
              <Images
                size={22}
                color={currentRouteName === 'library' ? '#0F172A' : '#94A3B8'}
                weight={currentRouteName === 'library' ? 'fill' : 'regular'}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Center Spacer for the bigger elevated center shutter button */}
        <View style={styles.centerSpacer} />

        {/* Right Tab: Profile */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('profile')}
          activeOpacity={0.75}
        >
          <User
            size={24}
            color={currentRouteName === 'profile' ? '#0F172A' : '#64748B'}
            weight={currentRouteName === 'profile' ? 'fill' : 'regular'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentRouteName === 'profile' && styles.tabLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      initialRouteName="index"
      tabBar={(props) => <CustomConcentricTabBar {...props} />}
      screenOptions={{
        tabBarShowLabel: false,
        tabBarIndicatorStyle: { height: 0, backgroundColor: 'transparent' },
      }}
    >
      <MaterialTopTabs.Screen name="library" />
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="profile" />
      <MaterialTopTabs.Screen
        name="scan"
        options={{
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  centerButtonWrapper: {
    position: 'absolute',
    top: -28,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTouchable: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 9,
  },
  centerInnerDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', // Clean Light Theme White
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    width: '100%',
    height: Platform.OS === 'ios' ? 80 : 66,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  centerSpacer: {
    width: 86,
  },
  photoThumbWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoThumbWrapperActive: {
    borderColor: '#0F172A',
    borderWidth: 2.5,
  },
  photoThumbEmpty: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
