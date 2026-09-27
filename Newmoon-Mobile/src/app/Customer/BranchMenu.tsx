import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api, { STORAGE_URL } from '../../../lib/api';
import { useCart } from '../../../context/cartContext';

type ProductStock = {
  branch_id: number | string;
  quantity: number;
};

type MenuProduct = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  image?: string | null;
  product_stocks?: ProductStock[];
  stocks?: ProductStock[];
};

function formatPrice(value: number | string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₱0.00';
  return `₱${amount.toFixed(2)}`;
}

async function fetchAllProducts(): Promise<MenuProduct[]> {
  const products: MenuProduct[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await api.get('/products', { params: { page } });
    const payload = response.data;
    const pageData = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    products.push(...pageData);
    lastPage = payload?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return products;
}

function getBranchStock(product: MenuProduct, branchId: number): ProductStock | undefined {
  const stocks = product.product_stocks ?? product.stocks ?? [];
  return stocks.find((stock) => String(stock.branch_id) === String(branchId));
}

export default function BranchMenuScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    address?: string;
    phone?: string;
  }>();

  const branchId = Number(params.id);
  const branchName = params.name ?? 'Branch';
  const branchAddress = params.address;
  const branchPhone = params.phone;

  const { addItem, items: cartItems, subtotal, itemCount, removeItem, updateQuantity } = useCart();

  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartVisible, setCartVisible] = useState(false);

  const branchProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = getBranchStock(product, branchId);
      return stock && Number(stock.quantity) > 0;
    });
  }, [products, branchId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return branchProducts;
    const query = searchQuery.toLowerCase().trim();
    return branchProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
    );
  }, [branchProducts, searchQuery]);

  const loadData = useCallback(async () => {
    const productList = await fetchAllProducts();
    setProducts(productList);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch {
        Alert.alert('Error', 'Unable to load menu. Please try again.');
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FFF7ED]">
        <View className="w-20 h-20 rounded-full bg-[#FFF1E6] items-center justify-center mb-4">
          <Ionicons name="restaurant-outline" size={36} color="#F97316" />
        </View>
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-[#7C2D12] font-extrabold mt-4 text-base">Loading menu...</Text>
        <Text className="text-[#7C2D12]/60 text-xs mt-1">{branchName}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
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
        {/* Header: Menu title */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#7C2D12" />
            <Text className="text-[#7C2D12] text-[26px] font-extrabold ml-1">Menu</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-5 mt-1">
          <View
            className="bg-white rounded-full px-5 flex-row items-center"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Ionicons name="search" size={18} color="#F97316" />
            <TextInput
              className="flex-1 ml-2.5 text-[14px] text-[#7C2D12] py-3.5"
              placeholder="Search"
              placeholderTextColor="#A8A29E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#F97316" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Popular section */}
        <View className="mt-6 px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[#7C2D12] text-[20px] font-extrabold">Popular</Text>
            <Text className="text-[#7C2D12]/60 text-[12px] font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center"
              style={{
                shadowColor: '#7C2D12',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3">
                <Ionicons name="restaurant-outline" size={30} color="#F97316" />
              </View>
              <Text className="text-[#7C2D12] text-base font-extrabold mt-1 text-center">
                {searchQuery.trim() ? 'No items match your search' : 'No items available in this branch'}
              </Text>
              {searchQuery.trim() && (
                <Text className="text-[#7C2D12]/60 text-sm text-center mt-1">
                  Try adjusting your search terms
                </Text>
              )}
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredProducts.map((item) => {
                const stock = getBranchStock(item, branchId);
                const quantity = stock ? Number(stock.quantity) : 0;

                const addToCart = () => {
                  if (quantity <= 0) return;
                  addItem(
                    item.id,
                    item.name,
                    Number(item.price),
                    branchId,
                    branchName,
                    item.image
                  );
                  setCartVisible(true);
                };

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={quantity > 0 ? 0.85 : 1}
                    onPress={addToCart}
                    disabled={quantity <= 0}
                    className="bg-white rounded-3xl mb-4 overflow-hidden"
                    style={{
                      width: '48%',
                      shadowColor: '#7C2D12',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.08,
                      shadowRadius: 12,
                      elevation: 3,
                    }}
                  >
                    <View className="p-3">
                      {item.image ? (
                        <Image
                          source={{
                            uri: `${STORAGE_URL}/${item.image}`,
                          }}
                          className="w-full h-24 rounded-2xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-24 bg-[#FFF1E6] rounded-2xl items-center justify-center">
                          <Ionicons name="restaurant-outline" size={30} color="#F97316" />
                        </View>
                      )}

                      <Text className="text-[13px] font-extrabold text-[#7C2D12] mt-3" numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text className="text-[11px] text-[#7C2D12]/60 mt-0.5" numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}

                      <View className="flex-row items-center justify-between mt-2.5">
                        <Text className="text-[14px] font-extrabold text-[#F97316]">
                          {formatPrice(item.price)}
                        </Text>

                        <TouchableOpacity
                          className={`w-7 h-7 rounded-full items-center justify-center ${
                            quantity > 0 ? 'bg-[#F97316]' : 'bg-[#F5F5F5]'
                          }`}
                          disabled={quantity <= 0}
                          onPress={addToCart}
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={quantity > 0 ? '#FFFFFF' : '#9CA3AF'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cart Bottom Sheet Popup */}
      <Modal
        visible={cartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setCartVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '70%',
              paddingBottom: 34,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#FED7AA' }} />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cart-outline" size={22} color="#F97316" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#7C2D12', marginLeft: 8 }}>
                  Your Cart
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#FFF1E6',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#F97316' }}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>

            {cartItems.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 }}>
                <Ionicons name="cart-outline" size={48} color="#FED7AA" />
                <Text style={{ fontSize: 15, color: '#A8A29E', marginTop: 8 }}>Your cart is empty</Text>
              </View>
            ) : (
              <>
                {/* Cart Items */}
                <ScrollView
                  style={{ paddingHorizontal: 20 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {cartItems.map((item) => (
                    <View
                      key={item.productId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFBF5',
                        borderRadius: 16,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: '#FED7AA',
                      }}
                    >
                      {item.image ? (
                        <Image
                          source={{
                            uri: `${STORAGE_URL}/${item.image}`,
                          }}
                          style={{ width: 48, height: 48, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: '#FFF1E6',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="restaurant-outline" size={22} color="#F97316" />
                        </View>
                      )}

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: '#7C2D12' }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#F97316', marginTop: 2 }}>
                          {formatPrice(item.price)}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#F5F5F5',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="remove" size={16} color="#7C2D12" />
                        </TouchableOpacity>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '800',
                            color: '#7C2D12',
                            marginHorizontal: 10,
                            minWidth: 20,
                            textAlign: 'center',
                          }}
                        >
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#F97316',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Subtotal + View Cart */}
                <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#7C2D12', opacity: 0.6 }}>Subtotal</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#7C2D12' }}>
                      {formatPrice(subtotal)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setCartVisible(false);
                      router.push('/Customer/Cart');
                    }}
                    style={{
                      backgroundColor: '#F97316',
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      shadowColor: '#F97316',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      elevation: 4,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 }}>
                      View Cart
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Cart */}
      {!cartVisible && itemCount > 0 && (
        <View className="absolute left-4 right-4" style={{ bottom: 100 }}>
          <TouchableOpacity
            onPress={() => setCartVisible(true)}
            className="bg-[#7C2D12] rounded-2xl px-4 py-3 flex-row items-center justify-between"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
            activeOpacity={0.9}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-[#F97316] items-center justify-center mr-3">
                <Ionicons name="cart" size={18} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-bold">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Text>
                <Text className="text-[#FFEDD5] text-xs font-medium mt-0.5">
                  Subtotal: {formatPrice(subtotal)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#FFEDD5] text-sm font-bold mr-1">View Cart</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFEDD5" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}