import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';

type StockOutRequest = {
  id: number;
  product_id: number;
  branch_id: number;
  quantity: number;
  reason: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  pulled_out_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
  product: {
    id: number;
    name: string;
    sku: string;
  };
  branch: {
    id: number;
    name: string;
  };
};

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
};

type Statistics = {
  total_pulled_out: number;
  total_quantity: number;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STOCK_OUT_REASONS = [
  'Sales',
  'Damage',
  'Spoilage',
  'Expired',
  'Wastage',
  'Breakage',
];

const REASON_COLORS: Record<string, string> = {
  Sales: '#16A34A',
  Damage: '#DC2626',
  'Pull-out': '#EA580C',
  Spoilage: '#65A30D',
  Expired: '#B45309',
  Wastage: '#4B5563',
  Breakage: '#DC2626',
  Adjustment: '#2563EB',
  Other: '#6B7280',
};

const CARD_SHADOW = {
  shadowColor: '#451A03',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
} as const;

const BUTTON_SHADOW = {
  shadowColor: '#EA580C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 3,
} as const;

const STATUS_STYLES: Record<StockOutRequest['status'], { badgeBg: string; badgeText: string; label: string; footerIcon: IoniconName }> = {
  pending: { badgeBg: 'bg-[#FEF3C7]', badgeText: 'text-[#D97706]', label: 'Awaiting admin approval', footerIcon: 'time-outline' },
  approved: { badgeBg: 'bg-[#DCFCE7]', badgeText: 'text-[#16A34A]', label: 'Approved', footerIcon: 'checkmark-circle' },
  rejected: { badgeBg: 'bg-[#FEE2E2]', badgeText: 'text-[#DC2626]', label: 'Rejected', footerIcon: 'close-circle' },
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatQty = (q: number | string) => {
  const n = Number(q);
  if (isNaN(n)) return String(q);
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const StockOutScreen = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [requestQuantity, setRequestQuantity] = useState('');
  const [requestReason, setRequestReason] = useState('Sales');
  const [requestNotes, setRequestNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stock-out requests
  const {
    data: stockOutsData,
    isLoading: stockOutsLoading,
    error: PullOutsError,
    refetch: refetchStockOuts,
  } = useQuery({
    queryKey: ['stockOuts'],
    queryFn: () => api.get('/pull-outs'),
  });

  // Fetch products
  const {
    data: productsData,
    isLoading: productsLoading,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return { data: response.data?.data ?? [] };
    },
  });

  // Fetch statistics
  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['stockOutStatistics'],
    queryFn: () => api.get('/pull-outs/statistics'),
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: { product_id: number; quantity: number; reason: string; notes: string | null }) => {
      const response = await api.post('/pull-outs', data);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Pull out request submitted for approval');
      setShowRequestModal(false);
      setSelectedProduct(null);
      setRequestQuantity('');
      setRequestReason('Sales');
      setRequestNotes('');
      queryClient.invalidateQueries({ queryKey: ['stockOuts'] });
      queryClient.invalidateQueries({ queryKey: ['stockOutStatistics'] });
    },
    onError: (error: any) => {
      console.warn('Pull out request error:', error?.message || error);

      let message = 'Failed to submit pull out request';

      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
      } else if (error?.message) {
        message = error.message;
      }

      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat();
        if (errorMessages.length > 0) {
          message = errorMessages.join(', ');
        }
      }

      Alert.alert('Error', message);
    },
  });

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStockOuts(),
        refetchStats(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchStockOuts, refetchStats]);

  const stockOuts = Array.isArray(stockOutsData?.data?.data) ? stockOutsData.data.data : [];
  const products = Array.isArray(productsData?.data) ? productsData.data : (productsData?.data?.data || []);
  const loading = stockOutsLoading || statsLoading || productsLoading;

  const handleSubmitRequest = async () => {
    const quantity = parseFloat(requestQuantity);

    if (!selectedProduct) {
      Alert.alert('Validation Error', 'Please select a product');
      return;
    }

    if (!requestQuantity || isNaN(quantity) || quantity < 0.01) {
      Alert.alert('Validation Error', 'Please enter a valid quantity (minimum 0.01)');
      return;
    }

    if (quantity > 1000) {
      Alert.alert('Validation Error', 'Maximum stock-out quantity is 1,000');
      return;
    }

    submitMutation.mutate({
      product_id: selectedProduct.id,
      quantity: quantity,
      reason: requestReason,
      notes: requestNotes.trim() || null,
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
        <Text className="text-stone-500 font-medium mt-4">Loading Pull Out...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" translucent={false} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#EA580C']}
            tintColor="#EA580C"
            title="Pull to refresh..."
            titleColor="#A8A29E"
          />
        }
      >
        {/* ===== LIGHT HEADER ===== */}
        <View className="px-5 pt-2 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Ionicons name="flame" size={13} color="#EA580C" />
                <Text className="text-[#EA580C] text-[10px] font-extrabold tracking-widest uppercase ml-1">
                  Inventory Management
                </Text>
              </View>
              <Text className="text-xl font-extrabold text-[#171717]">Pull Out</Text>
              <Text className="text-sm text-stone-500 mt-0.5">
                Request items to be removed from inventory
              </Text>
            </View>

            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#FED7AA] ml-3"
              style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={17} color="#451A03" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== SUMMARY STATS ===== */}
        {statistics?.data && (
          <View className="flex-row gap-3 px-5 mt-6">
            <View className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]" style={CARD_SHADOW}>
              <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mb-3">
                <Ionicons name="cube-outline" size={20} color="#EA580C" />
              </View>
              <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
                {formatQty(statistics.data.total_quantity)}
              </Text>
              <Text className="text-[#171717] text-sm font-bold mt-0.5">Total Requested</Text>
              <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Units</Text>
            </View>

            <View className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]" style={CARD_SHADOW}>
              <View className="w-11 h-11 rounded-2xl bg-[#FEF3C7] items-center justify-center mb-3">
                <Ionicons name="albums-outline" size={20} color="#F59E0B" />
              </View>
              <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
                {formatQty(statistics.data.total_pulled_out)}
              </Text>
              <Text className="text-[#171717] text-sm font-bold mt-0.5">Total Requests</Text>
              <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Records</Text>
            </View>
          </View>
        )}

        {/* ===== REQUEST BUTTON ===== */}
        <View className="px-5 mt-6">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-[#EA580C] rounded-2xl py-4 px-5"
            style={BUTTON_SHADOW}
            onPress={() => setShowRequestModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text className="text-white font-extrabold text-base ml-2">New Pull Out Request</Text>
          </TouchableOpacity>
        </View>

        {/* ===== PULL OUT REQUESTS ===== */}
        <View className="mt-6">
          <View className="px-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="flame" size={18} color="#EA580C" />
                <View className="ml-2">
                  <Text className="text-xl font-extrabold text-[#171717]">Pull Out Requests</Text>
                  <Text className="text-sm text-stone-500 mt-0.5">Track your pull out requests</Text>
                </View>
              </View>
              <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#EA580C] text-[11px] font-bold">{stockOuts.length} record(s)</Text>
              </View>
            </View>
          </View>

          <View className="px-5 mt-4">
            {stockOuts.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center" style={CARD_SHADOW}>
                <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-4">
                  <Ionicons name="remove-circle-outline" size={30} color="#EA580C" />
                </View>
                <Text className="text-[#171717] font-bold text-lg">No Requests Yet</Text>
                <Text className="text-stone-500 text-sm mt-2 text-center leading-5">
                  Tap the button above to request a pull out.
                </Text>
              </View>
            ) : (
              stockOuts.map((stockOut: StockOutRequest) => {
                const statusStyle = STATUS_STYLES[stockOut.status];
                return (
                  <View key={stockOut.id} className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]" style={CARD_SHADOW}>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-[#EA580C] text-2xl font-extrabold">
                          -{formatQty(stockOut.quantity)} pcs
                        </Text>
                        <Text className="text-stone-500 text-xs mt-1">
                          {stockOut.product?.name || 'Unknown Product'}
                        </Text>
                        <Text className="text-stone-400 text-[11px] mt-0.5">
                          Requested: {formatDate(stockOut.pulled_out_at)}
                        </Text>
                        <Text className="text-stone-400 text-[11px]">
                          Branch: {stockOut.branch?.name || 'Unknown Branch'}
                        </Text>
                      </View>
                      <View className={`${statusStyle.badgeBg} rounded-full px-3 py-1.5`}>
                        <Text className={`${statusStyle.badgeText} text-[10px] font-extrabold uppercase tracking-wide`}>
                          {stockOut.status}
                        </Text>
                      </View>
                    </View>

                    {stockOut.reason && (
                      <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 mt-4">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="document-text-outline" size={16} color="#EA580C" />
                          <Text className="text-[#EA580C] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Reason</Text>
                        </View>
                        <Text className="text-sm leading-5 font-bold" style={{ color: REASON_COLORS[stockOut.reason] || '#57534E' }}>
                          {stockOut.reason}
                        </Text>
                      </View>
                    )}

                    {stockOut.notes && (
                      <View className="bg-[#FFFBF5] border border-[#F5EDE0] rounded-2xl p-3 mt-3">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#78716C" />
                          <Text className="text-stone-500 text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Notes</Text>
                        </View>
                        <Text className="text-stone-600 text-sm leading-5">{stockOut.notes}</Text>
                      </View>
                    )}

                    {stockOut.admin_notes && (
                      <View className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-3 mt-3">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                          <Text className="text-[#16A34A] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Admin Note</Text>
                        </View>
                        <Text className="text-green-700 text-sm leading-5">{stockOut.admin_notes}</Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-[#F5EDE0]">
                      {stockOut.status === 'approved' && stockOut.approved_at && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#16A34A" />
                          <Text className="text-[#16A34A] text-xs font-semibold ml-1.5">
                            Approved: {formatDate(stockOut.approved_at)}
                          </Text>
                        </View>
                      )}
                      {stockOut.status === 'rejected' && stockOut.rejected_at && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#DC2626" />
                          <Text className="text-[#DC2626] text-xs font-semibold ml-1.5">
                            Rejected: {formatDate(stockOut.rejected_at)}
                          </Text>
                        </View>
                      )}
                      {stockOut.status === 'pending' && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#D97706" />
                          <Text className="text-[#D97706] text-xs font-semibold ml-1.5">
                            Awaiting admin approval
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ===== GUIDELINES ===== */}
        <View className="px-5 mt-4 mb-2">
          <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-3xl p-5">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="information-circle-outline" size={20} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#171717] font-bold text-base">Pull Out Guidelines</Text>
              </View>
            </View>
            <View className="gap-3">
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Pull out requests are for items leaving the inventory</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Choose a reason (sales, damage, pull-out, etc.)</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Stock is reduced once the admin approves your request</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== FOOTER BRANDING ===== */}
        <View className="items-center mt-6 pt-5 mx-5 border-t border-[#FED7AA]">
          <Text className="text-[#EA580C] text-xl">🔥</Text>
          <Text className="text-[#451A03] text-sm font-extrabold tracking-wide mt-1">NEWMOON</Text>
          <Text className="text-[#EA580C] text-[9px] font-bold uppercase tracking-[1.5px] mt-0.5">Lechon Manok &amp; Liempo House</Text>
          <Text className="text-stone-400 text-[10px] font-semibold mt-1.5">Fresh from the Roasted</Text>
        </View>
      </ScrollView>

      {/* ===== REQUEST MODAL ===== */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setShowRequestModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View className="bg-white rounded-t-[28px] px-5 pt-3 pb-6" style={{ maxHeight: '90%' }}>
              <View className="w-10 h-1 bg-[#FED7AA] rounded-full self-center mb-4" />

              <View className="flex-row items-start mb-5">
                <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                  <Ionicons name="remove-circle-outline" size={22} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#171717] text-lg font-extrabold">New Pull Out Request</Text>
                  <Text className="text-stone-500 text-xs mt-0.5">Record items being removed from inventory.</Text>
                </View>
                <TouchableOpacity
                  className="w-9 h-9 rounded-full bg-[#FFF7ED] border border-[#FED7AA] items-center justify-center ml-2"
                  onPress={() => setShowRequestModal(false)}
                  disabled={submitMutation.isPending}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color="#78716C" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
                <View className="mb-4">
                  <Text className="text-[#171717] font-bold text-sm mb-2">Product</Text>
                  <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4">
                    <TouchableOpacity
                      className="flex-row items-center justify-between py-3.5"
                      onPress={() => setShowProductPicker(true)}
                      disabled={submitMutation.isPending}
                      activeOpacity={0.7}
                    >
                      <Text className={selectedProduct ? 'text-[#171717] text-base' : 'text-[#A8A29E] text-base'}>
                        {selectedProduct ? selectedProduct.name : 'Select a product'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#78716C" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-[#171717] font-bold text-sm mb-2">Quantity</Text>
                  <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4">
                    <TextInput
                      className="py-3.5 text-[#171717] text-base"
                      placeholder="Enter quantity"
                      placeholderTextColor="#A8A29E"
                      keyboardType="decimal-pad"
                      value={requestQuantity}
                      onChangeText={setRequestQuantity}
                      editable={!submitMutation.isPending}
                    />
                  </View>
                  <Text className="text-stone-400 text-[11px] mt-2">Minimum 0.01 • Maximum 1,000</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-[#171717] font-bold text-sm mb-2">Reason</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {STOCK_OUT_REASONS.map((reason) => {
                      const selected = requestReason === reason;
                      return (
                        <TouchableOpacity
                          key={reason}
                          onPress={() => setRequestReason(reason)}
                          activeOpacity={0.7}
                          className={`px-3.5 py-2 rounded-full border ${selected ? '' : 'bg-[#FFF7ED] border-[#FED7AA]'}`}
                          style={selected ? { backgroundColor: REASON_COLORS[reason] || '#EA580C', borderColor: REASON_COLORS[reason] || '#EA580C' } : undefined}
                        >
                          <Text className={selected ? 'text-white text-xs font-bold' : 'text-stone-500 text-xs font-semibold'}>
                            {reason}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[#171717] font-bold text-sm">Notes</Text>
                    <Text className="text-stone-400 text-[11px] font-medium ml-2">Optional</Text>
                  </View>
                  <TextInput
                    className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3.5 text-[#171717] text-base"
                    textAlignVertical="top"
                    placeholder="Additional details about the pull out..."
                    placeholderTextColor="#A8A29E"
                    multiline
                    numberOfLines={3}
                    value={requestNotes}
                    onChangeText={setRequestNotes}
                    editable={!submitMutation.isPending}
                    maxLength={1000}
                  />
                  <Text className="text-stone-400 text-[11px] mt-2 self-end">Max 1000 characters</Text>
                </View>

                <TouchableOpacity
                  onPress={handleSubmitRequest}
                  disabled={submitMutation.isPending}
                  className={`flex-row items-center justify-center bg-[#EA580C] rounded-2xl py-4 px-5 ${submitMutation.isPending ? 'opacity-70' : ''}`}
                  style={BUTTON_SHADOW}
                  activeOpacity={0.85}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                      <Text className="text-white font-extrabold text-base ml-2">Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="mt-3 py-3 items-center bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl"
                  onPress={() => setShowRequestModal(false)}
                  disabled={submitMutation.isPending}
                  activeOpacity={0.7}
                >
                  <Text className="text-[#78716C] font-semibold">Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ===== PRODUCT PICKER MODAL ===== */}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setShowProductPicker(false)}
          />
          <View className="bg-white rounded-t-[28px] px-5 pt-3 pb-6" style={{ maxHeight: '70%' }}>
            <View className="w-10 h-1 bg-[#FED7AA] rounded-full self-center mb-4" />

            <View className="flex-row items-start mb-4">
              <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="remove-circle-outline" size={22} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#171717] text-lg font-extrabold">Select Product</Text>
                <Text className="text-stone-500 text-xs mt-0.5">Choose the product to pull out.</Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-[#FFF7ED] border border-[#FED7AA] items-center justify-center ml-2"
                onPress={() => setShowProductPicker(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {products.map((product: Product) => (
                <TouchableOpacity
                  key={product.id}
                  className={`flex-row items-center justify-between border-b border-[#F5EDE0] py-3.5 ${selectedProduct?.id === product.id ? 'bg-[#FFF7ED] -mx-5 px-5' : ''}`}
                  onPress={() => {
                    setSelectedProduct(product);
                    setShowProductPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-[#171717] font-bold text-[15px]">{product.name}</Text>
                    <Text className="text-stone-500 text-xs mt-0.5">SKU: {product.sku}</Text>
                    <Text className="text-stone-400 text-[11px]">{product.category}</Text>
                  </View>
                  {selectedProduct?.id === product.id && (
                    <Ionicons name="checkmark-circle" size={22} color="#EA580C" />
                  )}
                </TouchableOpacity>
              ))}
              {products.length === 0 && (
                <View className="py-10 items-center">
                  <Ionicons name="remove-circle-outline" size={28} color="#A8A29E" />
                  <Text className="text-stone-500 text-sm mt-2">No products available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

export default StockOutScreen;