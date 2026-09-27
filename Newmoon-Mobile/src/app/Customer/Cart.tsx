import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart } from '../../../context/cartContext';
import { STORAGE_URL } from '../../../lib/api';

export default function CartScreen() {
  const {
    items,
    branchName,
    itemCount,
    subtotal,
    updateQuantity,
    removeItem,
  } = useCart();

  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    router.push('/Customer/Checkout');
  };

  const imageBaseUrl = STORAGE_URL;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      {/* ================= HEADER ================= */}
      <View className="bg-[#FFF7ED] px-5 pt-3 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
            style={{
              shadowColor: '#7C2D12',
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#7C2D12"
            />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-[#7C2D12]">
              My Cart
            </Text>

            <View className="flex-row items-center mt-0.5">
              <Text className="text-sm text-[#7C2D12]/60">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>

              {branchName && (
                <>
                  <Text className="text-[#A8A29E] mx-1.5">
                    •
                  </Text>

                  <Ionicons
                    name="location-outline"
                    size={13}
                    color="#F97316"
                  />

                  <Text
                    className="text-sm text-[#7C2D12]/60 ml-1 flex-1"
                    numberOfLines={1}
                  >
                    {branchName}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View className="w-10 h-10 rounded-full bg-[#F97316] items-center justify-center">
            <Ionicons
              name="bag-handle-outline"
              size={21}
              color="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* ================= EMPTY CART ================= */}
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-7">
          <View className="w-28 h-28 rounded-full bg-[#FFF1E6] items-center justify-center mb-5">
            <Ionicons
              name="cart-outline"
              size={54}
              color="#F97316"
            />
          </View>

          <Text className="text-[#7C2D12] text-2xl font-extrabold">
            Your cart is empty
          </Text>

          <Text className="text-[#7C2D12]/60 text-sm text-center mt-2 leading-5">
            Looks like you haven't added anything yet.
            {'\n'}
            Let's get something fresh from the grill!
          </Text>

          <TouchableOpacity
            className="mt-7 bg-[#F97316] px-8 py-4 rounded-2xl flex-row items-center"
            onPress={() => router.push('/Customer/Home')}
            activeOpacity={0.85}
            style={{
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Ionicons
              name="restaurant-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text className="text-white font-extrabold ml-2">
              Browse Menu
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ================= CONTENT ================= */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 180,
            }}
          >
            {/* Section Title */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-extrabold text-[#7C2D12]">
                Your Order
              </Text>

              <Text className="text-xs font-extrabold text-[#F97316] bg-[#FFF1E6] px-3 py-1.5 rounded-full">
                {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
              </Text>
            </View>

            {/* ================= ORDER ITEMS ================= */}
            {items.map((item) => (
              <View
                key={item.productId}
                className="bg-white rounded-3xl p-3 mb-3"
                style={{
                  shadowColor: '#7C2D12',
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  elevation: 2,
                }}
              >
                <View className="flex-row">
                  {/* Food Image */}
                  {item.image ? (
                    <Image
                      source={{
                        uri: `${imageBaseUrl}/storage/${item.image}`,
                      }}
                      className="w-24 h-24 rounded-2xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-24 h-24 rounded-2xl bg-[#FFF1E6] items-center justify-center">
                      <Ionicons
                        name="restaurant-outline"
                        size={34}
                        color="#F97316"
                      />
                    </View>
                  )}

                  {/* Product Info */}
                  <View className="flex-1 ml-3 justify-between">
                    <View>
                      <View className="flex-row items-start">
                        <Text
                          className="flex-1 text-base font-extrabold text-[#7C2D12] mr-2"
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>

                        <TouchableOpacity
                          onPress={() =>
                            removeItem(item.productId)
                          }
                          activeOpacity={0.7}
                          className="w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#DC2626"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text className="text-sm text-[#7C2D12]/60 mt-1">
                        ₱{item.price.toFixed(2)}
                      </Text>
                    </View>

                    {/* Quantity + Item Total */}
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center bg-[#FFF1E6] rounded-full p-1">
                        <TouchableOpacity
                          className="w-8 h-8 rounded-full bg-white items-center justify-center"
                          onPress={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="remove"
                            size={16}
                            color="#7C2D12"
                          />
                        </TouchableOpacity>

                        <Text className="text-[#7C2D12] text-sm font-extrabold w-9 text-center">
                          {item.quantity}
                        </Text>

                        <TouchableOpacity
                          className="w-8 h-8 rounded-full bg-[#F97316] items-center justify-center"
                          onPress={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text className="text-base font-extrabold text-[#F97316]">
                        ₱
                        {(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* ================= ADD MORE ================= */}
            <TouchableOpacity
              onPress={() => router.push('/Customer/Home')}
              activeOpacity={0.7}
              className="border border-dashed border-[#FDBA74] rounded-2xl py-3.5 mt-2 mb-6 flex-row items-center justify-center"
            >
              <View className="w-7 h-7 rounded-full bg-[#FFF1E6] items-center justify-center mr-2">
                <Ionicons
                  name="add"
                  size={17}
                  color="#F97316"
                />
              </View>

              <Text className="text-[#F97316] font-extrabold text-sm">
                Add more items
              </Text>
            </TouchableOpacity>

            {/* ================= ORDER SUMMARY ================= */}
            <View
              className="bg-white rounded-3xl p-5 mb-5"
              style={{
                shadowColor: '#7C2D12',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <Text className="text-lg font-extrabold text-[#7C2D12] mb-4">
                Order Summary
              </Text>

              <View className="flex-row justify-between mb-3">
                <Text className="text-sm text-[#7C2D12]/70">
                  Subtotal
                </Text>

                <Text className="text-sm font-semibold text-[#7C2D12]">
                  ₱{subtotal.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-4">
                <Text className="text-sm text-[#7C2D12]/70">
                  Delivery Fee
                </Text>

                <Text className="text-sm font-semibold text-[#7C2D12]">
                  ₱{deliveryFee.toFixed(2)}
                </Text>
              </View>

              <View className="h-px bg-[#FFF1E6] mb-4" />

              <View className="flex-row justify-between items-center">
                <Text className="text-base font-extrabold text-[#7C2D12]">
                  Total
                </Text>

                <Text className="text-2xl font-extrabold text-[#F97316]">
                  ₱{total.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Small reassurance */}
            <View className="flex-row items-center justify-center mb-4">
              <Ionicons
                name="flame-outline"
                size={16}
                color="#F97316"
              />

              <Text className="text-xs text-[#7C2D12]/60 ml-1.5">
                Freshly prepared from NewMoon Grill
              </Text>
            </View>
          </ScrollView>

          {/* ================= STICKY CHECKOUT ================= */}
          <View
            className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-4 pb-5 rounded-t-3xl"
            style={{
              shadowColor: '#7C2D12',
              shadowOpacity: 0.12,
              shadowRadius: 15,
              shadowOffset: {
                width: 0,
                height: -4,
              },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-xs text-[#7C2D12]/60">
                  Total amount
                </Text>

                <Text className="text-xl font-extrabold text-[#7C2D12]">
                  ₱{total.toFixed(2)}
                </Text>
              </View>

              <Text className="text-xs text-[#F97316] font-bold">
                Delivery included
              </Text>
            </View>

            <TouchableOpacity
              className="bg-[#F97316] rounded-2xl py-4 flex-row items-center justify-center"
              onPress={handleCheckout}
              activeOpacity={0.85}
              style={{
                shadowColor: '#F97316',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: {
                  width: 0,
                  height: 6,
                },
                elevation: 5,
              }}
            >
              <Ionicons
                name="arrow-forward-circle-outline"
                size={22}
                color="#FFFFFF"
              />

              <Text className="text-white font-extrabold text-base ml-2">
                Proceed to Checkout
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}