import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StatusBar, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { useAvatarPicker } from '../../../hooks/useAvatarPicker';
import api from '../../../lib/api';
import { saveUser } from '../../../lib/userStorage';

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const { pickAvatar, uploading } = useAvatarPicker();
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    middlename: '',
    email: '',
    phone: '',
    address: '',
  });

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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
              router.replace('/Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const renderField = (label: string, key: keyof typeof form, icon: string, multiline = false) => (
    <View className="px-4 py-3.5 border-b border-gray-100">
      <View className="flex-row items-center">
        <Ionicons name={icon as any} size={18} color="#007AFF" />
        <Text className="text-gray-500 text-xs ml-2 uppercase tracking-wider">{label}</Text>
      </View>
      {editing ? (
        <TextInput
          className="text-gray-900 text-base mt-1 -ml-2 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200"
          value={form[key]}
          onChangeText={(v) => setForm({ ...form, [key]: v })}
          placeholderTextColor="#9CA3AF"
          placeholder={label}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      ) : (
        <Text className="text-gray-900 text-base mt-1 ml-5">
          {form[key] || <Text className="text-gray-400 italic">Not set</Text>}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View className="bg-white px-4 pb-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Profile</Text>
          </View>
          {editing ? (
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setEditing(false)} className="px-3 py-1.5 rounded-lg bg-gray-100">
                <Text className="text-gray-600 text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} className="px-4 py-1.5 rounded-lg bg-[#007AFF]">
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-sm font-medium">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleSignOut} disabled={loggingOut} className="p-1.5">
              {loggingOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="items-center pt-8 pb-6">
          <View className="relative mb-4">
            <View className="w-20 h-20 rounded-full bg-[#E8F0FE] items-center justify-center border-2 border-[#007AFF]/20 overflow-hidden">
              {user?.avatar_url ? (
                <Image key={user.avatar_url} source={{ uri: user.avatar_url }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={40} color="#007AFF" />
              )}
            </View>
            {!editing && (
              <TouchableOpacity
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#007AFF] items-center justify-center border-2 border-white"
                onPress={pickAvatar}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="camera" size={14} color="white" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-gray-900 text-xl font-bold">
            {form.firstname && form.lastname ? `${form.firstname} ${form.lastname}` : 'Rider'}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">Delivery Rider</Text>
          {!editing && (
            <TouchableOpacity
              className="mt-3 flex-row items-center bg-[#E8F0FE] px-4 py-2 rounded-full"
              onPress={() => setEditing(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#007AFF" />
              <Text className="text-[#007AFF] text-sm font-semibold ml-1">Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="mx-4 bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          {renderField('First Name', 'firstname', 'person-outline')}
          {renderField('Middle Name', 'middlename', 'person-outline')}
          {renderField('Last Name', 'lastname', 'person-outline')}
          {renderField('Email', 'email', 'mail-outline')}
          {renderField('Phone', 'phone', 'call-outline')}
          {renderField('Address', 'address', 'home-outline', true)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}