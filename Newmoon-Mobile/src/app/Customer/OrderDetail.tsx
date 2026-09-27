import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api, { listenToOrder } from '../../../lib/api';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  total: number;
  product: { id: number; name: string };
}

interface AssignedRider {
  id: number;
  firstname: string;
  lastname: string;
  full_name: string;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  gcash_reference: string | null;
  created_at: string;
  rider_id: number | null;
  rider: AssignedRider | null;
  branch: {
    id: number;
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  };
  items: OrderItem[];
}

const STATUS_FLOW: Record<string, { label: string; icon: string; color: string; step: number }> = {
  pending: { label: 'Order Placed', icon: 'receipt-outline', color: '#F59E0B', step: 0 },
  confirmed: { label: 'Confirmed', icon: 'checkmark-circle-outline', color: '#3B82F6', step: 1 },
  preparing: { label: 'Preparing', icon: 'flame-outline', color: '#8B5CF6', step: 2 },
  ready: { label: 'Ready for Pickup', icon: 'checkmark-circle', color: '#10B981', step: 3 },
  picked_up: { label: 'Picked Up', icon: 'bicycle-outline', color: '#06B6D4', step: 4 },
  out_for_delivery: { label: 'Out for Delivery', icon: 'bicycle-outline', color: '#F97316', step: 5 },
  delivered: { label: 'Delivered', icon: 'checkmark-done', color: '#10B981', step: 6 },
  cancelled: { label: 'Cancelled', icon: 'close-circle', color: '#EF4444', step: -1 },
};

