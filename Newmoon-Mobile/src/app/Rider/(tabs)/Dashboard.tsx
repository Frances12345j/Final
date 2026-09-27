import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/authContext';
import * as Location from 'expo-location';
import api from '../../../../lib/api';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_address: string;
  status: string;
  total: string | number;
  created_at: string;
  distance?: string;
}

export default function RiderDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ today_deliveries: 0, today_earnings: 0, active_orders: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [gpsActive, setGpsActive] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 50 },
        () => setGpsActive(true),
      );
      setGpsActive(true);
      return () => sub.remove();
    })();
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const ordersRes = await api.get('/rider/orders?per_page=50').catch(() => ({ data: { data: [] } }));
      const orders = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      setRecentOrders(orders.slice(0, 5));
      setStats({
        today_deliveries: orders.filter((o: Order) => o.status === 'delivered').length,
        today_earnings: orders.filter((o: Order) => o.status === 'delivered').reduce((sum: number, o: Order) => sum + Number(o.total || 0), 0),
        active_orders: orders.filter((o: Order) => !['delivered', 'cancelled'].includes(o.status)).length,
      });
    } catch {
      setStats({ today_deliveries: 0, today_earnings: 0, active_orders: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          await signOut();
          router.replace('/Login');
        },
      },
    ]);
  };

  const formatCurrency = (amount: number | string) =>
    `₱${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const getStatusMeta = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      delivered: { bg: '#DCFCE7', text: '#16A34A', label: 'Delivered' },
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
      accepted: { bg: '#FFEDD5', text: '#EA580C', label: 'Accepted' },
      preparing: { bg: '#F5EDE0', text: '#7C2D12', label: 'Preparing' },
      ready: { bg: '#FFEDD5', text: '#F97316', label: 'Ready' },
      picked_up: { bg: '#FFE4CC', text: '#F97316', label: 'Picked Up' },
      out_for_delivery: { bg: '#FFEDD5', text: '#EA580C', label: 'Out for Delivery' },
      cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' },
    };
    return map[status] || { bg: '#F5F5F4', text: '#78716C', label: status.replace(/_/g, ' ') };
  };

  const activeOrders = recentOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const deliveredOrders = recentOrders.filter((o) => o.status === 'delivered');
  const activeCount = activeOrders.length;

  const totalRun = stats.today_deliveries + stats.active_orders;
  const runProgress = totalRun > 0 ? Math.round((stats.today_deliveries / totalRun) * 100) : 0;

  const displayName = user?.firstname?.trim() || user?.username || 'Rider';
  const userInitial = displayName.charAt(0).toUpperCase();

  if (loading && !refreshing) {
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
        <Text className="text-white/90 text-[13px] mt-4">Loading your delivery dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <StatusBar barStyle="light-content" backgroundColor="#F97316" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#F97316" colors={['#F97316']} />
        }
      >
        {/* Orange header */}
        <View className="px-5 pt-4 pb-4 bg-[#F97316] rounded-b-[36px]">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-xl bg-white items-center justify-center mr-3 overflow-hidden"
                style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
              >
                <Image
                  source={require('../../../../assets/images/logooos.jpg')}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View>
                <Text className="text-white text-base font-extrabold tracking-wide">NEWMOON</Text>
                <Text className="text-white/90 text-[9px] font-bold uppercase tracking-[1.5px] mt-0.5">Lechon Manok &amp; Liempo</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 ml-2">
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white items-center justify-center"
                style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
                onPress={() => router.push('/Rider/Profile' as unknown as any)}
                activeOpacity={0.7}
              >
                {user?.avatar_url ? (
                  <Image
                    key={user.avatar_url}
                    source={{ uri: user.avatar_url }}
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-[#F97316] font-extrabold text-base">{userInitial}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white items-center justify-center"
                style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={19} color="#F97316" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-5">
            <Text className="text-2xl font-extrabold text-white">Hey, {displayName}! 👋</Text>
            <Text className="text-sm text-white/90 mt-1">Ready for today&apos;s deliveries?</Text>
          </View>

          {/* GPS + Active status pills */}
          <View className="flex-row gap-3 mt-4">
            <Animated.View
              className="flex-row items-center px-4 py-2.5 rounded-full bg-white"
              style={{ opacity: pulseAnim, shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 }}
            >
              <View className={`w-2.5 h-2.5 rounded-full mr-2.5 ${gpsActive ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className={`text-xs font-extrabold tracking-wider uppercase ${gpsActive ? 'text-green-600' : 'text-red-500'}`}>
                {gpsActive ? 'GPS Active' : 'GPS Off'}
              </Text>
            </Animated.View>

            <View
              className="flex-row items-center px-4 py-2.5 rounded-full bg-[#7C2D12]"
              style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}
            >
              <Ionicons name="bicycle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text className="text-white text-xs font-extrabold tracking-wider uppercase">{activeCount} Active</Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View className="flex-row gap-3 px-5 mt-5">
          <View
            className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}
          >
            <View className="w-11 h-11 rounded-2xl bg-[#DCFCE7] items-center justify-center mb-3">
              <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            </View>
            <Text className="text-[#7C2D12] text-3xl font-extrabold">{stats.today_deliveries}</Text>
            <Text className="text-[#7C2D12] text-sm font-bold mt-0.5">Delivered</Text>
            <Text className="text-stone-500 text-[11px] tracking-wide uppercase">Today</Text>
          </View>

          <View
            className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}
          >
            <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mb-3">
              <Ionicons name="bicycle" size={22} color="#F97316" />
            </View>
            <Text className="text-[#7C2D12] text-3xl font-extrabold">{stats.active_orders}</Text>
            <Text className="text-[#7C2D12] text-sm font-bold mt-0.5">Active</Text>
            <Text className="text-stone-500 text-[11px] tracking-wide uppercase">Orders</Text>
          </View>
        </View>

        {/* Today's Delivery Run */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-[#7C2D12]">Today&apos;s Delivery Run</Text>
              <Text className="text-sm text-stone-500 mt-0.5">Keep the food moving.</Text>
            </View>
            <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full">
              <Text className="text-[#F97316] text-[11px] font-bold">🔥 {runProgress}%</Text>
            </View>
          </View>

          <View
            className="bg-white rounded-3xl p-5 border border-[#FED7AA]"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="flame" size={16} color="#F97316" />
                <Text className="text-[#F97316] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Run Progress</Text>
              </View>
              <Text className="text-stone-500 text-[11px] font-semibold">{stats.today_deliveries} / {totalRun} done</Text>
            </View>

            <View className="mt-4">
              <View className="h-2.5 rounded-full bg-[#FFF1E6] overflow-hidden">
                <View className="h-full rounded-full bg-[#F97316]" style={{ width: `${runProgress}%` }} />
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-stone-500 text-[11px] font-semibold">{runProgress}% run complete</Text>
                <Text className="text-[#F97316] text-[11px] font-extrabold">
                  {activeCount > 0 ? 'Keep delivering! 🔥' : 'Great work today! 🔥'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Earnings Card */}
        <View className="px-5 mt-4">
          <View
            className="bg-white rounded-3xl p-5 border border-[#FED7AA] flex-row items-center"
            style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}
          >
            <View
              className="w-14 h-14 rounded-2xl bg-[#F97316] items-center justify-center mr-4"
              style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}
            >
              <Ionicons name="wallet-outline" size={26} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Today&apos;s Earnings</Text>
              <Text className="text-[#F97316] text-3xl font-extrabold mt-0.5">{formatCurrency(stats.today_earnings)}</Text>
              <Text className="text-stone-500 text-xs mt-0.5">Delivery earnings today</Text>
            </View>
          </View>
        </View>

        {/* Active Orders */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-xl font-extrabold text-[#7C2D12]">Active Orders</Text>
              <Text className="text-sm text-stone-500 mt-0.5">Waiting for delivery</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/Rider/Orders')} className="bg-[#FFF1E6] px-3 py-1.5 rounded-full">
              <Text className="text-[#F97316] text-[11px] font-bold">View All →</Text>
            </TouchableOpacity>
          </View>

          {activeOrders.length === 0 ? (
            <View className="bg-white rounded-3xl p-6 border border-[#FED7AA] items-center">
              <View className="w-14 h-14 rounded-2xl bg-[#FFF1E6] items-center justify-center mb-3">
                <Ionicons name="bicycle" size={26} color="#F97316" />
              </View>
              <Text className="text-[#7C2D12] font-extrabold text-sm">No active orders</Text>
              <Text className="text-stone-500 text-xs mt-1 text-center">New delivery assignments will appear here.</Text>
            </View>
          ) : (
            activeOrders.slice(0, 3).map((order) => {
              const meta = getStatusMeta(order.status);
              return (
                <TouchableOpacity
                  key={order.id}
                  className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]"
                  style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}
                  onPress={() => router.push('/Rider/Orders')}
                  activeOpacity={0.75}
                >
                  <View className="flex-row justify-between items-center mb-2.5">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5">
                        <Ionicons name="receipt-outline" size={16} color="#F97316" />
                      </View>
                      <Text className="text-[#7C2D12] font-extrabold text-sm">#{order.order_number}</Text>
                    </View>
                    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: meta.bg }}>
                      <Text className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: meta.text }}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mb-1.5">
                    <Ionicons name="person" size={13} color="#F97316" style={{ marginRight: 6 }} />
                    <Text className="text-[#7C2D12] text-sm font-semibold flex-1" numberOfLines={1}>{order.customer_name}</Text>
                  </View>
                  <View className="flex-row items-start">
                    <Ionicons name="location" size={13} color="#A8A29E" style={{ marginRight: 6, marginTop: 1 }} />
                    <Text className="text-stone-500 text-xs flex-1" numberOfLines={1}>{order.customer_address}</Text>
                  </View>

                  <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-[#F5EDE0]">
                    <Text className="text-[#F97316] text-lg font-extrabold">{formatCurrency(Number(order.total))}</Text>
                    <View className="flex-row items-center">
                      <Text className="text-[#F97316] text-xs font-extrabold">View Order</Text>
                      <Ionicons name="arrow-forward" size={13} color="#F97316" style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Recent Deliveries */}
        <View className="px-5 mt-6">
          <View className="mb-4">
            <Text className="text-xl font-extrabold text-[#7C2D12]">Recent Deliveries</Text>
            <Text className="text-sm text-stone-500 mt-0.5">Successfully completed</Text>
          </View>

          {deliveredOrders.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center">
              <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                <Ionicons name="bicycle" size={30} color="#F97316" />
              </View>
              <Text className="text-[#7C2D12] font-extrabold text-base">No deliveries yet</Text>
              <Text className="text-stone-500 text-xs mt-1 text-center">Your completed deliveries will appear here.</Text>
            </View>
          ) : (
            deliveredOrders.slice(0, 5).map((order) => (
              <View
                key={order.id}
                className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA] flex-row items-center"
                style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
              >
                <View className="w-11 h-11 rounded-2xl bg-[#DCFCE7] items-center justify-center mr-3.5">
                  <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#7C2D12] text-sm font-extrabold">#{order.order_number}</Text>
                  <Text className="text-stone-500 text-xs" numberOfLines={1}>{order.customer_name}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#16A34A] text-sm font-extrabold">{formatCurrency(Number(order.total))}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="time-outline" size={11} color="#A8A29E" style={{ marginRight: 3 }} />
                    <Text className="text-stone-500 text-[11px]">{formatTime(order.created_at)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Footer Branding */}
        <View className="items-center px-5 mt-8 mb-2">
          <View className="w-10 h-[3px] rounded-full bg-[#FED7AA] mb-4" />
          <Ionicons name="flame" size={16} color="#F97316" />
          <Text className="text-[#7C2D12] text-xs font-extrabold tracking-widest mt-1">NEWMOON</Text>
          <Text className="text-stone-500 text-[10px] mt-0.5 tracking-wide">Lechon Manok &amp; Liempo</Text>
          <Text className="text-[#F97316] text-[10px] font-bold mt-0.5">Fresh from the Grill</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}