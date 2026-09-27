import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput,
  ScrollView, StatusBar, Image, KeyboardAvoidingView, Platform,
  Keyboard, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../../context/authContext';
import { useAvatarPicker } from '../../../../hooks/useAvatarPicker';
import api from '../../../../lib/api';
import { saveUser } from '../../../../lib/userStorage';

export default function ProfileScreen() {
  const { user, updateUser } = useAuth();
  const { pickAvatar, uploading } = useAvatarPicker();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    middlename: '',
    email: '',
    phone: '',
    address: '',
  });

  // Zoom animation values per field
  const zoomAnims = useRef<Record<string, Animated.Value>>({
    firstname: new Animated.Value(1),
    middlename: new Animated.Value(1),
    lastname: new Animated.Value(1),
    email: new Animated.Value(1),
    phone: new Animated.Value(1),
  }).current;

  useEffect(() => {
    if (user) {
      setForm({
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        middlename: user.middlename || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        middlename: form.middlename.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      };
      const res = await api.put('/me', payload);
      const updated = res.data?.user || res.data;
      await saveUser(updated);
      await updateUser({ ...payload });
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // Animate zoom in / out on focus / blur
  const animateZoom = (key: string, toValue: number) => {
    Animated.spring(zoomAnims[key], {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  };

  const handleFocus = (key: string) => {
    setFocusedKey(key);
    animateZoom(key, 1.03);
  };

  const handleBlur = (key: string) => {
    setFocusedKey((prev) => (prev === key ? null : prev));
    animateZoom(key, 1);
  };

  const renderField = (label: string, key: keyof typeof form, icon: string) => (
    <Animated.View
      key={key}
      style={{
        transform: [{ scale: zoomAnims[key] }],
        zIndex: focusedKey === key ? 10 : 1,
      }}
    >
      <View
        className={`px-4 py-3.5 border-b border-[#FFF1E6] ${
          focusedKey === key ? 'bg-[#FFFBF5]' : 'bg-white'
        }`}
      >
        <View className="flex-row items-center">
          <View
            className={`w-9 h-9 rounded-full items-center justify-center ${
              focusedKey === key ? 'bg-[#F97316]' : 'bg-[#FFF1E6]'
            }`}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={focusedKey === key ? '#FFFFFF' : '#F97316'}
            />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-[#7C2D12]/50 text-[10px] uppercase font-extrabold tracking-wider">
              {label}
            </Text>
            {editing ? (
              <TextInput
                className="text-[#7C2D12] text-[14px] font-extrabold mt-0.5 py-1"
                value={form[key]}
                onChangeText={(v) => setForm({ ...form, [key]: v })}
                onFocus={() => handleFocus(key)}
                onBlur={() => handleBlur(key)}
                placeholderTextColor="#A8A29E"
                placeholder={label}
                returnKeyType="done"
              />
            ) : (
              <Text className="text-[#7C2D12] text-[14px] font-extrabold mt-0.5">
                {form[key] || (
                  <Text className="text-[#7C2D12]/40 italic font-medium">Not set</Text>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <StatusBar barStyle="light-content" backgroundColor="#7C2D12" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* ================= DARK HEADER ================= */}
          <View
            className="bg-[#7C2D12] px-4 pt-4 pb-8 rounded-b-[36px]"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            {/* Top bar */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3"
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text className="text-white text-[20px] font-extrabold">
                  My Profile
                </Text>
              </View>

              {editing ? (
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-full bg-white/15"
                  >
                    <Text className="text-white text-[12px] font-extrabold">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 rounded-full bg-[#F97316]"
                    style={{
                      shadowColor: '#F97316',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white text-[12px] font-extrabold">
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Avatar */}
            <View className="items-center">
              <View className="relative mb-4">
                <View
                  className="w-24 h-24 rounded-full bg-[#FFF1E6] items-center justify-center overflow-hidden"
                  style={{
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                    shadowColor: '#F97316',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 6,
                  }}
                >
                  {user?.avatar_url ? (
                    <Image
                      key={user.avatar_url}
                      source={{ uri: user.avatar_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-[#F97316] font-extrabold text-3xl">
                      {(form.firstname?.[0] || 'C').toUpperCase()}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#F97316] items-center justify-center border-2 border-[#7C2D12]"
                  onPress={pickAvatar}
                  activeOpacity={0.7}
                  style={{
                    shadowColor: '#F97316',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={15} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              <Text className="text-white text-[22px] font-extrabold">
                {form.firstname && form.lastname
                  ? `${form.firstname} ${form.lastname}`
                  : 'Customer'}
              </Text>

              <View className="bg-white/15 rounded-full px-3 py-1 mt-2">
                <Text className="text-white/90 text-[10px] font-extrabold uppercase tracking-[2px]">
                  Customer
                </Text>
              </View>
            </View>
          </View>

          {/* ================= ACCOUNT INFORMATION ================= */}
          <View className="mx-4 mt-5">
            <View className="flex-row items-center mb-3 ml-1">
              <View className="w-1.5 h-1.5 rounded-full bg-[#F97316] mr-2" />
              <Text className="text-[#7C2D12] text-[11px] font-extrabold uppercase tracking-wider">
                Account Information
              </Text>
            </View>

            <View
              className="bg-white rounded-3xl overflow-hidden"
              style={{
                shadowColor: '#7C2D12',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {renderField('Full Name', 'firstname', 'person-outline')}
              {renderField('Middle Name', 'middlename', 'person-outline')}
              {renderField('Last Name', 'lastname', 'person-outline')}
              {renderField('Email', 'email', 'mail-outline')}
              {renderField('Phone', 'phone', 'call-outline')}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}