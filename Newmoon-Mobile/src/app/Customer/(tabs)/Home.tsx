import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../../lib/api';
import { useAuthContext } from '../../../../context/authContext';
import { useCart } from '../../../../context/cartContext';
import { useAddress } from '../../../../context/addressContext';
import {
  CustomerBranch,
  getSelectedBranch,
  saveSelectedBranch,
} from '../../../../lib/customerBranchStorage';
import AddressModal from '../AddressModal';

async function fetchAllBranches(): Promise<CustomerBranch[]> {
  const branches: CustomerBranch[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await api.get('/branches', { params: { page } });
    const payload = response.data;
    const pageData = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    branches.push(...pageData);
    lastPage = payload?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return branches;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();

  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<CustomerBranch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addressModalVisible, openAddressModal, closeAddressModal, selectedAddress, setSelectedAddress } = useAddress();
  const { itemCount } = useCart();

  const displayName = user?.firstname?.trim() || user?.username || 'Customer';
  const userInitial = displayName.charAt(0).toUpperCase();

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const query = searchQuery.toLowerCase().trim();
    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(query) ||
        branch.address?.toLowerCase().includes(query) ||
        branch.code?.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  const loadData = useCallback(async () => {
    const [branchList, savedBranch] = await Promise.all([
      fetchAllBranches(),
      getSelectedBranch(),
    ]);

    setBranches(branchList);

    const savedStillValid = savedBranch && branchList.some((branch) => branch.id === savedBranch.id);
    const nextBranch = savedStillValid ? savedBranch : branchList[0] ?? null;
    setSelectedBranch(nextBranch);
    if (nextBranch) {
      await saveSelectedBranch(nextBranch);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch {
        Alert.alert('Error', 'Unable to load branches. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch {
      Alert.alert('Error', 'Unable to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
            router.replace('/Login');
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const openBranchMenu = (branch: CustomerBranch) => {
    router.push({
      pathname: '/Customer/BranchMenu',
      params: {
        id: String(branch.id),
        name: branch.name,
        address: branch.address ?? '',
        phone: branch.phone ?? '',
      },
    });
  };

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
        <Text className="text-white/90 text-[13px] mt-4">Loading your food experience...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <StatusBar barStyle="light-content" backgroundColor="#F97316" />

      <ScrollView
        className="flex-1 bg-[#FFF7ED]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
      >
        <View>
          {/* Top bar: Deliver to + Logout */}
          <View className="px-5 pt-4 pb-3 flex-row items-center justify-between bg-[#F97316] rounded-b-[36px]">
            <TouchableOpacity
              className="flex-1 flex-row items-center"
              onPress={openAddressModal}
              activeOpacity={0.7}
            >
              <View className="w-11 h-11 rounded-full bg-white items-center justify-center mr-3"
                style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
              >
                <Ionicons name="location" size={19} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Deliver to</Text>
                <Text className="text-white text-[14px] font-extrabold mt-0.5" numberOfLines={1}>
                  {selectedAddress
                    ? [selectedAddress.street, selectedAddress.barangay, selectedAddress.city, selectedAddress.province].filter(Boolean).join(', ')
                    : selectedBranch ? selectedBranch.name : 'Set delivery address'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-white items-center justify-center ml-3"
              style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
              onPress={handleLogout}
              activeOpacity={0.7}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Ionicons name="log-out-outline" size={19} color="#F97316" />
              )}
            </TouchableOpacity>
          </View>

          {/* Hero headline */}
          <View className="px-5 mt-5">
            <Text className="text-[#7C2D12] text-[28px] font-extrabold leading-9">Hello, {displayName}</Text>
            <Text className="text-[#7C2D12]/70 text-[14px] mt-1">What do you want to order today?</Text>
          </View>

          {/* Search Bar */}
          <View className="px-5 mt-5">
            <View className="bg-white rounded-full px-5 flex-row items-center"
              style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 4 }}
            >
              <Ionicons name="search" size={18} color="#F97316" />
              <TextInput
                className="flex-1 ml-2.5 text-[14px] text-[#7C2D12] py-3.5"
                placeholder="Search food"
                placeholderTextColor="#A8A29E"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color="#F97316" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {branches.length === 0 ? (
            <View className="items-center px-8 pt-14 pb-10">
              <View className="w-24 h-24 rounded-full bg-[#FFF1E6] items-center justify-center mb-4">
                <Ionicons name="storefront-outline" size={42} color="#F97316" />
              </View>
              <Text className="text-xl font-extrabold text-[#7C2D12] text-center">
                No NewMoon branches yet
              </Text>
              <Text className="text-sm text-[#7C2D12]/60 text-center mt-2">
                Please check again later.
              </Text>
              <View className="bg-[#FFF1E6] px-3 py-1.5 rounded-full mt-4">
                <Text className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider">🔥 Fresh from the grill</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Branch section */}
              <View className="mt-8 px-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1 mr-2">
                    <Text className="text-[#7C2D12] text-[20px] font-extrabold">Choose Your Branch</Text>
                    <Text className="text-sm text-[#7C2D12]/60 mt-0.5">Find a NewMoon near you.</Text>
                  </View>
                  <View className="bg-[#F97316] px-3 py-1 rounded-full">
                    <Text className="text-white text-[11px] font-bold">
                      {filteredBranches.length} {filteredBranches.length === 1 ? 'branch' : 'branches'}
                    </Text>
                  </View>
                </View>

                {filteredBranches.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center"
                    style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 3 }}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3">
                      <Ionicons name={searchQuery.trim() ? 'search-outline' : 'storefront-outline'} size={30} color="#F97316" />
                    </View>
                    <Text className="text-[#7C2D12] text-base font-extrabold mt-1 text-center">
                      {searchQuery.trim() ? 'No branches found' : 'No branches available'}
                    </Text>
                    <Text className="text-[#7C2D12]/60 text-[13px] mt-2 text-center">
                      {searchQuery.trim() ? 'Try searching for another branch or location.' : 'Please check back later.'}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between">
                    {filteredBranches.map((branch) => (
                      <TouchableOpacity
                        key={branch.id}
                        className="bg-[#F97316] rounded-3xl mb-4 overflow-hidden"
                        style={{
                          width: '48%',
                          shadowColor: '#7C2D12',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.25,
                          shadowRadius: 14,
                          elevation: 5,
                        }}
                        activeOpacity={0.85}
                        onPress={() => openBranchMenu(branch)}
                      >
                        <View className="w-full h-28 bg-[#FB923C] items-center justify-center">
                          <View className="w-14 h-14 rounded-full bg-white items-center justify-center"
                            style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 }}
                          >
                            <Ionicons name="storefront" size={24} color="#F97316" />
                          </View>
                          <TouchableOpacity
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white items-center justify-center"
                            activeOpacity={0.7}
                          >
                            <Ionicons name="heart-outline" size={15} color="#F97316" />
                          </TouchableOpacity>
                          <View className="absolute top-2 left-2 bg-[#7C2D12] px-2 py-0.5 rounded-md">
                            <Text className="text-white text-[9px] font-extrabold">30% OFF</Text>
                          </View>
                        </View>

                        <View className="p-4">
                          <Text className="text-[14px] font-extrabold text-white" numberOfLines={1}>
                            {branch.name}
                          </Text>
                          {branch.address && (
                            <Text className="text-[11px] text-white/85 mt-1 leading-4" numberOfLines={2}>
                              {branch.address}
                            </Text>
                          )}
                          <View className="flex-row items-center justify-between mt-3">
                            <Text className="text-[#FFEDD5] text-[11px] font-bold" numberOfLines={1}>
                              {branch.phone ?? 'View'}
                            </Text>
                            <View className="w-7 h-7 rounded-full bg-white items-center justify-center ml-1">
                              <Ionicons name="arrow-forward" size={14} color="#F97316" />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Footer brand line */}
              <View className="items-center px-5 mt-8 mb-2">
                <Ionicons name="flame" size={18} color="#F97316" />
                <Text className="text-[#7C2D12] text-sm font-extrabold tracking-widest mt-1">NEWMOON</Text>
                <Text className="text-[#7C2D12]/60 text-[10px] mt-0.5 tracking-wide">Lechon Manok &amp; Liempo</Text>
                <Text className="text-[#F97316] text-[11px] font-bold mt-0.5">Fresh from the Grill</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Cart Button — CENTERED above tab bar */}
      <TouchableOpacity
        className="absolute w-16 h-16 rounded-full bg-[#F97316] items-center justify-center"
        style={{
          bottom: 100,
          left: '50%',
          marginLeft: -32,
          shadowColor: '#F97316',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
          elevation: 12,
          borderWidth: 4,
          borderColor: '#FFFFFF',
          zIndex: 99,
        }}
        onPress={() => router.push('/Customer/Cart' as unknown as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="bag-handle" size={26} color="#FFFFFF" />
        {itemCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-[#7C2D12] rounded-full min-w-[22px] h-[22px] items-center justify-center px-1 border-2 border-white">
            <Text className="text-white text-[10px] font-bold">
              {itemCount > 99 ? '99+' : itemCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Address Modal */}
      <AddressModal
        visible={addressModalVisible}
        onClose={closeAddressModal}
        onSelect={(addr) => {
          setSelectedAddress(addr);
          closeAddressModal();
        }}
        selectedAddress={selectedAddress}
      />

    </SafeAreaView>
  );
}