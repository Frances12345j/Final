import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { listenToStaffOrders } from '../../../../lib/api';
import { useAuth } from '../../../../context/authContext';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_address: string;
  items: OrderItem[] | string;
  total: string | number;
  status: OrderStatus;
  branch_name?: string;
  created_at: string;
}

// ===== STATUS CONFIG (Preparing color changed to warm orange) =====
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: any; next?: OrderStatus[] }> = {
  pending: { label: 'Pending', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline', next: ['confirmed'] },
  confirmed: { label: 'Confirmed', color: '#EA580C', bg: '#FFF1E6', icon: 'checkmark-circle-outline', next: ['preparing'] },
  preparing: { label: 'Preparing', color: '#F97316', bg: '#FFF1E6', icon: 'flame-outline', next: ['ready'] },
  ready: { label: 'Ready', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-done-outline', next: [] },
  picked_up: { label: 'Picked Up', color: '#0891B2', bg: '#CFFAFE', icon: 'bicycle-outline', next: [] },
  delivered: { label: 'Delivered', color: '#16A34A', bg: '#DCFCE7', icon: 'home-outline', next: [] },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline', next: [] },
};

const MANAGED_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];

function getNextActions(status: OrderStatus): { label: string; nextStatus: OrderStatus; color: string }[] {
  const config = STATUS_CONFIG[status];
  if (!config?.next || config.next.length === 0) return [];
  return config.next.map((ns) => ({
    label: STATUS_CONFIG[ns].label,
    nextStatus: ns,
    color: STATUS_CONFIG[ns].color,
  }));
}

const StatusPill = React.memo(({ status }: { status: OrderStatus }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <View style={{ backgroundColor: config.bg }} className="px-3 py-1 rounded-full">
      <Text style={{ color: config.color }} className="text-[10px] font-extrabold uppercase tracking-wide">
        {config.label}
      </Text>
    </View>
  );
});
StatusPill.displayName = 'StatusPill';

// ===== Helper: Relative time =====
const getRelativeTime = (dateStr: string): string => {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return '';
  }
};

// ===== Action Button Color by Status =====
const ACTION_COLORS: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  confirmed: '#EA580C',
  preparing: '#F97316',
  ready: '#16A34A',
  picked_up: '#0891B2',
  delivered: '#16A34A',
  cancelled: '#DC2626',
};

