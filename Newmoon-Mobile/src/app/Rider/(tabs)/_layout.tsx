import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: 46,
        height: 30,
        borderRadius: 15,
        backgroundColor: focused ? '#FFF1E6' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#EA580C',
          tabBarInactiveTintColor: '#A8A29E',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            height: 70 + insets.bottom,
            paddingTop: 8,
            paddingBottom: 10 + insets.bottom,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            elevation: 16,
            shadowColor: '#451A03',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabel: ({ color, focused, children }) => (
            <View style={{ alignItems: 'center' }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 10, fontWeight: focused ? '700' : '600', color, marginTop: 3 }}
              >
                {children}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  marginTop: 2,
                  backgroundColor: focused ? '#EA580C' : 'transparent',
                }}
              />
            </View>
          ),
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="Dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={22}
                  color={color}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="Orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <MaterialIcons
                  name="list-alt"
                  size={22}
                  color={color}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="History"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <Ionicons
                  name={focused ? 'time' : 'time-outline'}
                  size={22}
                  color={color}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="Maps"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <FontAwesome5
                  name="map"
                  size={20}
                  color={color}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="Earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={22}
                  color={color}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="Delivery"
          options={{
            title: 'Delivery',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <MaterialIcons
                  name="verified"
                  size={22}
                  color={color}
                />
              </TabIcon>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
});