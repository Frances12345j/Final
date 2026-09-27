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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';

type Supply = {
  name: string;
  value: string;
  default_unit: string | null;
};

type SupplyRequest = {
  id: number;
  user_id: number;
  branch_id: number;
  supply: string;
  supply_name: string;
  quantity: number;
  unit: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  branch: { id: number; name: string } | null;
  approver: { id: number; full_name: string } | null;
  rejecter: { id: number; full_name: string } | null;
};

type Statistics = {
  total_requested: number;
  pending: number;
  approved: number;
  rejected: number;
  total_quantity_approved: number;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const UNITS = [
  'pcs', 'sacks', 'rolls', 'packs', 'bottles',
  'boxes', 'bags', 'kits', 'liters', 'kilograms', 'drums', 'sets',
];

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

const STATUS_STYLES: Record<
  SupplyRequest['status'],
  { badgeBg: string; badgeText: string; footerIcon: IoniconName }
> = {
  pending: { badgeBg: 'bg-[#FEF3C7]', badgeText: 'text-[#D97706]', footerIcon: 'time-outline' },
  approved: { badgeBg: 'bg-[#DCFCE7]', badgeText: 'text-[#16A34A]', footerIcon: 'checkmark-circle' },
  rejected: { badgeBg: 'bg-[#FEE2E2]', badgeText: 'text-[#DC2626]', footerIcon: 'close-circle' },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const SupplyRequestScreen = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSupplyPicker, setShowSupplyPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [requestQuantity, setRequestQuantity] = useState('');
  const [requestUnit, setRequestUnit] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: requestsData,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['supplyRequests'],
    queryFn: () => api.get('/supply-requests'),
  });

  const { data: suppliesData, isLoading: suppliesLoading } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => api.get('/supplies'),
  });

  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['supplyRequestStatistics'],
    queryFn: () => api.get('/supply-requests/statistics'),
  });

  const submitMutation = useMutation({
    mutationFn: async (data: {
      supply: string;
      quantity: number;
      unit: string;
      reason: string | null;
    }) => {
      const response = await api.post('/supply-requests', data);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Your supply request has been submitted');
      setShowRequestModal(false);
      setSelectedSupply(null);
      setRequestQuantity('');
      setRequestUnit('');
      setRequestReason('');
      queryClient.invalidateQueries({ queryKey: ['supplyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['supplyRequestStatistics'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to submit request';
      Alert.alert('Error', message);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchRequests(), refetchStats()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchRequests, refetchStats]);

  const requests: SupplyRequest[] = requestsData?.data?.data || [];
  const supplies: Supply[] = suppliesData?.data || [];
  const loading = requestsLoading || statsLoading || suppliesLoading;

  const pickSupply = (supply: Supply) => {
    setSelectedSupply(supply);
    setRequestUnit(supply.default_unit || requestUnit || 'pcs');
    setShowSupplyPicker(false);
  };

  const handleSubmitRequest = () => {
    const quantity = parseFloat(requestQuantity);

    if (!selectedSupply) {
      Alert.alert('Validation Error', 'Please select a supply');
      return;
    }

    if (!requestQuantity || isNaN(quantity) || quantity <= 0) {
      Alert.alert('Validation Error', 'Quantity must be a number greater than 0');
      return;
    }

    if (!requestUnit) {
      Alert.alert('Validation Error', 'Please select a unit');
      return;
    }

    submitMutation.mutate({
      supply: selectedSupply.value,
      quantity,
      unit: requestUnit,
      reason: requestReason.trim() || null,
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
        <Text className="text-stone-500 font-medium mt-4">Loading Supply Requests...</Text>
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
                  Operational Supplies
                </Text>
              </View>
              <Text className="text-xl font-extrabold text-[#171717]">Supply Requests</Text>
              <Text className="text-sm text-stone-500 mt-0.5">
                Request charcoal, foil, bulsita, sauce and other branch supplies
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
                <Ionicons name="flask-outline" size={20} color="#EA580C" />
              </View>
              <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
                {statistics.data.total_requested}
              </Text>
              <Text className="text-[#171717] text-sm font-bold mt-0.5">Total Requests</Text>
              <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Submitted</Text>
            </View>

            <View className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]" style={CARD_SHADOW}>
              <View className="w-11 h-11 rounded-2xl bg-[#FEF3C7] items-center justify-center mb-3">
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
                {statistics.data.pending}
              </Text>
              <Text className="text-[#171717] text-sm font-bold mt-0.5">Pending</Text>
              <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Awaiting Review</Text>
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
            <Text className="text-white font-extrabold text-base ml-2">Request Supply</Text>
          </TouchableOpacity>
        </View>

        {/* ===== YOUR REQUESTS ===== */}
        <View className="mt-6">
          <View className="px-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="flask" size={18} color="#EA580C" />
                <View className="ml-2">
                  <Text className="text-xl font-extrabold text-[#171717]">Your Requests</Text>
                  <Text className="text-sm text-stone-500 mt-0.5">Track your supply requests</Text>
                </View>
              </View>
              <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#EA580C] text-[11px] font-bold">{requests.length} request(s)</Text>
              </View>
            </View>
          </View>

          <View className="px-5 mt-4">
            {requests.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center" style={CARD_SHADOW}>
                <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-4">
                  <Ionicons name="flask-outline" size={30} color="#EA580C" />
                </View>
                <Text className="text-[#171717] font-bold text-lg">No Requests Yet</Text>
                <Text className="text-stone-500 text-sm mt-2 text-center leading-5">
                  Tap &quot;Request Supply&quot; to submit your first request.
                </Text>
              </View>
            ) : (
              requests.map((request) => {
                const statusStyle = STATUS_STYLES[request.status];
                return (
                  <View
                    key={request.id}
                    className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]"
                    style={CARD_SHADOW}
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-[#EA580C] text-2xl font-extrabold">
                          {Number(request.quantity).toLocaleString()} {request.unit}
                        </Text>
                        <Text className="text-stone-500 text-xs mt-1">
                          {request.supply_name || 'Unknown Supply'}
                        </Text>
                        <Text className="text-stone-400 text-[11px] mt-0.5">
                          Req #{String(request.id).padStart(3, '0')} &middot; {formatDate(request.requested_at)}
                        </Text>
                        <Text className="text-stone-400 text-[11px]">
                          Branch: {request.branch?.name || 'Unknown Branch'}
                        </Text>
                      </View>
                      <View className={`${statusStyle.badgeBg} rounded-full px-3 py-1.5`}>
                        <Text className={`${statusStyle.badgeText} text-[10px] font-extrabold uppercase tracking-wide`}>
                          {request.status}
                        </Text>
                      </View>
                    </View>

                    {request.reason && (
                      <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 mt-4">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="document-text-outline" size={16} color="#EA580C" />
                          <Text className="text-[#EA580C] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">
                            Reason
                          </Text>
                        </View>
                        <Text className="text-stone-600 text-sm leading-5">{request.reason}</Text>
                      </View>
                    )}

                    {request.admin_notes && (
                      <View
                        className={`rounded-2xl p-3 mt-3 border ${request.status === 'rejected'
                          ? 'bg-[#FEF2F2] border-[#FECACA]'
                          : 'bg-[#F0FDF4] border-[#BBF7D0]'
                          }`}
                      >
                        <View className="flex-row items-center mb-1">
                          <Ionicons
                            name={request.status === 'rejected' ? 'close-circle-outline' : 'checkmark-circle-outline'}
                            size={16}
                            color={request.status === 'rejected' ? '#DC2626' : '#16A34A'}
                          />
                          <Text
                            className={`text-[10px] font-extrabold uppercase tracking-wider ml-1.5 ${request.status === 'rejected' ? 'text-[#DC2626]' : 'text-[#16A34A]'
                              }`}
                          >
                            {request.status === 'rejected' ? 'Rejection Reason' : 'Admin Note'}
                          </Text>
                        </View>
                        <Text
                          className={`text-sm leading-5 ${request.status === 'rejected' ? 'text-red-700' : 'text-green-700'
                            }`}
                        >
                          {request.admin_notes}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-[#F5EDE0]">
                      {request.status === 'approved' && request.approved_at && (
                        <View className="flex-row items-center flex-1">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#16A34A" />
                          <Text className="text-[#16A34A] text-xs font-semibold ml-1.5 flex-1">
                            Approved {formatDate(request.approved_at)}
                          </Text>
                          {request.approver?.full_name && (
                            <Text className="text-stone-400 text-[11px]" numberOfLines={1}>
                              by {request.approver.full_name}
                            </Text>
                          )}
                        </View>
                      )}
                      {request.status === 'rejected' && request.rejected_at && (
                        <View className="flex-row items-center flex-1">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#DC2626" />
                          <Text className="text-[#DC2626] text-xs font-semibold ml-1.5 flex-1">
                            Rejected {formatDate(request.rejected_at)}
                          </Text>
                          {request.rejecter?.full_name && (
                            <Text className="text-stone-400 text-[11px]" numberOfLines={1}>
                              by {request.rejecter.full_name}
                            </Text>
                          )}
                        </View>
                      )}
                      {request.status === 'pending' && (
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
                <Text className="text-[#171717] font-bold text-base">Supply Request Guidelines</Text>
              </View>
            </View>
            <View className="gap-3">
              {[
                'Operational supplies only: charcoal, foil, bulsita, sauce, and other',
                'Quantity must be greater than 0',
                'Your branch is assigned automatically from your staff record',
                'Stock requests (lechon, liempo) are made in the Stock Requests tab',
              ].map((line, i) => (
                <View key={i} className="flex-row items-start">
                  <Ionicons
                    name="ellipse"
                    size={7}
                    color="#EA580C"
                    style={{ marginTop: 6, marginRight: 8 }}
                  />
                  <Text className="text-stone-600 text-sm leading-5 flex-1">{line}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ===== FOOTER BRANDING ===== */}
        <View className="items-center mt-6 pt-5 mx-5 border-t border-[#FED7AA]">
          <Text className="text-[#451A03] text-sm font-extrabold tracking-wide mt-1">NEWMOON</Text>
          <Text className="text-[#EA580C] text-[9px] font-bold uppercase tracking-[1.5px] mt-0.5">
            Lechon Manok &amp; Liempo House
          </Text>
          <Text className="text-stone-400 text-[10px] font-semibold mt-1.5">Fresh from the Grill</Text>
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
                  <Ionicons name="flask-outline" size={22} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#171717] text-lg font-extrabold">Request Supply</Text>
                  <Text className="text-stone-500 text-xs mt-0.5">
                    Enter the quantity and reason for your request.
                  </Text>
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

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="mb-4">
                  <Text className="text-[#171717] font-bold text-sm mb-2">Supply</Text>
                  <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4">
                    <TouchableOpacity
                      className="flex-row items-center justify-between py-3.5"
                      onPress={() => setShowSupplyPicker(true)}
                      disabled={submitMutation.isPending}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={
                          selectedSupply ? 'text-[#171717] text-base' : 'text-[#A8A29E] text-base'
                        }
                      >
                        {selectedSupply ? selectedSupply.name : 'Select a supply'}
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
                  <Text className="text-stone-400 text-[11px] mt-2">Must be greater than 0</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-[#171717] font-bold text-sm mb-2">Unit</Text>
                  <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4">
                    <TouchableOpacity
                      className="flex-row items-center justify-between py-3.5"
                      onPress={() => setShowUnitPicker(true)}
                      disabled={submitMutation.isPending}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={requestUnit ? 'text-[#171717] text-base' : 'text-[#A8A29E] text-base'}
                      >
                        {requestUnit || 'Select a unit'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#78716C" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[#171717] font-bold text-sm">Reason / Remarks</Text>
                    <Text className="text-stone-400 text-[11px] font-medium ml-2">Optional</Text>
                  </View>
                  <TextInput
                    className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3.5 text-[#171717] text-base"
                    textAlignVertical="top"
                    placeholder="Why do you need this supply?"
                    placeholderTextColor="#A8A29E"
                    multiline
                    numberOfLines={3}
                    value={requestReason}
                    onChangeText={setRequestReason}
                    editable={!submitMutation.isPending}
                    maxLength={500}
                  />
                  <Text className="text-stone-400 text-[11px] mt-2 self-end">Max 500 characters</Text>
                </View>

                {/* ===== REQUEST ACTIONS ===== */}
                <TouchableOpacity
                  onPress={handleSubmitRequest}
                  disabled={submitMutation.isPending}
                  className={`flex-row items-center justify-center bg-[#EA580C] rounded-2xl py-4 px-5 ${submitMutation.isPending ? 'opacity-70' : ''
                    }`}
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

      {/* ===== SUPPLY PICKER MODAL ===== */}
      <Modal
        visible={showSupplyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSupplyPicker(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setShowSupplyPicker(false)}
          />
          <View className="bg-white rounded-t-[28px] px-5 pt-3 pb-6" style={{ maxHeight: '70%' }}>
            <View className="w-10 h-1 bg-[#FED7AA] rounded-full self-center mb-4" />

            <View className="flex-row items-start mb-4">
              <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="flask-outline" size={22} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#171717] text-lg font-extrabold">Select Supply</Text>
                <Text className="text-stone-500 text-xs mt-0.5">Choose an operational supply.</Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-[#FFF7ED] border border-[#FED7AA] items-center justify-center ml-2"
                onPress={() => setShowSupplyPicker(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {supplies.map((supply) => (
                <TouchableOpacity
                  key={supply.value}
                  className={`flex-row items-center justify-between border-b border-[#F5EDE0] py-3.5 ${selectedSupply?.value === supply.value ? 'bg-[#FFF7ED] -mx-5 px-5' : ''
                    }`}
                  onPress={() => pickSupply(supply)}
                  activeOpacity={0.7}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-[#171717] font-bold text-[15px]">{supply.name}</Text>
                    {supply.default_unit && (
                      <Text className="text-stone-400 text-[11px]">Default unit: {supply.default_unit}</Text>
                    )}
                  </View>
                  {selectedSupply?.value === supply.value && (
                    <Ionicons name="checkmark-circle" size={22} color="#EA580C" />
                  )}
                </TouchableOpacity>
              ))}
              {supplies.length === 0 && (
                <View className="py-10 items-center">
                  <Ionicons name="flask-outline" size={28} color="#A8A29E" />
                  <Text className="text-stone-500 text-sm mt-2">No supplies available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== UNIT PICKER MODAL ===== */}
      <Modal
        visible={showUnitPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setShowUnitPicker(false)}
          />
          <View className="bg-white rounded-t-[28px] px-5 pt-3 pb-6" style={{ maxHeight: '70%' }}>
            <View className="w-10 h-1 bg-[#FED7AA] rounded-full self-center mb-4" />

            <View className="flex-row items-start mb-4">
              <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="cube-outline" size={22} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#171717] text-lg font-extrabold">Select Unit</Text>
                <Text className="text-stone-500 text-xs mt-0.5">How is it measured?</Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-[#FFF7ED] border border-[#FED7AA] items-center justify-center ml-2"
                onPress={() => setShowUnitPicker(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap" style={{ maxHeight: 320 }}>
              <FlatList
                data={UNITS}
                numColumns={3}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`m-1.5 px-3 py-2.5 rounded-xl border ${requestUnit === item
                      ? 'bg-[#EA580C] border-[#EA580C]'
                      : 'bg-[#FFF7ED] border-[#FED7AA]'
                      }`}
                    onPress={() => {
                      setRequestUnit(item);
                      setShowUnitPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-bold capitalize ${requestUnit === item ? 'text-white' : 'text-[#451A03]'
                        }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

export default SupplyRequestScreen;