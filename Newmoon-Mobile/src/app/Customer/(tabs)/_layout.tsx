import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, type ColorValue } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useCart } from '../../../../context/cartContext';

function CartIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  const { itemCount } = useCart();
  return (
    <View style={styles.cartIconWrapper}>
      <Feather name="shopping-cart" size={24} color={color} />
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
        </View>
      )}
    </View>
  );
}

function TabBarIcon({
  focused,
  color,
  activeName,
  inactiveName,
}: {
  focused: boolean;
  color: ColorValue;
  activeName: React.ComponentProps<typeof Ionicons>['name'];
  inactiveName: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={focused ? activeName : inactiveName} size={24} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#EF5B2B',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F5F5F5',
            height: 72,
            paddingTop: 10,
            paddingBottom: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="Home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} color={color} activeName="home" inactiveName="home-outline" />
            ),
            tabBarLabel: ({ focused, children }) => (
              <View style={styles.labelWrap}>
                <Text style={[styles.label, { color: focused ? '#EF5B2B' : '#9CA3AF' }]}>{children}</Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="Activity"
          options={{
            title: 'Activity',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} color={color} activeName="time" inactiveName="time-outline" />
            ),
            tabBarLabel: ({ focused, children }) => (
              <View style={styles.labelWrap}>
                <Text style={[styles.label, { color: focused ? '#EF5B2B' : '#9CA3AF' }]}>{children}</Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="Chat"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} color={color} activeName="chatbubble" inactiveName="chatbubble-outline" />
            ),
            tabBarLabel: ({ focused, children }) => (
              <View style={styles.labelWrap}>
                <Text style={[styles.label, { color: focused ? '#EF5B2B' : '#9CA3AF' }]}>{children}</Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="Profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} color={color} activeName="person" inactiveName="person-outline" />
            ),
            tabBarLabel: ({ focused, children }) => (
              <View style={styles.labelWrap}>
                <Text style={[styles.label, { color: focused ? '#EF5B2B' : '#9CA3AF' }]}>{children}</Text>
              </View>
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
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  cartIconWrapper: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF5B2B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});