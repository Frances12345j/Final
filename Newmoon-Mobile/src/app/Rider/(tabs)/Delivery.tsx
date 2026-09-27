import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import api from '../../../../lib/api';
import ProofOfDelivery from '../ProofOfDelivery';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_address: string;
  status: string;
  total: string | number;
  created_at: string;
  branch_name?: string;
  distance?: string;
  duration?: string;
}

export default function DeliveryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed'>('pending');
  const [proofOrder, setProofOrder] = useState<Order | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/rider/orders?per_page=50');
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
    const interval = setInterval(() => fetchOrders(), 20000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const pendingProof = orders.filter((o) => o.status === 'out_for_delivery');
  const proofCompleted = orders.filter((o) => o.status === 'delivered');

  const handleProofSubmit = () => {
    setShowProofModal(false);
    setProofOrder(null);
    fetchOrders();
  };

  const handleProofCancel = () => {
    setShowProofModal(false);
    setProofOrder(null);
  };

  const formatCurrency = (amount: number | string) =>
    `₱${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const renderPendingCard = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      className="bg-white rounded-3xl overflow-hidden mb-4 border border-[#FED7AA]"
      style={{
        shadowColor: '#7C2D12',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
      activeOpacity={0.7}
      onPress={() => {
        setProofOrder(order);
        setShowProofModal(true);
      }}
    >
      <View className="h-1.5 bg-[#F97316]" />
      <View className="p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center flex-1">
            <View className="bg-[#FFF1E6] p-2 rounded-xl mr-2.5 border border-[#FED7AA]">
              <MaterialIcons name="directions-bike" size={16} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Order</Text>
              <Text className="text-[15px] font-extrabold text-[#7C2D12]" numberOfLines={1}>{order.order_number}</Text>
            </View>
          </View>
          <View className="bg-[#FFF1E6] px-2.5 py-1.5 rounded-full border border-[#FED7AA] flex-row items-center">
            <Ionicons name="camera-outline" size={11} color="#F97316" style={{ marginRight: 4 }} />
            <Text className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C2D12]">Proof Needed</Text>
          </View>
        </View>

        {/* Customer */}
        <View className="bg-[#FFFBF5] rounded-2xl p-3 mb-2.5 border border-[#F5EDE0]">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5">
              <Ionicons name="person-outline" size={15} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Customer</Text>
              <Text className="text-[14px] font-bold text-[#7C2D12]">{order.customer_name}</Text>
            </View>
          </View>
          <View className="flex-row items-start">
            <View className="w-8 h-8 rounded-xl bg-[#FFF7ED] items-center justify-center mr-2.5 border border-[#FED7AA]">
              <Ionicons name="location-outline" size={14} color="#7C2D12" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Delivery Address</Text>
              <Text className="text-[12px] text-stone-600 leading-4">{order.customer_address || 'No address provided'}</Text>
            </View>
          </View>
        </View>

        {/* Branch */}
        {order.branch_name && (
          <View className="flex-row items-center mb-2.5">
            <Ionicons name="storefront-outline" size={14} color="#A8A29E" style={{ marginRight: 7 }} />
            <Text className="text-[12px] text-stone-500">{order.branch_name}</Text>
          </View>
        )}

        {/* Footer */}
        <View className="flex-row justify-between items-center pt-3 border-t border-[#F5EDE0]">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={13} color="#A8A29E" style={{ marginRight: 6 }} />
            <Text className="text-[12px] text-stone-500">{formatTime(order.created_at)}</Text>
          </View>
          <View className="bg-[#FFF1E6] px-3 py-1.5 rounded-full border border-[#FED7AA]">
            <Text className="text-[14px] font-extrabold text-[#F97316]">{formatCurrency(order.total)}</Text>
          </View>
        </View>

        {/* Proof action */}
        <View className="mt-3 pt-3 border-t border-dashed border-[#E7E0D8]">
          <TouchableOpacity
            className="bg-[#F97316] py-3.5 rounded-2xl items-center flex-row justify-center"
            style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}
            onPress={() => {
              setProofOrder(order);
              setShowProofModal(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-white font-extrabold text-sm tracking-wide">Take Proof of Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCompletedCard = (order: Order) => (
    <View
      key={order.id}
      className="bg-white rounded-2xl p-3.5 mb-2.5 border border-[#FED7AA] flex-row items-center"
      style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
    >
      <View className="bg-[#F0FDF4] p-2 rounded-xl mr-3 border border-[#BBF7D0]">
        <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
      </View>
      <View className="flex-1">
        <Text className="text-[#7C2D12] text-sm font-extrabold">{order.order_number}</Text>
        <Text className="text-stone-500 text-[11px] mt-0.5">{order.customer_name}</Text>
        <Text className="text-[10px] text-stone-400 mt-0.5">Delivery completed</Text>
      </View>
      <Text className="text-[#16A34A] text-[13px] font-extrabold">{formatCurrency(order.total)}</Text>
    </View>
  );

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
        <Text className="text-white/90 text-[13px] mt-4">Loading deliveries...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      {/* Orange header */}
      <View
        className="bg-[#F97316] rounded-b-[36px]"
        style={{ paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View className="flex-row items-center">
          <View className="w-11 h-11 rounded-2xl bg-white items-center justify-center mr-3"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
          >
            <MaterialIcons name="verified" size={22} color="#F97316" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-white text-lg font-extrabold leading-6">Delivery Proof</Text>
              <Ionicons name="flame" size={15} color="#FFFFFF" style={{ marginLeft: 7 }} />
            </View>
            <Text className="text-white/90 text-[12px] mt-0.5">Confirm completed customer deliveries</Text>
          </View>
        </View>

        <View className="flex-row items-center mt-3">
          <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center"
            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}
          >
            <Ionicons name="camera" size={12} color="#F97316" style={{ marginRight: 5 }} />
            <Text className="text-[#7C2D12] text-[11px] font-extrabold uppercase tracking-wider">
              {pendingProof.length} pending confirmation
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="px-4 pt-4">
        <View className="bg-[#FFF1E6] rounded-2xl p-1.5 border border-[#FED7AA] flex-row">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${selectedTab === 'pending' ? 'bg-[#F97316]' : ''}`}
            style={selectedTab === 'pending' ? { shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 2 } : {}}
            onPress={() => setSelectedTab('pending')}
            activeOpacity={0.7}
          >
            <Text className={`text-[13px] font-extrabold tracking-wide ${selectedTab === 'pending' ? 'text-white' : 'text-[#7C2D12]'}`}>
              Pending ({pendingProof.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${selectedTab === 'completed' ? 'bg-[#F97316]' : ''}`}
            style={selectedTab === 'completed' ? { shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 2 } : {}}
            onPress={() => setSelectedTab('completed')}
            activeOpacity={0.7}
          >
            <Text className={`text-[13px] font-extrabold tracking-wide ${selectedTab === 'completed' ? 'text-white' : 'text-[#7C2D12]'}`}>
              Completed ({proofCompleted.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#F97316" colors={['#F97316']} />
        }
      >
        {selectedTab === 'pending' ? (
          pendingProof.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View
                className="w-28 h-28 rounded-full bg-[#FFF1E6] border border-[#FED7AA] items-center justify-center mb-4"
                style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}
              >
                <Ionicons name="checkmark-done-outline" size={44} color="#16A34A" />
                <View className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-[#F97316] items-center justify-center border-2 border-white">
                  <Ionicons name="flame" size={18} color="#FFFFFF" />
                </View>
              </View>
              <Text className="text-[#7C2D12] text-lg font-extrabold mb-1">All Clear!</Text>
              <Text className="text-stone-500 text-sm text-center px-8">
                No deliveries pending proof of confirmation
              </Text>
            </View>
          ) : (
            pendingProof.map(renderPendingCard)
          )
        ) : (
          proofCompleted.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View
                className="w-24 h-24 rounded-full bg-[#FFF1E6] border border-[#FED7AA] items-center justify-center mb-4"
                style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}
              >
                <Ionicons name="time-outline" size={42} color="#F97316" />
              </View>
              <Text className="text-[#7C2D12] text-lg font-extrabold mb-1">No Completions Yet</Text>
              <Text className="text-stone-500 text-sm text-center px-8">
                Completed deliveries with proof will appear here
              </Text>
            </View>
          ) : (
            proofCompleted.map(renderCompletedCard)
          )
        )}
        <View className="h-24" />
      </ScrollView>

      {/* Proof of Delivery Modal */}
      <ProofOfDelivery
        visible={showProofModal}
        orderId={proofOrder?.id ?? 0}
        orderNumber={proofOrder?.order_number ?? ''}
        customerName={proofOrder?.customer_name ?? ''}
        onSubmit={handleProofSubmit}
        onCancel={handleProofCancel}
      />
    </SafeAreaView>
  );
}