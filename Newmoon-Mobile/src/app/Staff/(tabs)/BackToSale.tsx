import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { getUser } from '../../../../lib/userStorage';
import { getBranchIdFromUser } from '../../../../lib/staffContext';

type BackToSaleType = {
  id: number;
  product_id: number;
  branch_id: number;
  quantity: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  returned_at: string;
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
  product_stocks?: { branch_id: number; quantity: number }[];
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

const STATUS_STYLES: Record<BackToSaleType['status'], { badgeBg: string; badgeText: string; label: string; footerIcon: IoniconName }> = {
  pending: { badgeBg: 'bg-[#FEF3C7]', badgeText: 'text-[#D97706]', label: 'Awaiting approval', footerIcon: 'time-outline' },
  approved: { badgeBg: 'bg-[#DCFCE7]', badgeText: 'text-[#16A34A]', label: 'Approved', footerIcon: 'checkmark-circle' },
  rejected: { badgeBg: 'bg-[#FEE2E2]', badgeText: 'text-[#DC2626]', label: 'Rejected', footerIcon: 'close-circle' },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const BackToSaleScreen = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [requestQuantity, setRequestQuantity] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const branchIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    resolveBranchId().then((id) => { branchIdRef.current = id; });
  }, []);

  const getProductStock = (product: any): number => {
    if (!product?.product_stocks || !branchIdRef.current) return 0;
    const stock = product.product_stocks.find(
      (s: any) => String(s.branch_id) === branchIdRef.current
    );
    return stock ? Number(stock.quantity) || 0 : 0;
  };

  // Fetch back-to-sales
  const {
    data: backToSalesData,
    isLoading: backToSalesLoading,
    error: backToSalesError,
    refetch: refetchBackToSales,
  } = useQuery({
    queryKey: ['backToSales'],
    queryFn: async () => {
      const branchId = await resolveBranchId();
      branchIdRef.current = branchId;
      const params: Record<string, any> = {};
      if (branchId) params.branch_id = branchId;
      return api.get('/back-to-sales', { params });
    },
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

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: { product_id: number; branch_id: number; quantity: number; notes: string | null }) => {
      const response = await api.post('/back-to-sales', data);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Product has been returned for sale');
      setShowRequestModal(false);
      setSelectedProduct(null);
      setRequestQuantity('');
      setRequestNotes('');
      queryClient.invalidateQueries({ queryKey: ['backToSales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      console.error('Back-to-Sale error:', error);
      console.error('Error response:', error?.response);
      console.error('Error data:', error?.response?.data);

      let message = 'Failed to submit return';

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
      await refetchBackToSales();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchBackToSales]);

  const backToSales = Array.isArray(backToSalesData?.data?.data) ? backToSalesData.data.data : [];
  const products = Array.isArray(productsData?.data) ? productsData.data : (productsData?.data?.data || []);
  const loading = backToSalesLoading || productsLoading;

  // Compute stats from fetched data
  const totalRecords = backToSales.length;
  const pendingCount = backToSales.filter((r: BackToSaleType) => r.status === 'pending').length;
  const approvedQuantity = backToSales
    .filter((r: BackToSaleType) => r.status === 'approved')
    .reduce((sum: number, r: BackToSaleType) => sum + Number(r.quantity), 0);

  const resolveBranchId = async (): Promise<string | null> => {
    try {
      const user = await getUser();
      const fromUser = getBranchIdFromUser(user);
      if (fromUser) return fromUser;

      const meRes = await api.get('/me');
      const fromMe = getBranchIdFromUser(meRes.data);
      if (fromMe) return fromMe;

      const userId = user?.id || meRes.data?.id;
      if (userId) {
        const assignRes = await api.get('/staff-assignments', {
          params: { user_id: userId, is_active: true, paginate: false },
        });
        const list = assignRes.data?.data || assignRes.data || [];
        const first = Array.isArray(list) ? list[0] : null;
        if (first?.branch_id) return String(first.branch_id);
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleSubmitRequest = async () => {
    const quantity = parseFloat(requestQuantity);

    if (!selectedProduct) {
      Alert.alert('Validation Error', 'Please select a product');
      return;
    }

    const branchId = await resolveBranchId();
    if (!branchId) {
      Alert.alert('Error', 'Could not determine your branch. Please contact admin to assign you to a branch.');
      return;
    }

    if (!requestQuantity || isNaN(quantity) || quantity < 0.5) {
      Alert.alert('Validation Error', 'Please enter a valid quantity (minimum 0.5)');
      return;
    }

    if (quantity > 1000) {
      Alert.alert('Validation Error', 'Maximum return quantity is 1,000');
      return;
    }

    submitMutation.mutate({
      product_id: selectedProduct.id,
      branch_id: Number(branchId),
      quantity: quantity,
      notes: requestNotes.trim() || null,
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
        <Text className="text-stone-500 font-medium mt-4">Loading Back-to-Sales...</Text>
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
              <Text className="text-xl font-extrabold text-[#171717]">Back-to-Sales</Text>
              <Text className="text-sm text-stone-500 mt-0.5">
                Return unsold products to inventory
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
        <View className="flex-row gap-3 px-5 mt-6">
          <View className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]" style={CARD_SHADOW}>
            <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mb-3">
              <Ionicons name="arrow-undo-outline" size={20} color="#EA580C" />
            </View>
            <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
              {totalRecords}
            </Text>
            <Text className="text-[#171717] text-sm font-bold mt-0.5">Total Returns</Text>
            <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Records</Text>
          </View>

          <View className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]" style={CARD_SHADOW}>
            <View className="w-11 h-11 rounded-2xl bg-[#FEF3C7] items-center justify-center mb-3">
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
            </View>
            <Text className="text-[#171717] text-2xl font-extrabold" numberOfLines={1}>
              {pendingCount}
            </Text>
            <Text className="text-[#171717] text-sm font-bold mt-0.5">Pending</Text>
            <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase">Pending Requests</Text>
          </View>
        </View>

        {/* ===== RETURN BUTTON ===== */}
        <View className="px-5 mt-6">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-[#EA580C] rounded-2xl py-4 px-5"
            style={BUTTON_SHADOW}
            onPress={() => setShowRequestModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-undo-outline" size={22} color="#FFFFFF" />
            <Text className="text-white font-extrabold text-base ml-2">Return Product</Text>
          </TouchableOpacity>
        </View>

        {/* ===== RETURN HISTORY ===== */}
        <View className="mt-6">
          <View className="px-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="flame" size={18} color="#EA580C" />
                <View className="ml-2">
                  <Text className="text-xl font-extrabold text-[#171717]">Return History</Text>
                  <Text className="text-sm text-stone-500 mt-0.5">Track your product returns</Text>
                </View>
              </View>
              <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#EA580C] text-[11px] font-bold">{backToSales.length} record(s)</Text>
              </View>
            </View>
          </View>

          <View className="px-5 mt-4">
            {backToSales.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center" style={CARD_SHADOW}>
                <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-4">
                  <Ionicons name="arrow-undo-outline" size={30} color="#EA580C" />
                </View>
                <Text className="text-[#171717] font-bold text-lg">No Returns Yet</Text>
                <Text className="text-stone-500 text-sm mt-2 text-center leading-5">
                  Tap the button above to return a product.
                </Text>
              </View>
            ) : (
              backToSales.map((item: BackToSaleType) => {
                const statusStyle = STATUS_STYLES[item.status];
                return (
                  <View key={item.id} className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]" style={CARD_SHADOW}>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-[#EA580C] text-2xl font-extrabold">
                          {item.quantity} pcs
                        </Text>
                        <Text className="text-stone-500 text-xs mt-1">
                          {item.product?.name || 'Unknown Product'}
                        </Text>
                        <Text className="text-stone-400 text-[11px] mt-0.5">
                          Returned: {formatDate(item.returned_at)}
                        </Text>
                        <Text className="text-stone-400 text-[11px]">
                          Branch: {item.branch?.name || 'Unknown Branch'}
                        </Text>
                      </View>
                      <View className={`${statusStyle.badgeBg} rounded-full px-3 py-1.5`}>
                        <Text className={`${statusStyle.badgeText} text-[10px] font-extrabold uppercase tracking-wide`}>
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {item.notes && (
                      <View className="bg-[#FFFBF5] border border-[#F5EDE0] rounded-2xl p-3 mt-4">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#78716C" />
                          <Text className="text-stone-500 text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Notes</Text>
                        </View>
                        <Text className="text-stone-600 text-sm leading-5">{item.notes}</Text>
                      </View>
                    )}

                    {item.admin_notes && (
                      <View className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-3 mt-3">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                          <Text className="text-[#16A34A] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Admin Note</Text>
                        </View>
                        <Text className="text-green-700 text-sm leading-5">{item.admin_notes}</Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-[#F5EDE0]">
                      {item.status === 'approved' && item.approved_at && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#16A34A" />
                          <Text className="text-[#16A34A] text-xs font-semibold ml-1.5">
                            Approved: {formatDate(item.approved_at)}
                          </Text>
                        </View>
                      )}
                      {item.status === 'rejected' && item.rejected_at && (
                        <View className="flex-row items-center">
                          <Ionicons name={statusStyle.footerIcon} size={15} color="#DC2626" />
                          <Text className="text-[#DC2626] text-xs font-semibold ml-1.5">
                            Rejected: {formatDate(item.rejected_at)}
                          </Text>
                        </View>
                      )}
                      {item.status === 'pending' && (
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
                <Text className="text-[#171717] font-bold text-base">Back-to-Sale Guidelines</Text>
              </View>
            </View>
            <View className="gap-3">
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Returns unsold products in good condition</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Quantity is deducted from branch stock when the return is filed</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">If rejected, the quantity stays out of available inventory</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-[#EA580C] text-sm font-extrabold mr-2">•</Text>
                <Text className="text-stone-600 text-sm leading-5 flex-1">Returns require admin approval</Text>
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
                  <Ionicons name="arrow-undo-outline" size={22} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#171717] text-lg font-extrabold">Return Product</Text>
                  <Text className="text-stone-500 text-xs mt-0.5">Return unsold products to saleable stock.</Text>
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
                      <View className="flex-1 pr-3">
                        <Text className={selectedProduct ? 'text-[#171717] text-base' : 'text-[#A8A29E] text-base'}>
                          {selectedProduct ? selectedProduct.name : 'Select a product'}
                        </Text>
                        {selectedProduct && (
                          <Text className="text-stone-400 text-[11px] mt-0.5">
                            Available stock: {getProductStock(selectedProduct)}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-down" size={18} color="#78716C" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[#171717] font-bold text-sm">
                      Quantity {selectedProduct ? `(Available: ${getProductStock(selectedProduct)})` : ''}
                    </Text>
                  </View>
                  <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4">
                    <TextInput
                      className="py-3.5 text-[#171717] text-base"
                      placeholder={selectedProduct ? `Max ${getProductStock(selectedProduct)}` : 'Enter quantity'}
                      placeholderTextColor="#A8A29E"
                      keyboardType="decimal-pad"
                      value={requestQuantity}
                      onChangeText={setRequestQuantity}
                      editable={!submitMutation.isPending}
                    />
                  </View>
                  <Text className="text-stone-400 text-[11px] mt-2">
                    {selectedProduct
                      ? `Remaining stock: ${getProductStock(selectedProduct)} | Min: 0.5`
                      : 'Min: 0.5 | Max: 1,000'}
                  </Text>
                </View>

                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[#171717] font-bold text-sm">Notes</Text>
                    <Text className="text-stone-400 text-[11px] font-medium ml-2">Optional</Text>
                  </View>
                  <TextInput
                    className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3.5 text-[#171717] text-base"
                    textAlignVertical="top"
                    placeholder="Additional details..."
                    placeholderTextColor="#A8A29E"
                    multiline
                    numberOfLines={3}
                    value={requestNotes}
                    onChangeText={setRequestNotes}
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
                      <Text className="text-white font-extrabold text-base ml-2">Submit Return</Text>
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
                <Ionicons name="arrow-undo-outline" size={22} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#171717] text-lg font-extrabold">Select Product (Stock)</Text>
                <Text className="text-stone-500 text-xs mt-0.5">Choose a product with available stock.</Text>
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
              {products.map((product: any) => {
                const stockQty = getProductStock(product);
                return (
                  <TouchableOpacity
                    key={product.id}
                    className={`flex-row items-center justify-between border-b border-[#F5EDE0] py-3.5 ${selectedProduct?.id === product.id ? 'bg-[#FFF7ED] -mx-5 px-5' : ''}`}
                    onPress={() => {
                      setSelectedProduct(product);
                      setRequestQuantity(stockQty > 0 ? String(stockQty) : '');
                      setShowProductPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-[#171717] font-bold text-[15px]">{product.name}</Text>
                      <Text className="text-stone-500 text-xs mt-0.5">SKU: {product.sku}</Text>
                      <Text className="text-stone-400 text-[11px] mt-0.5">
                        Stock: <Text style={{ color: stockQty > 0 ? '#16A34A' : '#DC2626' }}>{stockQty}</Text>
                        {' | '}{product.category}
                      </Text>
                    </View>
                    <View className="items-end ml-2">
                      {stockQty > 0 && (
                        <Text className="text-green-600 text-[11px] mb-1 font-semibold">{stockQty} available</Text>
                      )}
                      {stockQty === 0 && (
                        <Text className="text-[#DC2626] text-[11px] mb-1">Out of stock</Text>
                      )}
                      {selectedProduct?.id === product.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#EA580C" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {products.length === 0 && (
                <View className="py-10 items-center">
                  <Ionicons name="arrow-undo-outline" size={28} color="#A8A29E" />
                  <Text className="text-stone-500 text-sm mt-2">No products available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BackToSaleScreen;