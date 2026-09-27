import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import api from '../../../../lib/api';

interface ChatOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  branch: {
    id: number;
    name: string;
  };
  rider?: {
    id: number;
    firstname: string;
    lastname: string;
    avatar_url?: string | null;
  } | null;
}

const CHAT_STATUSES = ['picked_up', 'out_for_delivery'];

export default function ChatScreen() {
  const [orders, setOrders] = useState<ChatOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const response = await api.get('/customer/orders?per_page=50');

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      const chatOrders = data.filter((order: ChatOrder) =>
        CHAT_STATUSES.includes(order.status)
      );

      setOrders(chatOrders);
    } catch {
      // Keep current data if request fails
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      loadOrders();
    }, 10000);

    return () => clearInterval(timer);
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // Group active orders by rider
  const riderChats = (() => {
    const seen = new Map<number, ChatOrder>();

    orders.forEach((order) => {
      if (order.rider?.id && !seen.has(order.rider.id)) {
        seen.set(order.rider.id, order);
      }
    });

    return Array.from(seen.entries());
  })();

  const getStatusInfo = (status: string) => {
    if (status === 'out_for_delivery') {
      return {
        label: 'Out for delivery',
        icon: 'bicycle-outline' as const,
        bg: '#FFF1E6',
        text: '#F97316',
      };
    }

    return {
      label: 'Picked up',
      icon: 'checkmark-circle-outline' as const,
      bg: '#FFF1E6',
      text: '#F97316',
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      {/* ================= HEADER ================= */}
      <View className="px-5 pt-4 pb-6 bg-[#FFF7ED]">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-[#7C2D12]">
            Messages
          </Text>

          <Text className="text-[12px] text-[#7C2D12]/60 mt-1">
            Stay connected with your delivery rider
          </Text>
        </View>
      </View>

      {/* ================= LOADING ================= */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>

          <Text className="text-[#7C2D12]/60 text-sm mt-4">
            Checking your deliveries...
          </Text>
        </View>
      ) : riderChats.length === 0 ? (
        /* ================= EMPTY STATE ================= */
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F97316"
              colors={['#F97316']}
            />
          }
        >
          <View className="items-center">
            <View className="w-28 h-28 rounded-full bg-[#FFF1E6] items-center justify-center mb-5">
              <Ionicons name="chatbubbles-outline" size={52} color="#F97316" />
            </View>

            <Text className="text-[#7C2D12] text-2xl font-extrabold text-center">
              No active chats
            </Text>

            <Text className="text-[#7C2D12]/60 text-sm text-center mt-2 leading-5">
              Once your order is picked up by a rider,
              {'\n'}
              you can chat with them here.
            </Text>

            <TouchableOpacity
              className="mt-7 bg-[#F97316] rounded-2xl px-8 py-4 flex-row items-center"
              onPress={() => router.push('/Customer/Home')}
              activeOpacity={0.85}
              style={{
                shadowColor: '#F97316',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Ionicons name="restaurant-outline" size={19} color="#FFFFFF" />

              <Text className="text-white font-extrabold ml-2">
                Browse Menu
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ================= ACTIVE CHATS ================= */
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F97316"
              colors={['#F97316']}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
        >
          {/* Section Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[18px] font-extrabold text-[#7C2D12]">
              Active Deliveries
            </Text>

            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />

              <Text className="text-xs font-bold text-[#7C2D12]/60">
                Live
              </Text>
            </View>
          </View>

          {/* Rider Cards */}
          {riderChats.map(([riderId, order]) => {
            const rider = order.rider!;

            const fullName = `${rider.firstname} ${rider.lastname}`.trim();

            const riderInitial = (
              rider.firstname?.[0] ||
              rider.lastname?.[0] ||
              'R'
            ).toUpperCase();

            const status = getStatusInfo(order.status);

            return (
              <TouchableOpacity
                key={riderId}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/Customer/orderChat?orderId=${order.id}`)
                }
                className="bg-white rounded-3xl p-4 mb-4"
                style={{
                  shadowColor: '#7C2D12',
                  shadowOpacity: 0.07,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                {/* Rider Header */}
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full bg-[#FFF1E6] items-center justify-center overflow-hidden">
                    {rider.avatar_url ? (
                      <Image
                        key={rider.avatar_url}
                        source={{ uri: rider.avatar_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-[#F97316] font-extrabold text-xl">
                        {riderInitial}
                      </Text>
                    )}
                  </View>

                  <View className="flex-1 ml-3">
                    <Text
                      className="text-[15px] font-extrabold text-[#7C2D12]"
                      numberOfLines={1}
                    >
                      {fullName}
                    </Text>

                    <View className="flex-row items-center mt-1">
                      <Ionicons
                        name="bicycle-outline"
                        size={13}
                        color="#7C2D12"
                        style={{ opacity: 0.6 }}
                      />

                      <Text className="text-[12px] text-[#7C2D12]/60 ml-1">
                        Delivery Rider
                      </Text>
                    </View>
                  </View>

                  <View className="w-10 h-10 rounded-full bg-[#FFF1E6] items-center justify-center">
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={20}
                      color="#F97316"
                    />
                  </View>
                </View>

                {/* Divider */}
                <View className="h-px bg-[#FFF1E6] my-4" />

                {/* Order Information */}
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-[#FFF1E6] items-center justify-center">
                    <Ionicons name="flame-outline" size={19} color="#F97316" />
                  </View>

                  <View className="flex-1 ml-3">
                    <Text className="text-[10px] font-extrabold text-[#7C2D12]/50 uppercase tracking-wider">
                      Your Order
                    </Text>

                    <Text className="text-[13px] font-extrabold text-[#7C2D12] mt-0.5">
                      #{order.order_number}
                    </Text>
                  </View>

                  <View
                    className="px-3 py-2 rounded-full flex-row items-center"
                    style={{ backgroundColor: status.bg }}
                  >
                    <Ionicons name={status.icon} size={14} color={status.text} />

                    <Text
                      className="text-xs font-extrabold ml-1"
                      style={{ color: status.text }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                {/* Branch */}
                {order.branch?.name && (
                  <View className="flex-row items-center mt-3">
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#A8A29E"
                    />

                    <Text
                      className="text-[11px] text-[#7C2D12]/60 ml-1"
                      numberOfLines={1}
                    >
                      {order.branch.name}
                    </Text>
                  </View>
                )}

                {/* Open Chat */}
                <View className="flex-row items-center justify-end mt-4">
                  <Text className="text-[13px] font-extrabold text-[#F97316] mr-1">
                    Open Chat
                  </Text>

                  <Ionicons name="arrow-forward" size={16} color="#F97316" />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Bottom Hint */}
          <View className="items-center py-5">
            <View className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={15} color="#A8A29E" />

              <Text className="text-xs text-[#7C2D12]/50 ml-1.5">
                Tap a rider to start chatting
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}