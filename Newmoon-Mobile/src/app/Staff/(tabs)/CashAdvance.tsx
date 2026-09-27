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

type CashAdvance = {
  id: number;
  amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
};

type Statistics = {
  total_requested: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_approved: number;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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

const STATUS_STYLES: Record<CashAdvance['status'], { badgeBg: string; badgeText: string; label: string; footerIcon: IoniconName }> = {
  pending: { badgeBg: 'bg-[#FEF3C7]', badgeText: 'text-[#D97706]', label: 'Awaiting approval', footerIcon: 'time-outline' },
  approved: { badgeBg: 'bg-[#DCFCE7]', badgeText: 'text-[#16A34A]', label: 'Approved', footerIcon: 'checkmark-circle' },
  rejected: { badgeBg: 'bg-[#FEE2E2]', badgeText: 'text-[#DC2626]', label: 'Rejected', footerIcon: 'close-circle' },
};

const formatCurrency = (amount: number | string) => {
  const n = Number(amount);
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const CashAdvanceScreen = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: advancesData,
    isLoading: advancesLoading,
    error: advancesError,
    refetch: refetchAdvances,
  } = useQuery({
    queryKey: ['cashAdvances'],
    queryFn: () => api.get('/cash-advances'),
  });

  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['cashAdvanceStatistics'],
    queryFn: () => api.get('/cash-advances/statistics'),
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { amount: number; reason: string | null }) => {
      const response = await api.post('/cash-advances', data);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Your cash advance request has been submitted');
      setShowRequestModal(false);
      setRequestAmount('');
      setRequestReason('');
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['cashAdvanceStatistics'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to submit request';
      Alert.alert('Error', message);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAdvances(),
        refetchStats(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAdvances, refetchStats]);

  const advances = advancesData?.data?.data || [];
  const loading = advancesLoading || statsLoading;

  const handleSubmitRequest = async () => {
    const amount = parseFloat(requestAmount);

    if (!requestAmount || isNaN(amount) || amount < 100) {
      Alert.alert('Validation Error', 'Please enter a valid amount (minimum ₱100)');
      return;
    }

    if (amount > 10000) {
      Alert.alert('Validation Error', 'Maximum advance amount is ₱10,000');
      return;
    }

    submitMutation.mutate({
      amount: amount,
      reason: requestReason.trim() || null,
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
        <Text className="text-stone-500 font-medium mt-4">Loading Cash Advances...</Text>
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
              <Text className="text-xl font-extrabold text-[#171717]">Cash Advance</Text>
              <Text className="text-sm text-stone-500 mt-0.5">Request and track your salary advances</Text>
            </View>

            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#FED7AA] ml-2"
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
                <Ionicons name="cash-outline" size={20} color="#EA580C" />
              </View>
              <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
                {formatCurrency(statistics.data.total_amount_approved)}
              </Text>
              <Text className="text-[#171717] text-sm font-bold mt-0.5">Total Approved</Text>
              <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Approved</Text>
            </View>

            <View className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]" style={CARD_SHADOW}>
              <View className="w-11 h-11 rounded-2xl bg-[#FEF3C7] items-center justify-center mb-3">
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
                {statistics.data.pending}
              </Text>
              <Text className="text-[#171717] text-sm font-bold mt-0.5">Pending</Text>
              <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Pending Requests</Text>
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
            <Text className="text-white font-extrabold text-base ml-2">Request Cash Advance</Text>
          </TouchableOpacity>
        </View>

        {/* ===== YOUR REQUESTS ===== */}
        <View className="mt-6">
          <View className="px-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="flame" size={18} color="#EA580C" />
                <View className="ml-2">
                  <Text className="text-xl font-extrabold text-[#171717]">Your Requests</Text>
                  <Text className="text-sm text-stone-500 mt-0.5">Track your cash advance requests</Text>
                </View>
              </View>
              <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#EA580C] text-[11px] font-bold">{advances.length} request(s)</Text>
              </View>
            </View>
          </View>

          <View className="px-5 mt-4">
            {advances.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center" style={CARD_SHADOW}>
                <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-4">
                  <Ionicons name="receipt-outline" size={30} color="#EA580C" />
                </View>
                <Text className="text-[#171717] font-bold text-lg">No Requests Yet</Text>
                <Text className="text-stone-500 text-sm mt-2 text-center leading-5">
                  Tap &quot;Request Cash Advance&quot; to submit your first request.
                </Text>
              </View>
            ) : (
              advances.map((advance: CashAdvance) => {
                const statusStyle = STATUS_STYLES[advance.status];
                return (
                  <View key={advance.id} className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]" style={CARD_SHADOW}>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-[#EA580C] text-2xl font-extrabold">
                          {formatCurrency(advance.amount)}
                        </Text>
                        <Text className="text-stone-500 text-xs mt-1">
                          Requested: {formatDate(advance.requested_at)}
                        </Text>
                      </View>
                      <View className={`${statusStyle.badgeBg} rounded-full px-3 py-1.5`}>
                        <Text className={`${statusStyle.badgeText} text-[10px] font-extrabold uppercase tracking-wide`}>
                          {advance.status}
                        </Text>
                      </View>
                    </View>

                    {advance.reason && (
                      <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 mt-4">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="document-text-outline" size={16} color="#EA580C" />
                          <Text className="text-[#EA580C] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Reason</Text>
                        </View>
                        <Text className="text-stone-600 text-sm leading-5">{advance.reason}</Text>
                      </View>
                    )}

                    {advance.admin_notes && (
                      <View className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-3 mt-3">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                          <Text className="text-[#16A34A] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Admin Note</Text>
                        </View>
                        <Text className="text-green-700 text-sm leading-5">{advance.admin_notes}</Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-[#F5EDE0]">
                      {advance.status === 'approved' && advance.approved_at && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#16A34A" />
                          <Text className="text-[#16A34A] text-xs font-semibold ml-1.5">
                            Approved: {formatDate(advance.approved_at)}
                          </Text>
                        </View>
                      )}
                      {advance.status === 'rejected' && advance.rejected_at && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#DC2626" />
                          <Text className="text-[#DC2626] text-xs font-semibold ml-1.5">
                            Rejected: {formatDate(advance.rejected_at)}
                          </Text>
                        </View>
                      )}
                      {advance.status === 'pending' && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#D97706" />
                          <Text className="text-[#D97706] text-xs font-semibold ml-1.5">
                            Awaiting approval
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
                <Text className="text-[#171717] font-bold text-base">Cash Advance Guidelines</Text>
              </View>
            </View>
            <View className="gap-3">
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Minimum advance amount: ₱100</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Maximum advance amount: ₱10,000</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Advances are deducted from your monthly salary</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Approval is subject to admin discretion</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== FOOTER BRANDING ===== */}
        <View className="items-center mt-6 pt-5 mx-5 border-t border-[#FED7AA]">
          <Text className="text-[#EA580C] text-xl">🔥</Text>
          <Text className="text-[#451A03] text-sm font-extrabold tracking-wide mt-1">NEWMOON</Text>
          <Text className="text-[#EA580C] text-[9px] font-bold uppercase tracking-[1.5px] mt-0.5">Lechon Manok &amp; Liempo</Text>
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
                  <Ionicons name="cash" size={22} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#171717] text-lg font-extrabold">Request Cash Advance</Text>
                  <Text className="text-stone-500 text-xs mt-0.5">Enter the amount and reason for your request.</Text>
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
                  <Text className="text-[#171717] font-bold text-sm mb-2">Amount</Text>
                  <View className="flex-row items-center bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4">
                    <Text className="text-[#EA580C] text-lg font-extrabold mr-2">₱</Text>
                    <TextInput
                      className="flex-1 py-3.5 text-[#171717] text-base"
                      placeholder="Enter amount"
                      placeholderTextColor="#A8A29E"
                      keyboardType="decimal-pad"
                      value={requestAmount}
                      onChangeText={setRequestAmount}
                      editable={!submitMutation.isPending}
                    />
                  </View>
                  <Text className="text-stone-400 text-[11px] mt-2">Minimum ₱100 • Maximum ₱10,000</Text>
                </View>

                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[#171717] font-bold text-sm">Reason</Text>
                    <Text className="text-stone-400 text-[11px] font-medium ml-2">Optional</Text>
                  </View>
                  <TextInput
                    className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3.5 text-[#171717] text-base"
                    textAlignVertical="top"
                    placeholder="Why do you need this advance?"
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
    </SafeAreaView>
  );
};

export default CashAdvanceScreen;