const MINI_MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0}
    html,body{height:100%;width:100%;overflow:hidden;background:#f3f4f6}
    #map{height:100%;width:100%;background:#f3f4f6}
    .leaflet-control-attribution{font-size:7px !important;background:rgba(255,255,255,0.7) !important;padding:0 3px !important}
    .leaflet-control-attribution a{color:#666 !important}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
  (function(){
    var map=L.map('map',{
      zoomControl:false,
      attributionControl:true,
      dragging:false,
      scrollWheelZoom:false,
      touchZoom:false,
      doubleClickZoom:false,
      boxZoom:false,
      keyboard:false,
      tap:false
    }).setView([14.56,121.02],13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'\\u00a9 OSM'
    }).addTo(map);

    function makeIcon(color, glyph){
      return L.divIcon({
        html:'<div style="width:30px;height:30px;background:'+color+';border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1">'+glyph+'</div>',
        iconSize:[30,30],
        iconAnchor:[15,15],
        className:''
      });
    }

    var branchIcon=makeIcon('#F97316','🏪');
    var riderIcon=makeIcon('#F97316','🛵');
    var destIcon=makeIcon('#EF4444','🏠');

    window.__markers=[];
    window.__route=null;

    window.__setData=function(branchLat,branchLng,destLat,destLng,riderLat,riderLng){
      window.__markers.forEach(function(m){map.removeLayer(m);});
      window.__markers=[];
      if(window.__route){map.removeLayer(window.__route);window.__route=null;}

      var points=[];

      if(branchLat&&branchLng){
        var bm=L.marker([branchLat,branchLng],{icon:branchIcon}).addTo(map);
        window.__markers.push(bm);
        points.push([branchLat,branchLng]);
      }
      if(riderLat&&riderLng){
        var rm=L.marker([riderLat,riderLng],{icon:riderIcon}).addTo(map);
        window.__markers.push(rm);
        points.push([riderLat,riderLng]);
      }
      if(destLat&&destLng){
        var dm=L.marker([destLat,destLng],{icon:destIcon}).addTo(map);
        window.__markers.push(dm);
        points.push([destLat,destLng]);
      }

      if(points.length>=2){
        window.__route=L.polyline(points,{
          color:'#F97316',
          weight:4,
          opacity:0.85,
          dashArray:'8,6',
          lineJoin:'round',
          lineCap:'round'
        }).addTo(map);
      }

      if(points.length===1){
        map.setView(points[0],14);
      }else if(points.length>=2){
        map.fitBounds(points,{padding:[30,30],maxZoom:15});
      }
      setTimeout(function(){map.invalidateSize();},80);
    };

    setTimeout(function(){map.invalidateSize();},200);
    setTimeout(function(){map.invalidateSize();},600);
  })();
  </script>
</body>
</html>`;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [branchPos, setBranchPos] = useState<{ lat: number; lng: number } | null>(null);
  const [destPos, setDestPos] = useState<{ lat: number; lng: number } | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const fetchInFlight = useRef(false);
  const mapWebViewRef = useRef<WebView>(null);

  const loadOrder = useCallback(async (isRefresh = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      if (isRefresh) setRefreshing(true);
      const response = await api.get(`/customer/orders/${id}`);
      const data = response.data;
      setOrder(data);

      // Extract delivery coordinates
      const dLat = data.delivery_latitude != null ? Number(data.delivery_latitude) : null;
      const dLng = data.delivery_longitude != null ? Number(data.delivery_longitude) : null;
      if (dLat && dLng && !isNaN(dLat) && !isNaN(dLng)) {
        setDestPos({ lat: dLat, lng: dLng });
      }

      // Extract branch coordinates
      const bLat = data.branch?.latitude != null ? Number(data.branch.latitude) : null;
      const bLng = data.branch?.longitude != null ? Number(data.branch.longitude) : null;
      if (bLat && bLng && !isNaN(bLat) && !isNaN(bLng)) {
        setBranchPos({ lat: bLat, lng: bLng });
      }
    } catch (err) {
      if (!isRefresh) {
        Alert.alert('Error', 'Failed to load order');
        router.back();
      }
    } finally {
      fetchInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadOrder();
      const unsubscribe = listenToOrder(id, '.OrderStatusUpdated', (data) => {
        if (data?.order_id && String(data.order_id) === String(id)) {
          loadOrder();
        }
      });

      const pollInterval = setInterval(() => {
        loadOrder();
      }, 3000);

      return () => {
        unsubscribe();
        clearInterval(pollInterval);
      };
    }
  }, [id, loadOrder]);

  // Poll rider position when out for delivery
  useEffect(() => {
    if (!id) return;
    if (order?.status !== 'picked_up' && order?.status !== 'out_for_delivery') return;

    const fetchRider = async () => {
      try {
        const res = await api.get(`/customer/orders/${id}/track`);
        const lat = res.data?.latitude != null ? Number(res.data.latitude) : null;
        const lng = res.data?.longitude != null ? Number(res.data.longitude) : null;
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          setRiderPos({ lat, lng });
        }
      } catch { }
    };

    fetchRider();
    const iv = setInterval(fetchRider, 5000);
    return () => clearInterval(iv);
  }, [id, order?.status]);

  // Push updated positions into the mini map whenever they change
  useEffect(() => {
    if (!mapWebViewRef.current) return;
    const bLat = branchPos?.lat ?? null;
    const bLng = branchPos?.lng ?? null;
    const dLat = destPos?.lat ?? null;
    const dLng = destPos?.lng ?? null;
    const rLat = riderPos?.lat ?? null;
    const rLng = riderPos?.lng ?? null;
    mapWebViewRef.current.injectJavaScript(
      `if(window.__setData){window.__setData(${bLat},${bLng},${dLat},${dLng},${rLat},${rLng})}true;`
    );
  }, [branchPos, destPos, riderPos]);

  const cancelOrder = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await api.post(`/customer/orders/${id}/cancel`);
            await loadOrder();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const statusInfo = STATUS_FLOW[order.status] || STATUS_FLOW.pending;
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isOutForDelivery = order.status === 'out_for_delivery';
  const riderName = order.rider?.full_name?.trim() || [order.rider?.firstname, order.rider?.lastname].filter(Boolean).join(' ');

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      {/* Header */}
      <View className="bg-[#FFF7ED] px-4 py-4">
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
            <Text className="text-2xl font-extrabold text-[#7C2D12]">Order Details</Text>
            <Text className="text-xs text-[#7C2D12]/60 mt-0.5">Order #{order.order_number}</Text>
          </View>

          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#7C2D12" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 bg-[#FFF7ED]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadOrder(true)} tintColor="#F97316" colors={['#F97316']} />
        }
      >
        {/* Status banner */}
        <View className="bg-[#FFF1E6] rounded-3xl p-4 mb-3 flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-[#F97316] items-center justify-center mr-3">
            <FontAwesome5 name="motorcycle" size={24} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-[#7C2D12] text-lg font-extrabold">{statusInfo.label}</Text>
            <Text className="text-[#7C2D12]/70 text-[12px] mt-0.5">
              {statusInfo.step >= 5 ? 'Your food is on the way! 🔥' : 'We\'re preparing your order'}
            </Text>
          </View>
          <View className="bg-[#FED7AA] rounded-2xl px-3 py-2 items-center">
            <Text className="text-[#7C2D12]/70 text-[9px] font-bold uppercase tracking-wider">ETA</Text>
            <Text className="text-[#7C2D12] text-[15px] font-extrabold mt-0.5">15–20 min</Text>
          </View>
        </View>

        {/* Map preview — real Leaflet map */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(`/Customer/RiderTracking?id=${order.id}`)}
          className="bg-white rounded-3xl mb-3 overflow-hidden"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="w-full h-40">
            <WebView
              ref={mapWebViewRef}
              style={{ flex: 1, backgroundColor: '#f3f4f6' }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              pointerEvents="none"
              source={{ html: MINI_MAP_HTML }}
              onLoadEnd={() => {
                const bLat = branchPos?.lat ?? null;
                const bLng = branchPos?.lng ?? null;
                const dLat = destPos?.lat ?? null;
                const dLng = destPos?.lng ?? null;
                const rLat = riderPos?.lat ?? null;
                const rLng = riderPos?.lng ?? null;
                mapWebViewRef.current?.injectJavaScript(
                  `if(window.__setData){window.__setData(${bLat},${bLng},${dLat},${dLng},${rLat},${rLng})}true;`
                );
              }}
            />

            {/* Tap-to-track overlay */}
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              <View
                className="bg-white/95 rounded-full px-3 py-1.5 flex-row items-center"
                style={{
                  shadowColor: '#7C2D12',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Ionicons name="expand" size={12} color="#F97316" />
                <Text className="text-[#7C2D12] text-[10px] font-extrabold ml-1">Tap to track live</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Rider card */}
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
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mr-3">
              <FontAwesome5 name="motorcycle" size={26} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-[#7C2D12] text-[17px] font-extrabold" numberOfLines={1}>
                {riderName || 'Assigning rider…'}
              </Text>
              <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">
                {order.rider ? 'Assigned pickup rider' : 'Waiting for rider assignment'}
              </Text>
              {order.rider && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                  <Text className="text-[#7C2D12]/70 text-[11px] font-bold ml-1">Assigned to this order</Text>
                </View>
              )}
            </View>

            {order.rider && (
              <View className="flex-row items-start">
                <View className="items-center mr-3">
                  <TouchableOpacity
                    className="w-11 h-11 rounded-full bg-[#DCFCE7] items-center justify-center"
                    activeOpacity={0.8}
                    onPress={() => router.push(`/Customer/orderChat?orderId=${order.id}`)}
                  >
                    <Ionicons name="call" size={18} color="#16A34A" />
                  </TouchableOpacity>
                  <Text className="text-[#7C2D12]/70 text-[10px] font-bold mt-1.5">Call</Text>
                </View>

                <View className="items-center">
                  <TouchableOpacity
                    className="w-11 h-11 rounded-full bg-[#F5F5F5] items-center justify-center"
                    activeOpacity={0.8}
                    onPress={() => router.push(`/Customer/orderChat?orderId=${order.id}`)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color="#7C2D12" />
                  </TouchableOpacity>
                  <Text className="text-[#7C2D12]/70 text-[10px] font-bold mt-1.5">Message</Text>
                </View>
              </View>
            )}
          </View>

          {order.rider && (
            <TouchableOpacity
              className="bg-[#F97316] rounded-2xl py-4 mt-4 flex-row items-center justify-center"
              style={{
                shadowColor: '#F97316',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              }}
              activeOpacity={0.85}
              onPress={() => router.push(`/Customer/RiderTracking?id=${order.id}`)}
            >
              <Ionicons name="location" size={18} color="#FFFFFF" />
              <Text className="text-white font-extrabold text-[15px] ml-2">Track Order</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Order Items */}
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
          <Text className="text-[#7C2D12] text-[16px] font-extrabold mb-3">Order Items</Text>

          {order.items.map((item) => (
            <View key={item.id} className="flex-row items-center mb-3">
              <View className="w-14 h-14 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="fast-food-outline" size={24} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-[#7C2D12] text-[14px] font-extrabold" numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text className="text-[#7C2D12]/60 text-[11px] mt-0.5">x{item.quantity}</Text>
              </View>
              <Text className="text-[#7C2D12] text-[14px] font-extrabold">
                ₱{Number(item.total).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="border-t border-[#FFF1E6] pt-3 mt-1">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[13px] text-[#7C2D12]/70">Subtotal</Text>
              <Text className="text-[13px] text-[#7C2D12] font-semibold">₱{Number(order.subtotal).toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[13px] text-[#7C2D12]/70">Delivery Fee</Text>
              <Text className="text-[13px] text-[#7C2D12] font-semibold">₱{Number(order.delivery_fee).toFixed(2)}</Text>
            </View>
            <View className="bg-[#FFF1E6] rounded-2xl px-3 py-3 flex-row justify-between items-center mt-2">
              <Text className="text-[#7C2D12] text-[15px] font-extrabold">Total</Text>
              <Text className="text-[#7C2D12] text-[18px] font-extrabold">
                ₱{Number(order.total).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment method — dynamic icon */}
        <View
          className="bg-white rounded-3xl p-4 mb-3 flex-row items-center"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {order.payment_method === 'gcash' ? (
            <View className="w-12 h-12 rounded-2xl bg-[#007DFC] items-center justify-center mr-3">
              <Text className="text-white text-[10px] font-extrabold">GCash</Text>
            </View>
          ) : (
            <View className="w-12 h-12 rounded-2xl bg-[#F97316] items-center justify-center mr-3">
              <Ionicons name="cash" size={22} color="#FFFFFF" />
            </View>
          )}

          <View className="flex-1">
            <Text className="text-[#7C2D12]/60 text-[11px] font-bold uppercase tracking-wider">
              Payment Method
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-[#7C2D12] text-[15px] font-extrabold">
                {order.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'}
              </Text>
              {order.payment_status === 'paid' && (
                <View className="bg-[#DCFCE7] rounded-full px-2 py-0.5 ml-2">
                  <Text className="text-[#16A34A] text-[10px] font-extrabold">Paid</Text>
                </View>
              )}
              {order.payment_method !== 'gcash' && order.payment_status !== 'paid' && (
                <View className="bg-[#FFF1E6] rounded-full px-2 py-0.5 ml-2">
                  <Text className="text-[#F97316] text-[10px] font-extrabold">Pay on Delivery</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A8A29E" />
        </View>

        {/* Delivery address */}
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
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-[#FFF1E6] items-center justify-center mr-3">
              <Ionicons name="location" size={18} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-[#7C2D12] text-[14px] font-extrabold">Delivery Address</Text>
              <Text className="text-[#7C2D12]/70 text-[12px] mt-1 leading-5">
                {order.delivery_address}
              </Text>
            </View>
            <TouchableOpacity
              className="border border-[#F97316] rounded-full px-3 py-1.5 flex-row items-center"
              activeOpacity={0.7}
              onPress={() => router.push(`/Customer/RiderTracking?id=${order.id}`)}
            >
              <Ionicons name="map-outline" size={13} color="#F97316" />
              <Text className="text-[#F97316] text-[11px] font-bold ml-1">View Map</Text>
            </TouchableOpacity>
          </View>

          <View className="border-t border-[#FFF1E6] mt-3 pt-3 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#FFF1E6] items-center justify-center mr-3">
              <Ionicons name="storefront" size={18} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-[#7C2D12]/60 text-[11px] font-bold uppercase tracking-wider">
                Branch
              </Text>
              <Text className="text-[#7C2D12] text-[13px] font-extrabold mt-0.5">
                {order.branch.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A8A29E" />
          </View>
        </View>

        {/* Bottom action buttons */}
        <View className="flex-row mb-4 gap-2">
          <TouchableOpacity
            className="flex-1 border border-[#F97316] rounded-2xl py-3.5 flex-row items-center justify-center bg-white"
            onPress={() => router.push(`/Customer/orderChat?orderId=${order.id}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#F97316" />
            <Text className="text-[#F97316] font-extrabold text-[13px] ml-2">Chat with Rider</Text>
          </TouchableOpacity>

          {canCancel ? (
            <TouchableOpacity
              className="flex-1 bg-red-50 border border-red-300 rounded-2xl py-3.5 flex-row items-center justify-center"
              onPress={cancelOrder}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close" size={18} color="#EF4444" />
                  <Text className="text-[#EF4444] font-extrabold text-[13px] ml-2">Cancel Order</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-1 bg-[#FFF1E6] rounded-2xl py-3.5 flex-row items-center justify-center"
              onPress={() => router.push(`/Customer/RiderTracking?id=${order.id}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={18} color="#F97316" />
              <Text className="text-[#F97316] font-extrabold text-[13px] ml-2">Track Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}