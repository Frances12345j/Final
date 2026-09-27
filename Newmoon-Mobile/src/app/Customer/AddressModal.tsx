import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  Alert, ActivityIndicator, Platform, Animated, KeyboardAvoidingView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../../../lib/api';

type Address = {
  id?: number;
  label?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: Address) => void;
  selectedAddress?: Address | null;
};

type ViewMode = 'list' | 'form' | 'map';

const MAP_HTML = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #f3f4f6; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-zoom a { background: #fff; color: #7C2D12; border-color: #FED7AA; font-weight: 800; }
    .leaflet-control-zoom { border: none; border-radius: 12px; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }

    .center-marker {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000;
      pointer-events: none;
      font-size: 36px;
      color: #F97316;
      text-shadow: 0 2px 6px rgba(124,45,18,0.35);
      line-height: 1;
    }
    .center-marker::before {
      content: "📍";
      font-size: 36px;
    }
    .center-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999;
      pointer-events: none;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #F97316;
      box-shadow: 0 0 6px rgba(249,115,22,0.9);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-marker"></div>
  <div class="center-dot"></div>
  <script>
    var map = L.map('map', {
      center: [${lat}, ${lng}],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var sendTimeout = null;
    function sendCenter() {
      if (sendTimeout) clearTimeout(sendTimeout);
      sendTimeout = setTimeout(function() {
        var center = map.getCenter();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          latitude: center.lat.toFixed(7),
          longitude: center.lng.toFixed(7),
        }));
      }, 100);
    }
    map.whenReady(function() { setTimeout(sendCenter, 200); });
    map.on('moveend', sendCenter);
    map.on('zoomend', sendCenter);
  </script>
