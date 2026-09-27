import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../lib/api';

export default function EarningsScreen() {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/rider/orders?per_page=100');
        const orders = res.data?.data ?? [];
        const delivered = orders.filter((o: any) => o.status === 'delivered');
        setDeliveryCount(delivered.length);
        setTotalEarnings(delivered.reduce((sum: number, o: any) => sum + (o.total || 0), 0));
      } catch { } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F97316]">
        <View
          className="w-24 h-24 rounded-full bg-white items-center justify-center mb-5 overflow-hidden"
          style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}
        >
          <Image
            source={require('../../../../assets/images/logooos.jpg')}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        <Text className="text-white text-xl font-extrabold tracking-widest">NEWMOON</Text>
        <Text className="text-white/90 text-[11px] font-bold uppercase tracking-[2px] mt-1">Lechon Manok &amp; Liempo</Text>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="text-white/90 text-[13px] mt-4">Loading earnings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      {/* Orange header */}
      <View
        className="bg-[#F97316] rounded-b-[36px]"
        style={{ paddingTop: 16, paddingBottom: 22, paddingHorizontal: 20 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-white items-center justify-center mr-2 overflow-hidden"
                  style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}
                >
                  <Image
                    source={require('../../../../assets/images/logooos.jpg')}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <Text className="text-white text-lg font-extrabold leading-5">NewMoon</Text>
              </View>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="wallet-outline" size={12} color="#FFFFFF" />
                <Text className="text-white/90 text-[10px] font-bold uppercase tracking-wider ml-1.5">
                  Earnings
                </Text>
              </View>
            </View>
          </View>
          <View className="w-10 h-10 rounded-2xl bg-white items-center justify-center"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
          >
            <Ionicons name="flame" size={20} color="#F97316" />
          </View>
        </View>

        <Text className="text-white text-2xl font-extrabold mt-5">
          Earnings
        </Text>
        <Text className="text-white/90 text-[13px] mt-1">
          Track your delivery earnings
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <>
          {/* Main Earnings Card */}
          <View
            className="bg-white rounded-3xl p-6 overflow-hidden w-full border border-[#FED7AA]"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}
          >
            {/* Decorative warm glows */}
            <View className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[#FED7AA] opacity-40" />
            <View className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-[#FFE4C9] opacity-40" />
            <View className="absolute top-6 left-6 w-24 h-0.5 bg-[#F97316] opacity-30 rounded-full" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="w-11 h-11 rounded-2xl bg-[#F97316] items-center justify-center"
                  style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 }}
                >
                  <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                </View>
                <View className="ml-3">
                  <Text className="text-[#7C2D12] text-[10px] font-extrabold uppercase tracking-wider">Delivery Earnings</Text>
                  <Text className="text-stone-500 text-[9px] font-bold uppercase tracking-wider mt-0.5">NewMoon Lechon Manok &amp; Liempo</Text>
                </View>
              </View>
              <View className="flex-row items-center bg-[#FFF1E6] px-2.5 py-1.5 rounded-full border border-[#FED7AA]">
                <Ionicons name="flame" size={11} color="#F97316" style={{ marginRight: 4 }} />
                <Text className="text-[#7C2D12] text-[9px] font-bold uppercase tracking-wider">Rider</Text>
              </View>
            </View>

            <View className="flex-row items-end mt-7">
              <Text className="text-[#F97316] text-2xl font-extrabold mr-1 mb-1">₱</Text>
              <Text className="text-[#7C2D12] text-4xl font-extrabold tracking-tight">{totalEarnings.toLocaleString()}</Text>
            </View>
            <Text className="text-stone-500 text-xs font-semibold mt-1">Total Earnings</Text>

            {deliveryCount === 0 && (
              <View className="mt-3 self-start bg-[#FFF1E6] px-3 py-1.5 rounded-full border border-[#FED7AA]">
                <Text className="text-[#7C2D12] text-[10px] font-bold">No completed deliveries yet</Text>
              </View>
            )}

            <View className="h-px bg-[#F5EDE0] my-5" />

            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-[#7C2D12] text-2xl font-extrabold">{deliveryCount}</Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="checkmark-circle" size={11} color="#22C55E" style={{ marginRight: 4 }} />
                  <Text className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Deliveries</Text>
                </View>
              </View>
              <View className="w-px bg-[#F5EDE0] h-10 mx-4" />
              <View className="flex-1">
                <Text className="text-[#7C2D12] text-2xl font-extrabold">{deliveryCount}</Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="receipt-outline" size={11} color="#F97316" style={{ marginRight: 4 }} />
                  <Text className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Total Orders</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Statistics Cards */}
          <View className="flex-row gap-3 mt-4">
            <View
              className="flex-1 bg-white rounded-2xl p-4 border border-[#FED7AA]"
              style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#FFF1E6] items-center justify-center mb-2.5 border border-[#FED7AA]">
                <Ionicons name="bicycle" size={16} color="#F97316" />
              </View>
              <Text className="text-[#7C2D12] text-xl font-extrabold">{deliveryCount}</Text>
              <Text className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-0.5">Deliveries</Text>
            </View>
            <View
              className="flex-1 bg-white rounded-2xl p-4 border border-[#FED7AA]"
              style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#FFF7ED] items-center justify-center mb-2.5 border border-[#FED7AA]">
                <Ionicons name="receipt-outline" size={16} color="#7C2D12" />
              </View>
              <Text className="text-[#7C2D12] text-xl font-extrabold">{deliveryCount}</Text>
              <Text className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-0.5">Total Orders</Text>
            </View>
          </View>

          {/* Motivational */}
          <View className="flex-row items-center bg-[#FFF1E6] rounded-2xl px-4 py-3 mt-4 border border-[#FED7AA]">
            <View className="w-9 h-9 rounded-xl bg-[#F97316] items-center justify-center mr-2.5">
              <Ionicons name="flame" size={17} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[#7C2D12] text-[13px] font-extrabold">Great work, Rider!</Text>
              <Text className="text-stone-500 text-[11px] mt-0.5">Keep delivering great service.</Text>
            </View>
          </View>
        </>
      </ScrollView>
    </SafeAreaView>
  );
}