export default function StaffOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/staff/orders?per_page=50');
      const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setOrders(data);
    } catch {
      if (!isRefresh) setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    let unsubscribe: (() => void) | null = null;
    if (user && (user.role === 'staff' || user.role === 'admin')) {
      unsubscribe = listenToStaffOrders(() => {
        fetchOrders();
      });
    }
    return () => {
      unsubscribe?.();
    };
  }, [fetchOrders, user?.role]);

  const handleStatusAction = async (order: Order, nextStatus: OrderStatus) => {
    try {
      await api.post(`/staff/orders/${order.id}/status`, { status: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update order status');
    }
  };

  const activeOrders = orders.filter((o) => MANAGED_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => !MANAGED_STATUSES.includes(o.status));

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  // ===== Render Items =====
  const renderItems = (items: Order['items']) => {
    if (typeof items === 'string') {
      return (
        <Text className="text-[#1C1917] text-xs font-semibold" numberOfLines={3}>
          {items}
        </Text>
      );
    }
    if (Array.isArray(items)) {
      return (
        <View>
          {items.slice(0, 3).map((item, idx) => (
            <View key={idx} className="flex-row items-center mb-0.5">
              <Text className="text-[#EA580C] text-xs mr-1.5">🍗</Text>
              <Text className="text-[#1C1917] text-xs font-semibold flex-1" numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text className="text-stone-400 text-[10px] mt-0.5">
              +{items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      );
    }
    return <Text className="text-[#1C1917] text-xs font-semibold">Items</Text>;
  };

  // ===== Render Order Card =====
  const renderOrderCard = (order: Order) => {
    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const actions = getNextActions(order.status);
    const isActive = MANAGED_STATUSES.includes(order.status);
    const relativeTime = getRelativeTime(order.created_at);

    return (
      <View
        key={order.id}
        className={`bg-white rounded-3xl p-4 mb-3 border ${isActive ? 'border-[#FED7AA]' : 'border-[#F5EDE0]'}`}
        style={{
          shadowColor: '#451A03',
          shadowOffset: { width: 0, height: isActive ? 3 : 1 },
          shadowOpacity: isActive ? 0.06 : 0.03,
          shadowRadius: isActive ? 10 : 6,
          elevation: isActive ? 2 : 1,
        }}
      >
        {/* ===== Header: Status Icon + Order Number + Status Pill ===== */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center flex-1 mr-2">
            <View
              style={{ backgroundColor: config.bg }}
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            >
              <Ionicons name={config.icon} size={18} color={config.color} />
            </View>
            <View className="flex-1">
              <Text className="text-[#171717] text-sm font-extrabold" numberOfLines={1}>
                {order.order_number}
              </Text>
              <Text className="text-stone-500 text-[11px] mt-0.5">
                {relativeTime} • {formatTime(order.created_at)}
              </Text>
            </View>
          </View>
          <StatusPill status={order.status} />
        </View>

        {/* ===== Customer ===== */}
        <View className="flex-row items-start mb-2">
          <Ionicons name="person-outline" size={15} color="#78716C" style={{ marginTop: 1 }} />
          <View className="ml-2 flex-1">
            <Text className="text-stone-400 text-[10px] font-bold uppercase">Customer</Text>
            <Text className="text-[#171717] text-sm font-bold" numberOfLines={1}>
              {order.customer_name}
            </Text>
          </View>
        </View>

        {/* ===== Address ===== */}
        <View className="flex-row items-start mb-2">
          <Ionicons name="location-outline" size={15} color="#78716C" style={{ marginTop: 1 }} />
          <View className="ml-2 flex-1">
            <Text className="text-stone-400 text-[10px] font-bold uppercase">Delivery Address</Text>
            <Text className="text-stone-500 text-xs" numberOfLines={2}>
              {order.customer_address}
            </Text>
          </View>
        </View>

        {/* ===== Items Box ===== */}
        <View className="bg-[#FFF7ED] rounded-2xl p-3 border border-[#FED7AA] mb-3">
          <View className="flex-row items-center mb-1.5">
            <Text className="text-[#EA580C] text-sm mr-1.5">🍗</Text>
            <Text className="text-[#EA580C] text-[10px] font-extrabold uppercase tracking-wider">Items</Text>
          </View>
          {renderItems(order.items)}
        </View>

        {/* ===== Total ===== */}
        <View className="flex-row justify-between items-center pt-3 border-t border-[#F5EDE0]">
          <Text className="text-stone-500 text-xs font-semibold">Total</Text>
          <Text className="text-[#EA580C] text-lg font-extrabold">
            ₱{Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* ===== Action Button (Active only) ===== */}
        {isActive && actions.length > 0 && (
          <View className="mt-3 pt-3 border-t border-[#F5EDE0]">
            {actions.map((action) => (
              <TouchableOpacity
                key={action.nextStatus}
                style={{ backgroundColor: ACTION_COLORS[action.nextStatus] || action.color }}
                className="w-full py-3.5 rounded-2xl items-center"
                onPress={() => handleStatusAction(order, action.nextStatus)}
                activeOpacity={0.85}
              >
                <Text className="text-white text-sm font-extrabold">
                  {order.status === 'pending' && action.nextStatus === 'confirmed'
                    ? 'Confirm Order'
                    : order.status === 'confirmed' && action.nextStatus === 'preparing'
                      ? 'Start Preparing'
                      : order.status === 'preparing' && action.nextStatus === 'ready'
                        ? 'Mark Ready'
                        : `${action.label}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ===== Loading Screen =====
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FFF7ED]">
        <View
          className="w-24 h-24 rounded-full bg-[#FFF1E6] items-center justify-center mb-5 border border-[#FED7AA] overflow-hidden"
          style={{ shadowColor: '#EA580C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}
        >
          <Image
            source={require('../../../../assets/images/logooos.jpg')}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        <Text className="text-[#171717] text-xl font-extrabold tracking-widest">NEWMOON</Text>
        <Text className="text-[#451A03] text-[11px] font-bold uppercase tracking-[2px] mt-1">Lechon Manok &amp; Liempo House</Text>
        <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 20 }} />
        <Text className="text-stone-500 text-[13px] mt-4">Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            tintColor="#EA580C"
            colors={['#EA580C']}
            title="Pull to refresh..."
            titleColor="#A8A29E"
          />
        }
      >
        {/* ===== COMPACT HEADER (Logo & Title Removed) ===== */}
        <View className="px-5 pt-2 pb-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-[#171717]">Orders</Text>
              <Text className="text-sm text-stone-500 mt-0.5">Manage incoming orders</Text>
            </View>

            <View className="flex-row items-center gap-2 ml-2">
              <View className="flex-row items-center mr-1">
                <View className="w-2 h-2 rounded-full bg-[#16A34A] mr-1.5" />
                <Text className="text-[#16A34A] text-[10px] font-extrabold uppercase tracking-wider">Live</Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#FED7AA]"
                style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
                onPress={() => fetchOrders(true)}
                disabled={refreshing}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={17} color="#451A03" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ===== ORDER SUMMARY ===== */}
        <View className="px-5 mt-4">
          <View className="flex-row gap-3">
            <View
              className="flex-1 bg-white rounded-2xl p-3.5 border border-[#FED7AA] flex-row items-center"
              style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5">
                <Ionicons name="receipt-outline" size={16} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#EA580C] text-xl font-extrabold">{activeOrders.length}</Text>
                <Text className="text-stone-400 text-[9px] font-bold uppercase tracking-wider">Active Orders</Text>
              </View>
            </View>

            <View
              className="flex-1 bg-white rounded-2xl p-3.5 border border-[#FED7AA] flex-row items-center"
              style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#DCFCE7] items-center justify-center mr-2.5">
                <Ionicons name="checkmark-done-outline" size={16} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-[#16A34A] text-xl font-extrabold">{completedOrders.length}</Text>
                <Text className="text-stone-400 text-[9px] font-bold uppercase tracking-wider">Completed</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== SEGMENTED TABS ===== */}
        <View className="px-5 mt-5">
          <View className="flex-row bg-white rounded-2xl border border-[#FED7AA] p-1">
            <TouchableOpacity
              onPress={() => setSelectedTab('active')}
              className={`flex-1 py-3 rounded-xl items-center ${selectedTab === 'active' ? 'bg-[#EA580C]' : 'bg-transparent'}`}
              style={selectedTab === 'active' ? { shadowColor: '#EA580C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 } : undefined}
              activeOpacity={0.8}
            >
              <Text className={selectedTab === 'active' ? 'text-white text-xs font-extrabold' : 'text-stone-500 text-xs font-bold'}>
                ACTIVE ({activeOrders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('completed')}
              className={`flex-1 py-3 rounded-xl items-center ${selectedTab === 'completed' ? 'bg-[#16A34A]' : 'bg-transparent'}`}
              style={selectedTab === 'completed' ? { shadowColor: '#16A34A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 } : undefined}
              activeOpacity={0.8}
            >
              <Text className={selectedTab === 'completed' ? 'text-white text-xs font-extrabold' : 'text-stone-500 text-xs font-bold'}>
                COMPLETED ({completedOrders.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== ORDER LIST ===== */}
        <View className="px-5 mt-5">
          {selectedTab === 'active' && (
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-xl font-extrabold text-[#171717]">Active Queue</Text>
                <Text className="text-sm text-stone-500 mt-0.5">Orders waiting for your branch</Text>
              </View>
              <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#EA580C] text-[11px] font-bold">{activeOrders.length}</Text>
              </View>
            </View>
          )}
          {selectedTab === 'completed' && (
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-xl font-extrabold text-[#171717]">Completed Orders</Text>
                <Text className="text-sm text-stone-500 mt-0.5">Orders already picked up or delivered</Text>
              </View>
              <View className="bg-[#DCFCE7] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#16A34A] text-[11px] font-bold">{completedOrders.length}</Text>
              </View>
            </View>
          )}

          {(selectedTab === 'active' ? activeOrders : completedOrders).length === 0 ? (
            <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center">
              <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                <Ionicons
                  name={selectedTab === 'active' ? 'receipt-outline' : 'checkmark-done-outline'}
                  size={30}
                  color="#EA580C"
                />
              </View>
              <Text className="text-[#171717] font-extrabold text-base">
                {selectedTab === 'active' ? 'No Active Orders' : 'No Completed Orders'}
              </Text>
              <Text className="text-stone-500 text-xs mt-1 text-center">
                {selectedTab === 'active'
                  ? 'New customer orders will appear here.'
                  : 'Completed orders will appear here.'}
              </Text>
            </View>
          ) : (
            (selectedTab === 'active' ? activeOrders : completedOrders).map(renderOrderCard)
          )}
        </View>

        {/* ===== FOOTER ===== */}
        <View className="items-center px-5 mt-8 mb-2">
          <View className="w-10 h-[3px] rounded-full bg-[#FED7AA] mb-4" />
          <Ionicons name="flame" size={16} color="#EA580C" />
          <Text className="text-[#451A03] text-xs font-extrabold tracking-widest mt-1">NEWMOON</Text>
          <Text className="text-stone-500 text-[10px] mt-0.5 tracking-wide">Lechon Manok &amp; Liempo House</Text>
          <Text className="text-[#EA580C] text-[10px] font-bold mt-0.5">Fresh from the Roasted</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}