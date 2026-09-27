import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform,
  Modal, StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useCart } from '../../../context/cartContext';
import { useAddress } from '../../../context/addressContext';
import api, { STORAGE_URL } from '../../../lib/api';
import { Image } from 'react-native';

type PaymentMethod = 'cod' | 'gcash';

export default function CheckoutScreen() {
  const { items, branchId, subtotal, clearCart } = useCart();
  const { selectedAddress, openAddressModal } = useAddress();
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);

  const [gcashModalVisible, setGcashModalVisible] = useState(false);
  const [gcashCheckoutUrl, setGcashCheckoutUrl] = useState('');
  const [gcashPolling, setGcashPolling] = useState(false);
  const [gcashWebViewLoading, setGcashWebViewLoading] = useState(true);
  const gcashSourceIdRef = useRef('');
  const gcashOrderIdRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [deliveryFee, setDeliveryFee] = useState(50);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [feeEstimating, setFeeEstimating] = useState(false);
  const total = subtotal + deliveryFee;

  const getAddressText = () => {
    if (!selectedAddress) return '';
    return [selectedAddress.street, selectedAddress.barangay, selectedAddress.city, selectedAddress.province].filter(Boolean).join(', ');
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const quoteDeliveryFee = useCallback(async (lat?: number, lng?: number) => {
    if (!branchId || lat === undefined || lng === undefined) {
      setDeliveryFee(50);
      setDeliveryDistanceKm(null);
      return;
    }
    setFeeEstimating(true);
    try {
      const res = await api.post('/customer/delivery-fee', {
        branch_id: branchId,
        delivery_latitude: lat,
        delivery_longitude: lng,
      });
      setDeliveryFee(Number(res.data?.delivery_fee ?? 50));
      setDeliveryDistanceKm(res.data?.distance_km ? Number(res.data.distance_km) : null);
    } catch {
      setDeliveryFee(50);
      setDeliveryDistanceKm(null);
    } finally {
      setFeeEstimating(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (!selectedAddress) return;
    (async () => {
      let lat: number | undefined = selectedAddress.latitude ?? undefined;
      let lng: number | undefined = selectedAddress.longitude ?? undefined;
      if (lat === undefined || lng === undefined) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch { }
      }
      await quoteDeliveryFee(lat, lng);
    })();
  }, [selectedAddress, quoteDeliveryFee]);

  const handleGcashPayment = useCallback(async (orderId: number) => {
    try {
      const res = await api.post('/payment/gcash/create-source', { order_id: orderId });
      const { checkout_url, source_id } = res.data;

      if (!checkout_url) {
        Alert.alert('Error', 'Failed to get GCash checkout link.');
        return;
      }

      gcashSourceIdRef.current = source_id;
      gcashOrderIdRef.current = String(orderId);
      setGcashCheckoutUrl(checkout_url);
      setGcashModalVisible(true);
      setGcashWebViewLoading(true);

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.get('/payment/gcash/check-status', {
            params: { source_id: gcashSourceIdRef.current },
          });
          const sourceStatus = statusRes.data.status;

          if (sourceStatus === 'chargeable' || sourceStatus === 'paid') {
            clearInterval(pollInterval);
            pollTimerRef.current = null;
            setGcashModalVisible(false);
            clearCart();
            router.replace(`/Customer/OrderDetail?id=${gcashOrderIdRef.current}`);
          } else if (sourceStatus === 'failed' || sourceStatus === 'cancelled') {
            clearInterval(pollInterval);
            pollTimerRef.current = null;
            setGcashModalVisible(false);
            Alert.alert('Payment Failed', 'GCash payment was not completed. You can still pay via Cash on Delivery or try again.');
          }
        } catch {
          // keep polling
        }
      }, 3000);

      pollTimerRef.current = pollInterval;

      setTimeout(() => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setGcashModalVisible(false);
          clearCart();
          router.replace(`/Customer/OrderDetail?id=${gcashOrderIdRef.current}`);
        }
      }, 300000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to initiate GCash payment.';
      Alert.alert('GCash Error', msg);
    }
  }, [clearCart]);

  const placeOrder = async () => {
    const addrText = getAddressText();
    if (!addrText.trim()) {
      Alert.alert('Address Required', 'Please set a delivery address first.');
      return;
    }
    if (!branchId) {
      Alert.alert('Error', 'No branch selected. Go back and select a branch.');
      return;
    }

    setSubmitting(true);

    let deliveryLat: number | undefined = selectedAddress?.latitude ?? undefined;
    let deliveryLng: number | undefined = selectedAddress?.longitude ?? undefined;

    if (deliveryLat === undefined || deliveryLng === undefined) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          deliveryLat = loc.coords.latitude;
          deliveryLng = loc.coords.longitude;
        }
      } catch { }
    }

    await quoteDeliveryFee(deliveryLat, deliveryLng);

    try {
      const payload: Record<string, any> = {
        branch_id: branchId,
        items: items.map(i => ({
          product_id: i.productId,
          quantity: i.quantity,
          price: i.price,
        })),
        delivery_address: addrText,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };
      if (deliveryLat !== undefined) {
        payload.delivery_latitude = deliveryLat;
        payload.delivery_longitude = deliveryLng;
      }

      const response = await api.post('/customer/orders', payload);
      const orderId = response.data.id;

      if (paymentMethod === 'gcash') {
        setSubmitting(false);
        await handleGcashPayment(orderId);
      } else {
        clearCart();
        router.replace(`/Customer/OrderDetail?id=${orderId}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to place order. Please try again.';
      Alert.alert('Order Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />

      {/* Header */}
      <View className="bg-[#FFF7ED] px-4 pt-3 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-2"
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#7C2D12" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-[#7C2D12]">Checkout</Text>
            <Text className="text-[11px] text-[#7C2D12]/60 mt-0.5">
              Review your order and complete payment
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 bg-[#FFF7ED]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Delivery Address */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openAddressModal}
          className="bg-white rounded-3xl p-4 mb-3"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-full bg-[#F97316] items-center justify-center mr-3">
              <Ionicons name="location" size={22} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[#7C2D12] text-[15px] font-extrabold">Delivery Address</Text>
              {selectedAddress ? (
                <>
                  <Text className="text-[#7C2D12]/80 text-[13px] mt-1 leading-5">
                    {getAddressText()}
                  </Text>
                  {selectedAddress.label && (
                    <View className="bg-[#FFF1E6] self-start rounded-full px-2.5 py-1 mt-2 flex-row items-center">
                      <Ionicons name="storefront-outline" size={12} color="#F97316" />
                      <Text className="text-[#F97316] text-[11px] font-bold ml-1">
                        {selectedAddress.label}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text className="text-[#7C2D12]/60 text-[13px] mt-1">
                  Tap to set delivery address
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A8A29E" />
          </View>

          <View className="flex-row items-center justify-end mt-3">
            <View className="bg-[#FFF1E6] rounded-full px-4 py-2 flex-row items-center">
              <Ionicons name="pencil" size={13} color="#F97316" />
              <Text className="text-[#F97316] text-[12px] font-extrabold ml-1.5">Change</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Order Summary */}
        <View
          className="bg-white rounded-3xl p-4 mb-3"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Text className="text-[#7C2D12] text-[16px] font-extrabold mb-3">Order Summary</Text>

          {items.map((item) => (
            <View key={item.productId} className="flex-row items-center mb-3">
              <View className="w-14 h-14 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3 overflow-hidden">
                {item.image ? (
                  <Image
                    source={{
                      uri: `${STORAGE_URL}/${item.image}`,
                    }}
                    style={{ width: 56, height: 56 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="fast-food-outline" size={24} color="#F97316" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[#7C2D12] text-[14px] font-extrabold" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[#7C2D12]/60 text-[11px] mt-0.5">
                  x{item.quantity}
                </Text>
              </View>
              <Text className="text-[#7C2D12] text-[14px] font-extrabold">
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="border-t border-[#FFF1E6] pt-3 mt-1">
            <View className="flex-row justify-between mb-2">
              <Text className="text-[13px] text-[#7C2D12]/70">Subtotal</Text>
              <Text className="text-[13px] text-[#7C2D12] font-semibold">
                ₱{subtotal.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-3 items-center">
              <View className="flex-row items-center">
                <Text className="text-[13px] text-[#7C2D12]/70">Delivery Fee</Text>
                <Ionicons name="information-circle-outline" size={13} color="#A8A29E" style={{ marginLeft: 4 }} />
              </View>
              <View className="flex-row items-center">
                {feeEstimating && (
                  <ActivityIndicator size={12} color="#F97316" style={{ marginRight: 6 }} />
                )}
                <Text className="text-[13px] text-[#7C2D12] font-semibold">
                  ₱{deliveryFee.toFixed(2)}
                  {deliveryDistanceKm !== null ? ` (~${deliveryDistanceKm} km)` : ''}
                </Text>
              </View>
            </View>

            <View className="border-t border-[#FFF1E6] pt-3 flex-row justify-between items-center">
              <Text className="text-[#7C2D12] text-[16px] font-extrabold">Total</Text>
              <Text className="text-[#F97316] text-[20px] font-extrabold">
                ₱{total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View
          className="bg-white rounded-3xl p-4 mb-3"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Text className="text-[#7C2D12] text-[16px] font-extrabold mb-3">Payment Method</Text>

          {/* Cash on Delivery */}
          <TouchableOpacity
            className={`flex-row items-center p-3.5 rounded-2xl mb-3 border ${
              paymentMethod === 'cod' ? 'bg-[#FFF1E6] border-[#F97316]' : 'bg-white border-[#F5F5F5]'
            }`}
            onPress={() => setPaymentMethod('cod')}
            activeOpacity={0.8}
          >
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                paymentMethod === 'cod' ? 'border-[#F97316]' : 'border-[#D1D5DB]'
              }`}
            >
              {paymentMethod === 'cod' && <View className="w-3 h-3 rounded-full bg-[#F97316]" />}
            </View>

            <View className="w-12 h-12 rounded-2xl bg-[#F97316] items-center justify-center mr-3">
              <Ionicons name="cash" size={22} color="#FFFFFF" />
            </View>

            <View className="flex-1">
              <Text className="text-[#7C2D12] text-[14px] font-extrabold">
                Cash on Delivery
              </Text>
              <Text className="text-[#7C2D12]/60 text-[11px] mt-0.5">
                Pay when your order arrives
              </Text>
            </View>
          </TouchableOpacity>

          {/* GCash */}
          <TouchableOpacity
            className={`flex-row items-center p-3.5 rounded-2xl border ${
              paymentMethod === 'gcash' ? 'bg-[#EFF6FF] border-[#3B82F6]' : 'bg-white border-[#F5F5F5]'
            }`}
            onPress={() => setPaymentMethod('gcash')}
            activeOpacity={0.8}
          >
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                paymentMethod === 'gcash' ? 'border-[#3B82F6]' : 'border-[#D1D5DB]'
              }`}
            >
              {paymentMethod === 'gcash' && <View className="w-3 h-3 rounded-full bg-[#3B82F6]" />}
            </View>

            <View className="w-12 h-12 rounded-2xl bg-[#007DFC] items-center justify-center mr-3 overflow-hidden">
              <Image
                source={require('../../../assets/images/GCash.jpeg')}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                resizeMode="cover"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[#7C2D12] text-[14px] font-extrabold">GCash</Text>
              <Text className="text-[#7C2D12]/60 text-[11px] mt-0.5">
                Pay securely with GCash via PayMongo
              </Text>
            </View>
          </TouchableOpacity>

          {paymentMethod === 'gcash' && (
            <View className="bg-[#EFF6FF] rounded-2xl p-3 mt-3 border border-[#BFDBFE]">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={16} color="#2563EB" style={{ marginTop: 1, marginRight: 6 }} />
                <Text className="text-[#1E40AF] text-[12px] flex-1 leading-5">
                  You will be redirected to the GCash checkout page after placing your order. Complete the payment to confirm your order.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Notes */}
        <View
          className="bg-white rounded-3xl p-4 mb-3"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="document-text-outline" size={18} color="#F97316" />
            <Text className="text-[#7C2D12] text-[15px] font-extrabold ml-2">
              Order Notes <Text className="text-[#7C2D12]/50 font-medium">(Optional)</Text>
            </Text>
          </View>

          <TextInput
            className="bg-[#F5F5F5] rounded-2xl px-4 py-3 text-[#7C2D12] text-[13px]"
            placeholder="e.g. Extra sauce, no onions, etc."
            placeholderTextColor="#A8A29E"
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 200))}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 70 }}
          />

          <Text className="text-[#7C2D12]/40 text-[10px] font-medium text-right mt-1">
            {notes.length}/200
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Place Order button */}
      <View
        className="absolute left-0 right-0 bg-[#FFF7ED] px-4 pt-3"
        style={{ bottom: 73, paddingBottom: 12 }}
      >
        <TouchableOpacity
          className={`py-4 rounded-2xl items-center ${
            submitting ? 'bg-[#FED7AA]' : 'bg-[#F97316]'
          }`}
          style={
            submitting
              ? undefined
              : {
                  shadowColor: '#F97316',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  elevation: 6,
                }
          }
          onPress={placeOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View className="flex-row items-center">
                <Text className="text-white font-extrabold text-[16px] mr-1.5">
                  {paymentMethod === 'cod' ? 'Place Order (COD)' : 'Pay with GCash'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
              <Text className="text-white/90 text-[12px] font-medium mt-1">
                Total: ₱{total.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* GCash modal */}
      <Modal
        visible={gcashModalVisible}
        animationType="slide"
        onRequestClose={() => {
          Alert.alert(
            'Cancel Payment?',
            'Are you sure you want to cancel the GCash payment?',
            [
              { text: 'Continue Paying', style: 'cancel' },
              {
                text: 'Cancel',
                style: 'destructive',
                onPress: () => {
                  stopPolling();
                  setGcashModalVisible(false);
                  clearCart();
                  router.replace(`/Customer/OrderDetail?id=${gcashOrderIdRef.current}`);
                },
              },
            ]
          );
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#F5F5F5]">
            <View className="flex-row items-center">
              <Image
                source={require('../../../assets/images/GCash.jpeg')}
                style={{ width: 32, height: 32, resizeMode: 'contain', marginRight: 8 }}
              />
              <Text className="text-base font-extrabold text-[#7C2D12]">GCash Payment</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Cancel Payment?',
                  'Are you sure you want to cancel?',
                  [
                    { text: 'Continue Paying', style: 'cancel' },
                    {
                      text: 'Cancel',
                      style: 'destructive',
                      onPress: () => {
                        stopPolling();
                        setGcashModalVisible(false);
                        clearCart();
                        router.replace(`/Customer/OrderDetail?id=${gcashOrderIdRef.current}`);
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="close" size={24} color="#7C2D12" />
            </TouchableOpacity>
          </View>

          {gcashWebViewLoading && (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#0073E6" />
              <Text className="text-[#7C2D12]/60 mt-3 text-sm">Loading GCash checkout...</Text>
            </View>
          )}

          <WebView
            source={{ uri: gcashCheckoutUrl }}
            style={{ flex: 1 }}
            onLoadEnd={() => setGcashWebViewLoading(false)}
            onNavigationStateChange={(navState) => {
              const url = navState.url;
              if (url.includes('/payment/gcash/success')) {
                stopPolling();
                setGcashModalVisible(false);
                clearCart();
                router.replace(`/Customer/OrderDetail?id=${gcashOrderIdRef.current}`);
              } else if (url.includes('/payment/gcash/failed')) {
                stopPolling();
                setGcashModalVisible(false);
                Alert.alert('Payment Failed', 'GCash payment was not completed.');
              }
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}