</body>
</html>
`;

export default function AddressModal({ visible, onClose, onSelect, selectedAddress }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Address>({
    label: '', street: '', barangay: '', city: '', province: '',
    latitude: null, longitude: null,
  });
  const [mapLat, setMapLat] = useState(14.5995);
  const [mapLng, setMapLng] = useState(120.9842);
  const [mapKey, setMapKey] = useState(0);
  const [mapHtml, setMapHtml] = useState(MAP_HTML(14.5995, 120.9842));
  const [isMapVisible, setIsMapVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setViewMode('list');
      setEditingId(null);
      loadAddresses();
    }
  }, [visible]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/addresses');
      if (isMounted.current) setAddresses(res.data || []);
    } catch {
      // ignore
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const animateTo = (mode: ViewMode) => {
    Animated.timing(slideAnim, {
      toValue: mode === 'list' ? 0 : mode === 'form' ? 1 : 2,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setViewMode(mode);
    setIsMapVisible(mode === 'map');
  };

  const openMap = (lat: number, lng: number) => {
    setMapLat(lat);
    setMapLng(lng);
    setMapHtml(MAP_HTML(lat, lng));
    setMapKey(prev => prev + 1);
    animateTo('map');
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = geocode[0] || {};
      setForm({
        label: 'Current Location',
        street: [addr.street, addr.name, addr.district].filter(Boolean).join(', '),
        barangay: addr.subregion || '',
        city: addr.city || addr.subregion || '',
        province: addr.region || '',
        latitude,
        longitude,
      });
      openMap(latitude, longitude);
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      if (isMounted.current) setGettingLocation(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ label: '', street: '', barangay: '', city: '', province: '', latitude: null, longitude: null });
    animateTo('form');
  };

  const openEditForm = (addr: Address) => {
    setEditingId(addr.id || null);
    setForm({
      label: addr.label || '',
      street: addr.street || '',
      barangay: addr.barangay || '',
      city: addr.city || '',
      province: addr.province || '',
      latitude: addr.latitude,
      longitude: addr.longitude,
    });
    if (addr.latitude && addr.longitude) {
      setMapLat(Number(addr.latitude));
      setMapLng(Number(addr.longitude));
    }
    animateTo('form');
  };

  const handleSave = async () => {
    if (!form.street?.trim() && !form.city?.trim()) {
      Alert.alert('Required', 'Please enter at least a street and city.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/addresses/${editingId}`, form);
      } else {
        await api.post('/addresses', form);
      }
      await loadAddresses();
      animateTo('list');
    } catch {
      Alert.alert('Error', 'Failed to save address.');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = (addr: Address) => {
    Alert.alert('Delete Address', `Remove "${addr.label || 'this address'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/addresses/${addr.id}`);
            loadAddresses();
          } catch {
            Alert.alert('Error', 'Failed to delete address.');
          }
        },
      },
    ]);
  };

  const handleMapConfirm = () => {
    setForm(prev => ({ ...prev, latitude: mapLat, longitude: mapLng }));
    geocodeMapPoint(mapLat, mapLng);
    animateTo('form');
  };

  const geocodeMapPoint = async (lat: number, lng: number) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const addr = geocode[0] || {};
      if (isMounted.current) {
        setForm(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          street: prev.street || [addr.street, addr.name, addr.district].filter(Boolean).join(', '),
          barangay: prev.barangay || addr.subregion || '',
          city: prev.city || addr.city || '',
          province: prev.province || addr.region || '',
        }));
      }
    } catch {
      if (isMounted.current) setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.latitude && data.longitude) {
        const newLat = Number(data.latitude);
        const newLng = Number(data.longitude);
        if (Math.abs(newLat - mapLat) > 0.000001 || Math.abs(newLng - mapLng) > 0.000001) {
          setMapLat(newLat);
          setMapLng(newLng);
        }
      }
    } catch {}
  };

  const handleSelectAddress = (addr: Address) => {
    onSelect(addr);
    onClose();
  };

  const getAddressText = (addr: Address) => {
    return [addr.street, addr.barangay, addr.city, addr.province].filter(Boolean).join(', ');
  };

  // ─────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────
  const renderList = () => (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View className="bg-[#FFF7ED] px-4 pt-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#7C2D12" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-[#7C2D12] text-2xl font-extrabold">
              Delivery Address
            </Text>
            <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">
              Where should we deliver?
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 bg-[#FFF7ED]" showsVerticalScrollIndicator={false}>
        {/* Use current location */}
        <TouchableOpacity
          onPress={handleUseCurrentLocation}
          disabled={gettingLocation}
          activeOpacity={0.85}
          className="bg-white rounded-3xl p-4 mb-3 flex-row items-center"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="w-12 h-12 rounded-full bg-[#FFF1E6] items-center justify-center mr-3">
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <Ionicons name="locate" size={22} color="#F97316" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[#7C2D12] text-[15px] font-extrabold">
              Use My Current Location
            </Text>
            <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">
              GPS-based delivery address
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#A8A29E" />
        </TouchableOpacity>

        {/* Section divider */}
        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-[#FED7AA]" />
          <Text className="text-[#7C2D12]/50 text-[10px] mx-3 uppercase font-extrabold tracking-wider">
            Saved Addresses
          </Text>
          <View className="flex-1 h-px bg-[#FED7AA]" />
        </View>

        {loading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : addresses.length === 0 ? (
          <View
            className="bg-white rounded-3xl p-6 items-center mb-3"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3">
              <Ionicons name="location-outline" size={28} color="#F97316" />
            </View>
            <Text className="text-[#7C2D12]/60 text-[13px] font-medium">
              No saved addresses yet
            </Text>
          </View>
        ) : (
          addresses.map((addr) => {
            const isSelected = selectedAddress?.id === addr.id;
            const isDefault = addr.is_default;
            return (
              <TouchableOpacity
                key={addr.id}
                onPress={() => handleSelectAddress(addr)}
                activeOpacity={0.85}
                className="bg-white rounded-3xl p-4 mb-3 flex-row items-center"
                style={{
                  shadowColor: '#7C2D12',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: isSelected ? '#F97316' : 'transparent',
                }}
              >
                <View className="w-11 h-11 rounded-full bg-[#FFF1E6] items-center justify-center mr-3">
                  <Ionicons name="home" size={20} color="#F97316" />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-[#7C2D12] text-[14px] font-extrabold" numberOfLines={1}>
                      {addr.label || 'Address'}
                    </Text>
                    {isDefault && (
                      <View className="bg-[#FFF1E6] px-2 py-0.5 rounded-full ml-2">
                        <Text className="text-[#F97316] text-[10px] font-extrabold">Default</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5 leading-4" numberOfLines={2}>
                    {getAddressText(addr)}
                  </Text>
                  {addr.latitude && addr.longitude && (
                    <Text className="text-[#7C2D12]/40 text-[10px] mt-1">
                      {Number(addr.latitude).toFixed(5)}, {Number(addr.longitude).toFixed(5)}
                    </Text>
                  )}
                </View>

                {isSelected ? (
                  <View className="w-8 h-8 rounded-full bg-[#F97316] items-center justify-center mr-1">
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => openEditForm(addr)}
                      className="w-8 h-8 rounded-full bg-[#FFF1E6] items-center justify-center mr-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="create-outline" size={15} color="#F97316" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(addr)}
                      className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* Add new */}
        <TouchableOpacity
          onPress={openAddForm}
          activeOpacity={0.85}
          className="rounded-3xl p-4 mb-6 border-2 border-dashed border-[#FDBA74] flex-row items-center justify-center bg-white/60"
        >
          <View className="w-8 h-8 rounded-full bg-[#FFF1E6] items-center justify-center mr-2">
            <Ionicons name="add" size={18} color="#F97316" />
          </View>
          <Text className="text-[#F97316] text-[14px] font-extrabold">Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ─────────────────────────────────────────────
  // FORM VIEW
  // ─────────────────────────────────────────────
  const renderForm = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-[#FFF7ED] px-4 pt-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => animateTo('list')}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#7C2D12" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-[#7C2D12] text-2xl font-extrabold">
              {editingId ? 'Edit Address' : 'New Address'}
            </Text>
            <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">
              {editingId ? 'Update your delivery info' : 'Add your delivery info'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 bg-[#FFF7ED]" showsVerticalScrollIndicator={false}>
        {/* Label */}
        <View className="mb-3">
          <Text className="text-[#7C2D12]/70 text-[11px] uppercase font-extrabold tracking-wider mb-1.5 ml-1">
            Address Label
          </Text>
          <View
            className="bg-white rounded-2xl px-4 flex-row items-center"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Ionicons name="home-outline" size={18} color="#F97316" />
            <TextInput
              className="flex-1 ml-3 text-[#7C2D12] text-[14px] py-3.5"
              placeholder="e.g. Home, Office"
              placeholderTextColor="#A8A29E"
              value={form.label}
              onChangeText={(v) => setForm({ ...form, label: v })}
            />
          </View>
        </View>

        {/* Street */}
        <View className="mb-3">
          <Text className="text-[#7C2D12]/70 text-[11px] uppercase font-extrabold tracking-wider mb-1.5 ml-1">
            Street / Unit
          </Text>
          <View
            className="bg-white rounded-2xl px-4"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <TextInput
              className="text-[#7C2D12] text-[14px] py-3.5"
              placeholder="Street name, building, unit"
              placeholderTextColor="#A8A29E"
              value={form.street}
              onChangeText={(v) => setForm({ ...form, street: v })}
            />
          </View>
        </View>

        {/* Barangay */}
        <View className="mb-3">
          <Text className="text-[#7C2D12]/70 text-[11px] uppercase font-extrabold tracking-wider mb-1.5 ml-1">
            Barangay
          </Text>
          <View
            className="bg-white rounded-2xl px-4"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <TextInput
              className="text-[#7C2D12] text-[14px] py-3.5"
              placeholder="Barangay"
              placeholderTextColor="#A8A29E"
              value={form.barangay}
              onChangeText={(v) => setForm({ ...form, barangay: v })}
            />
          </View>
        </View>

        {/* City */}
        <View className="mb-3">
          <Text className="text-[#7C2D12]/70 text-[11px] uppercase font-extrabold tracking-wider mb-1.5 ml-1">
            City
          </Text>
          <View
            className="bg-white rounded-2xl px-4"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <TextInput
              className="text-[#7C2D12] text-[14px] py-3.5"
              placeholder="City / Municipality"
              placeholderTextColor="#A8A29E"
              value={form.city}
              onChangeText={(v) => setForm({ ...form, city: v })}
            />
          </View>
        </View>

        {/* Province */}
        <View className="mb-3">
          <Text className="text-[#7C2D12]/70 text-[11px] uppercase font-extrabold tracking-wider mb-1.5 ml-1">
            Province
          </Text>
          <View
            className="bg-white rounded-2xl px-4"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <TextInput
              className="text-[#7C2D12] text-[14px] py-3.5"
              placeholder="Province"
              placeholderTextColor="#A8A29E"
              value={form.province}
              onChangeText={(v) => setForm({ ...form, province: v })}
            />
          </View>
        </View>

        {/* Choose on Map */}
        <TouchableOpacity
          onPress={() => {
            openMap(
              form.latitude ? Number(form.latitude) : 14.5995,
              form.longitude ? Number(form.longitude) : 120.9842
            );
          }}
          activeOpacity={0.85}
          className="rounded-3xl p-4 mb-3 border-2 border-dashed border-[#FDBA74] flex-row items-center justify-center bg-white/60"
        >
          <Ionicons name="map-outline" size={20} color="#F97316" />
          <Text className="text-[#F97316] text-[14px] font-extrabold ml-2">
            {form.latitude && form.longitude ? 'Change Location on Map' : 'Choose on Map'}
          </Text>
        </TouchableOpacity>

        {/* Coordinates */}
        {form.latitude && form.longitude && (
          <View
            className="bg-white rounded-2xl p-4 mb-6"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Text className="text-[#7C2D12]/70 text-[10px] uppercase font-extrabold tracking-wider mb-1">
              Selected Coordinates
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={14} color="#F97316" />
              <Text className="text-[#7C2D12] text-[13px] font-semibold ml-2">
                {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save button */}
      <View className="px-4 pb-6 pt-3 bg-[#FFF7ED]">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          className="bg-[#F97316] rounded-2xl py-4 items-center"
          style={{
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text className="text-white font-extrabold text-[15px] ml-2">
                {editingId ? 'Update Address' : 'Save Address'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ─────────────────────────────────────────────
  // MAP VIEW
  // ─────────────────────────────────────────────
  const renderMap = () => (
    <View style={{ flex: 1, backgroundColor: '#FFF7ED' }}>
      {/* Header */}
      <View className="bg-[#FFF7ED] px-4 pt-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => animateTo('form')}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#7C2D12" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-[#7C2D12] text-2xl font-extrabold">
              Choose Location
            </Text>
            <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">
              Move map to position pin
            </Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View
        style={{
          flex: 1,
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#7C2D12',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <WebView
          key={mapKey}
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={{ flex: 1, backgroundColor: '#f3f4f6' }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          originWhitelist={['*']}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          onShouldStartLoadWithRequest={() => true}
        />
      </View>

      {/* Confirm button */}
      <View className="bg-[#FFF7ED] px-4 pb-6 pt-2">
        <TouchableOpacity
          onPress={handleMapConfirm}
          activeOpacity={0.85}
          className="bg-[#F97316] rounded-2xl py-4 flex-row items-center justify-center"
          style={{
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Ionicons name="location" size={20} color="#FFFFFF" />
          <Text className="text-white font-extrabold text-[15px] ml-2">
            Confirm Location
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FFF7ED' }}>
        {viewMode === 'list' && renderList()}
        {viewMode === 'form' && renderForm()}
        {viewMode === 'map' && renderMap()}
      </View>
    </Modal>
  );
}