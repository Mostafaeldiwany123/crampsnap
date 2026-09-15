import React from 'react';
import { withLayoutContext } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import { View, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Camera, Images, User } from 'phosphor-react-native';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  any,
  any
>(Navigator);

interface TabBarConfig {
  label: string;
  Icon: React.ComponentType<any>;
}

const TAB_CONFIG: Record<string, TabBarConfig> = {
  scan: { label: 'Camera', Icon: Camera },
  library: { label: 'Photos', Icon: Images },
  profile: { label: 'Profile', Icon: User },
};

function FloatingBottomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={tabStyles.floatingWrapper} pointerEvents="box-none">
      <View style={tabStyles.pillBar}>
        {state.routes.map((route: any, index: number) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null; // Hide routes like 'index'

          const isFocused = state.index === index;
          const { label, Icon } = config;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[
                tabStyles.tabItem,
                isFocused && tabStyles.tabItemActive,
              ]}
              activeOpacity={0.75}
            >
              <Icon
                size={20}
                color={isFocused ? '#111827' : '#94A3B8'}
                weight={isFocused ? 'fill' : 'regular'}
              />
              <Text
                style={[
                  tabStyles.tabLabel,
                  isFocused && tabStyles.tabLabelActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      initialRouteName="scan"
      tabBar={(props) => <FloatingBottomTabBar {...props} />}
      screenOptions={{
        tabBarShowLabel: false,
        tabBarIndicatorStyle: { height: 0, backgroundColor: 'transparent' },
      }}
    >
      <MaterialTopTabs.Screen name="scan" />
      <MaterialTopTabs.Screen name="library" />
      <MaterialTopTabs.Screen name="profile" />
      <MaterialTopTabs.Screen
        name="index"
        options={{
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </MaterialTopTabs>
  );
}

const tabStyles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  pillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#F3F4F6',
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'PTSans',
    color: '#94A3B8',
  },
  tabLabelActive: {
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#111827',
  },
});
