import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { STORAGE_URL } from '../../../../lib/api';
import { cacheProducts, getCachedProducts } from '../../../../lib/dataCache';
import { resolveStaffBranch, loadStaffUser } from '../../../../lib/staffContext';

const { height: screenHeight } = Dimensions.get('window');

const CARD_SHADOW = {
  shadowColor: '#451A03',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

const ORANGE_SHADOW = {
  shadowColor: '#EA580C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 3,
};

function roundMoney(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

function formatQtyForDisplay(n: number): string {
  const r = Math.round(Number(n) * 100) / 100;
  return Number.isInteger(r) ? String(Math.round(r)) : String(r);
}

type StockStatus = 'Low Stock' | 'In Stock' | 'Out of Stock';

type StockBranch = {
  id: string;
  name?: string;
};

type StockProductStock = {
  id: string;
  branch_id: string | number;
  quantity: number;
  minimum_stock: number;
  branch?: StockBranch;
};

type StockDelivery = {
  id: string;
  branch_id: string | number;
  quantity: number;
  restocked_at?: string | null;
  received_at?: string | null;
  received_by?: string | number | null;
  marked_as_not_received?: boolean;
  not_received_at?: string | null;
  branch?: StockBranch;
};

type StockItem = {
  id: string;
  name: string;
  sku?: string;
  category: string;
  type: string;
  quantity: number;
  price: number;
  minStock: number;
  status: StockStatus;
  product_stocks?: StockProductStock[];
  ongoing_stocks?: StockDelivery[];
  image?: string;
  icon: string;
  description?: string;
  popular?: boolean;
  branchStock?: StockProductStock;
  pendingQty?: number;
  lastDeliveryAt?: string | null;
};

// ===== Robust extractor with logging =====
function extractProductsArray(responseData: any): any[] {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && typeof responseData === 'object') {
    if (Array.isArray(responseData.data)) return responseData.data;
    if (Array.isArray(responseData.products)) return responseData.products;
  }
  console.warn('[EXTRACT] Could not find an array in response, returning []');
  return [];
}

function formatRestockDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

/** Business calendar is the Philippines — never rely on device UTC day. */
function phToday(): string {
  const now = new Date();
  const ph = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 3600000);
  const y = ph.getUTCFullYear();
  const m = String(ph.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ph.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysPh(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00+08:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatPhDateShort(dateStr: string): string {
  const today = phToday();
  if (dateStr === today) return 'Today';
  if (dateStr === addDaysPh(today, -1)) return 'Yesterday';
  try {
    return new Date(dateStr + 'T12:00:00+08:00').toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const EXPENSE_CATEGORIES = ['Transportation', 'Charcoal', 'Packaging', 'Supplies', 'Cleaning', 'Other'];

const LOGO = require('../../../../assets/images/logooos.jpg');

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<(StockItem & { quantity: number })[]>([]);
  const [cash, setCash] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [seniorDiscount, setSeniorDiscount] = useState(false);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchResolved, setBranchResolved] = useState<boolean | null>(null);
  const [branchRetryCount, setBranchRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ongoingStocksModalVisible, setOngoingStocksModalVisible] = useState(false);
  const [ongoingStocks, setOngoingStocks] = useState<StockItem[]>([]);
  const [collapsedReceived, setCollapsedReceived] = useState(false);
  const [collapsedNotReceived, setCollapsedNotReceived] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // FIX: safety flag — once this is true, the screen is interactive even if the
  // branch/query is still resolving in the background. Prevents the "ghost" screen.
  const [uiReady, setUiReady] = useState(false);

  // --- Add Expense (separate from the POS cart / sale flow) ---
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(phToday());
  const [expenseDateOptions, setExpenseDateOptions] = useState<string[]>([]);
  const [expenseSaving, setExpenseSaving] = useState(false);

  useEffect(() => {
    const today = phToday();
    const options: string[] = [];
    for (let i = 0; i < 7; i++) options.push(addDaysPh(today, -i));
    setExpenseDateOptions(options);
    setExpenseDate(today);
  }, []);

  const categories = ['All'];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryScrollRef = useRef<ScrollView>(null);

  const COLLAPSE_KEY_RECEIVED = 'pos_ongoing_stocks_collapsed_received';
  const COLLAPSE_KEY_NOT_RECEIVED = 'pos_ongoing_stocks_collapsed_not_received';
  const idsEqual = (a: any, b: any) => String(a ?? '') === String(b ?? '');

  // --- Branch resolution ---
  const resolveBranchId = useCallback(async (): Promise<string | null> => {
    if (branchId) {
      setBranchResolved(true);
      return branchId;
    }
    try {
      const { branchId: bid } = await resolveStaffBranch();
      if (bid) {
        setBranchId(bid);
        setBranchResolved(true);
        setBranchRetryCount(0);
        return bid;
      }
      setBranchResolved(false);
      return null;
    } catch (error) {
      console.error('[BRANCH] resolveBranchId error:', error);
      setBranchResolved(false);
      return null;
    }
  }, [branchId]);

  // --- React Query for Products ---
  const productsQuery = useQuery<StockItem[]>({
    queryKey: ['products', branchId],
    queryFn: async () => {
      try {
        let responseData: any;

        try {
          const response = await api.get('/products');
          responseData = response.data;
          await cacheProducts(responseData);
        } catch {
          responseData = await getCachedProducts();
          if (!responseData) {
            console.warn('[productsQuery] No cached products available, returning empty array');
            return [];
          }
        }

        const rawProducts = extractProductsArray(responseData);
        if (!Array.isArray(rawProducts)) {
          console.warn('[productsQuery] rawProducts is not an array, resetting to []');
          return [];
        }
        const branch = await resolveBranchId();
        if (!branch) {
          console.warn('[productsQuery] Branch not resolved yet, hiding products until assigned branch is known');
        }
        const branchProducts = rawProducts.filter((item: any) =>
          (item.product_stocks || []).some((stock: any) =>
            idsEqual(stock.branch_id, branch)
          )
        );
        const productsWithDetails: StockItem[] = branchProducts.map((item: any) => {
          const branchStock = (item.product_stocks || []).find((s: any) =>
            idsEqual(s.branch_id, branch)
          );
          const quantity = Number(branchStock?.quantity ?? 0);
          const minimumStock = branchStock?.minimum_stock ?? 0;
          const status: StockStatus = quantity <= 0 ? 'Out of Stock' : 'In Stock';
          return {
            id: String(item.id),
            name: item.name,
            category: item.category || 'Product',
            type: 'Regular',
            quantity,
            price: Number(item.price || 0),
            minStock: minimumStock,
            status,
            image: item.image || null,
            icon: item.category === 'Liempo' ? 'lunch_dining' : 'fastfood',
            description: `Stock: ${quantity}`,
            popular: quantity > 20,
            branchStock: branchStock,
            ongoing_stocks: (item.ongoing_stocks || []).filter((d: any) =>
              idsEqual(d.branch_id, branch)
            ),
          };
        });
        const pendingExists = branchProducts.some((item: any) =>
          (item.ongoing_stocks || []).some(
            (d: any) => idsEqual(d.branch_id, branch) && !d.received_at && Number(d.quantity || 0) > 0
          )
        );
        queryClient.setQueryData(['pendingStock'], pendingExists);
        return productsWithDetails;
      } catch (error) {
        console.error('[productsQuery] Error:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 30000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
    // FIX: retry a couple of times so a transient network blip doesn't hang the UI
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  // FIX: Safety — after 15 seconds, mark UI ready no matter what.
  // This prevents the POS from being permanently stuck in the loading state
  // if the network or cache is slow.
  useEffect(() => {
    const t = setTimeout(() => setUiReady(true), 15000);
    return () => clearTimeout(t);
  }, []);

  // FIX: Whenever products resolve, ensure UI is ready & fade in.
  useEffect(() => {
    if (productsQuery.data) {
      setUiReady(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [productsQuery.data, fadeAnim]);

  // FIX: Failsafe — always fade in after 1.5s so the screen is never invisible.
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1500);
    return () => clearTimeout(t);
  }, [fadeAnim]);

  // --- Load ongoing stocks (manual) ---
  const loadOngoingStocks = async () => {
    try {
      const response = await api.get('/products');
      const raw = extractProductsArray(response.data);
      if (!Array.isArray(raw)) {
        Alert.alert('Error', 'Could not load stocks');
        return;
      }
      const branch = await resolveBranchId();
      const productsWithDetails = raw.map((item: any) => {
        const branchStock = (item.product_stocks || []).find((s: any) =>
          idsEqual(s.branch_id, branch)
        );
        const quantity = Number(branchStock?.quantity ?? 0);
        const minimumStock = branchStock?.minimum_stock ?? 0;
        const deliveriesForBranch = (item.ongoing_stocks || []).filter((d: any) =>
          idsEqual(d.branch_id, branch)
        );
        const pendingQty = deliveriesForBranch
          .filter((d: any) => !d.received_at)
          .reduce((sum: number, d: any) => sum + Number(d.quantity || 0), 0);
        const lastDeliveryAt =
          deliveriesForBranch
            .map((d: any) => d.restocked_at)
            .filter(Boolean)
            .sort()
            .slice(-1)[0] || null;
        return {
          id: String(item.id),
          name: item.name,
          category: item.category || 'Product',
          type: 'Regular',
          quantity,
          price: Number(item.price || 0),
          minStock: minimumStock,
          status: quantity <= 0 ? 'Out of Stock' : quantity < minimumStock ? 'Low Stock' : 'In Stock' as StockStatus,
          icon: item.category === 'Liempo' ? 'lunch_dining' : 'fastfood',
          description: `Stock: ${quantity}`,
          popular: quantity > 20,
          branchStock,
          ongoing_stocks: deliveriesForBranch,
          pendingQty,
          lastDeliveryAt,
        } as StockItem;
      });
      const onlyBranchOngoing = productsWithDetails.filter((p: any) => (p.ongoing_stocks || []).length > 0);
      setOngoingStocks(onlyBranchOngoing);
      setOngoingStocksModalVisible(true);
    } catch (error) {
      console.error('Error loading ongoing stocks:', error);
      Alert.alert('Error', 'Failed to load stocks');
    }
  };

  // --- Mark as received / not received ---
  const markAsReceived = async (item: StockItem) => {
    try {
      const branch = await resolveBranchId();
      if (!branch) { Alert.alert('Error', 'No branch assigned'); return; }
      await api.post(`/products/${item.id}/toggle-received`, { branch_id: branch });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await loadOngoingStocks();
      Alert.alert('Success', 'Stock marked as received');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
    }
  };

  const markAsNotReceived = async (item: StockItem) => {
    try {
      const branch = await resolveBranchId();
      if (!branch) { Alert.alert('Error', 'No branch assigned'); return; }
      Alert.alert(
        'Mark as Not Received',
        `Report that ${item.name} has not arrived? This will notify the admin.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Not Received',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.post(`/products/${item.id}/mark-not-received`, { branch_id: branch });
                setOngoingStocks(prev =>
                  prev.map(p => {
                    if (p.id !== item.id) return p;
                    return {
                      ...p,
                      ongoing_stocks: (p.ongoing_stocks || []).map(d => ({
                        ...d,
                        marked_as_not_received: !d.received_at ? true : d.marked_as_not_received,
                        not_received_at: !d.received_at ? new Date().toISOString() : d.not_received_at,
                      })),
                    };
                  })
                );
                queryClient.invalidateQueries({ queryKey: ['products'] });
                Alert.alert('Reported', 'Admin has been notified that the stock did not arrive.');
              } catch (err: any) {
                Alert.alert('Error', err.response?.data?.message || 'Failed to report');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
    }
  };

  // --- Collapse preferences ---
  useEffect(() => {
    const loadCollapsePrefs = async () => {
      try {
        const [r, nr] = await Promise.all([
          Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(COLLAPSE_KEY_RECEIVED)) : SecureStore.getItemAsync(COLLAPSE_KEY_RECEIVED),
          Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(COLLAPSE_KEY_NOT_RECEIVED)) : SecureStore.getItemAsync(COLLAPSE_KEY_NOT_RECEIVED),
        ]);
        if (r != null) setCollapsedReceived(r === '1');
        if (nr != null) setCollapsedNotReceived(nr === '1');
      } catch (e) { console.error(e); }
    };
    loadCollapsePrefs();
  }, []);

  const toggleCollapsedReceived = async () => {
    setCollapsedReceived((prev) => {
      const next = !prev;
      if (Platform.OS === 'web') localStorage.setItem(COLLAPSE_KEY_RECEIVED, next ? '1' : '0');
      else SecureStore.setItemAsync(COLLAPSE_KEY_RECEIVED, next ? '1' : '0').catch(e => console.error(e));
      return next;
    });
  };

  const toggleCollapsedNotReceived = async () => {
    setCollapsedNotReceived((prev) => {
      const next = !prev;
      if (Platform.OS === 'web') localStorage.setItem(COLLAPSE_KEY_NOT_RECEIVED, next ? '1' : '0');
      else SecureStore.setItemAsync(COLLAPSE_KEY_NOT_RECEIVED, next ? '1' : '0').catch(e => console.error(e));
      return next;
    });
  };

  // --- Branch resolution on mount ---
  useEffect(() => {
    resolveBranchId().then(() => { });
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auto-retry branch resolution ---
  useEffect(() => {
    if (branchResolved !== false || branchRetryCount >= 5) return;
    const timer = setTimeout(() => {
      resolveBranchId().then((bid) => {
        if (bid) {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        } else {
          setBranchRetryCount((c) => c + 1);
        }
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, [branchResolved, branchRetryCount, resolveBranchId, queryClient]);

  // FIX: Auto-close order modal if cart becomes empty (prevents blocking overlay)
  useEffect(() => {
    if (cart.length === 0 && orderModalVisible) {
      setOrderModalVisible(false);
    }
  }, [cart.length, orderModalVisible]);

  // --- Cart operations ---
  const zoomIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 1.05,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const zoomOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const animateButton = (callback?: () => void) => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(callback);
  };

  const addOrIncrementCart = (product: StockItem, addQty: number) => {
    const delta = Math.round(Number(addQty));
    if (!Number.isFinite(delta) || delta <= 0) return;

    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }

    animateButton();
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      const currentQty = existingItem ? existingItem.quantity : 0;
      const nextQty = currentQty + delta;

      if (nextQty <= 0) return prevCart;

      if (nextQty - Number(product.quantity) > 1e-6) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${formatQtyForDisplay(product.quantity)} ${product.name} available in stock.`
        );
        return prevCart;
      }

      setQtyInputs((prev) => ({
        ...prev,
        [product.id]: formatQtyForDisplay(nextQty),
      }));

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prevCart, { ...product, quantity: nextQty }];
    });

    setOrderModalVisible(true);
  };

  const addToCart = (product: StockItem) => addOrIncrementCart(product, 1);

  const updateQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      const item = prevCart.find(item => item.id === id);
      if (!item) return prevCart;

      const product = productsQuery.data?.find(p => p.id === id);
      if (!product) return prevCart;

      const newQuantity = item.quantity + delta;

      setQtyInputs((prev) => ({
        ...prev,
        [id]: formatQtyForDisplay(Math.max(newQuantity, 0)),
      }));

      if (newQuantity > Number(product.quantity) + 1e-6) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${formatQtyForDisplay(product.quantity)} ${product.name} available in stock.`
        );
        return prevCart;
      }

      if (newQuantity <= 0) {
        return prevCart.filter(item => item.id !== id);
      }

      return prevCart.map(item =>
        item.id === id
          ? { ...item, quantity: newQuantity }
          : item
      );
    });
  };

  const setItemQuantity = (id: string, rawValue: string) => {
    let clean = rawValue.replace(/[^\d.]/g, '');
    const firstDot = clean.indexOf('.');
    if (firstDot !== -1) {
      clean =
        clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '');
    }

    setQtyInputs((prev) => ({ ...prev, [id]: clean }));

    if (clean === '' || clean === '.') return;

    const parsed = parseFloat(clean);
    if (Number.isNaN(parsed)) return;

    const nextQty = Math.round(parsed);

    setCart(prevCart => {
      const item = prevCart.find(i => i.id === id);
      if (!item) return prevCart;

      const product = productsQuery.data?.find(p => p.id === id);
      const maxQty = Number(product?.quantity ?? item.quantity ?? 0);

      if (nextQty <= 0) {
        return prevCart.filter(i => i.id !== id);
      }

      if (nextQty - maxQty > 1e-6) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${formatQtyForDisplay(maxQty)} ${item.name} available in stock.`
        );
        setQtyInputs((prev) => ({ ...prev, [id]: formatQtyForDisplay(maxQty) }));
        return prevCart.map(i => (i.id === id ? { ...i, quantity: maxQty } : i));
      }

      setQtyInputs((prev) => ({ ...prev, [id]: formatQtyForDisplay(nextQty) }));

      return prevCart.map(i => (i.id === id ? { ...i, quantity: nextQty } : i));
    });
  };

  const commitQtyInput = (id: string) => {
    setQtyInputs((prev) => {
      const raw = prev[id];
      if (raw === '') {
        const current = cart.find((c) => c.id === id);
        return { ...prev, [id]: current ? formatQtyForDisplay(current.quantity) : '1' };
      }
      return prev;
    });
  };

  const removeFromCart = (id: string, name: string) => {
    Alert.alert(
      'Remove Item',
      `Remove ${name} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCart((prevCart) => prevCart.filter((item) => item.id !== id));
          },
        }
      ]
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to cart before checking out');
      return;
    }
    if (!cash || Number(cash) < total) {
      Alert.alert('Insufficient Cash', `Please enter at least ₱${total}`);
      return;
    }

    const orderItems = cart.map(item =>
      `${item.name} ×${formatQtyForDisplay(item.quantity)} = ₱${roundMoney(
        item.price * item.quantity
      )}`
    ).join('\n');

    try {
      let user = await loadStaffUser();

      if (!user?.id) {
        try {
          const meResponse = await api.get('/me');
          user = meResponse.data;
        } catch (error) {
          console.error('Unable to refresh authenticated user:', error);
        }
      }

      const { user: resolvedUser, branchId: resolvedBranch } = await resolveStaffBranch(user);
      user = resolvedUser ?? user;
      let branch = resolvedBranch;

      if (!user?.id || !branch) {
        Alert.alert(
          'Missing User Context',
          'Unable to determine staff or branch. Log in online once so your branch is saved on this device.'
        );
        return;
      }

      const salePayload = {
        branch_id: branch,
        user_id: user.id,
        customer_name: customerName || null,
        senior_discount: seniorDiscount,
        cash_collected: Number(cash),
        payment_method: 'cash',
        items: cart.map((item) => ({
          product_id: Number(item.id),
          quantity: item.quantity,
        })),
      };

      await api.post('/sales', salePayload);

      const orderSummary = orderItems || 'No items details available';
      const alertMessage = `${orderSummary}\n\n━━━━━━━━━━━━━━━━\nTotal: ₱${total}\nCash: ₱${cash}\nChange: ₱${change}`;

      Alert.alert(
        'Order Complete!',
        alertMessage,
        [{ text: 'New Order' }]
      );
      setCart([]);
      setCash('');
      setCustomerName('');
      setSeniorDiscount(false);
      setOrderModalVisible(false);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error: any) {
      Alert.alert('Checkout Failed', error?.response?.data?.message || 'Failed to save sale to backend.');
    }
  };

  const handleSaveExpense = async () => {
    const amountNum = Number(expenseAmount);

    if (!expenseCategory) {
      Alert.alert('Missing Category', 'Please choose an expense category.');
      return;
    }
    if (!expenseAmount || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }

    try {
      setExpenseSaving(true);

      const { branchId } = await resolveStaffBranch();
      if (!branchId) {
        Alert.alert(
          'Branch Not Found',
          'Unable to determine your branch. Log in online once so your branch is saved on this device.'
        );
        return;
      }

      await api.post('/expenses', {
        category: expenseCategory,
        amount: amountNum,
        description: expenseDescription.trim() || null,
        expense_date: expenseDate,
      });

      const summary = `₱${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} — ${expenseCategory}${expenseDescription.trim() ? ` — ${expenseDescription.trim()}` : ''}`;

      Alert.alert('Expense recorded successfully', summary, [{ text: 'OK' }]);

      setAddExpenseModalVisible(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory(EXPENSE_CATEGORIES[0]);
      setExpenseDate(phToday());
    } catch (error: any) {
      Alert.alert(
        'Failed to record expense',
        error?.response?.data?.message || 'Unable to save the expense. Try again.'
      );
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleCancelOrder = () => {
    if (cart.length === 0) return;
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes', style: 'destructive', onPress: () => {
            setCart([]);
            setCash('');
            setCustomerName('');
            setSeniorDiscount(false);
          }
        }
      ]
    );
  };

  const quickAddAmounts = [50, 100, 200, 500, 1000];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await productsQuery.refetch();
    } catch (err) {
      console.error('[handleRefresh] refetch failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [productsQuery]);

  const renderCartItem = ({ item }: { item: typeof cart[0] }) => {
    const lineTotal = roundMoney(item.price * item.quantity);

    return (
      <View className="border-b border-[#F5EDE0] py-3">
        <View className="flex-row items-center">
          <View className="bg-[#FFF1E6] p-2 rounded-xl mr-2.5">
            <Icon name={item.icon} size={14} color="#EA580C" />
          </View>

          <View className="flex-1 mr-2">
            <Text className="font-bold text-sm text-[#171717]" numberOfLines={1}>{item.name}</Text>
            <Text className="text-stone-500 text-[11px]" numberOfLines={1}>
              ₱{item.price} × {formatQtyForDisplay(item.quantity)} ={' '}
              <Text className="text-[#171717] font-bold">₱{lineTotal}</Text>
            </Text>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, -1)}
              className="bg-[#FFF1E6] w-7 h-7 rounded-full items-center justify-center"
            >
              <Icon name="remove" size={14} color="#F97316" />
            </TouchableOpacity>
            <View className="bg-[#FFFBF5] px-1 py-0.5 rounded-lg mx-1 min-w-[40px] items-center border border-[#F5EDE0]">
              <TextInput
                className="font-bold text-sm text-[#171717] text-center w-10 py-0"
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                value={qtyInputs[item.id] ?? formatQtyForDisplay(item.quantity)}
                onChangeText={(v) => setItemQuantity(item.id, v)}
                onBlur={() => commitQtyInput(item.id)}
              />
            </View>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, 1)}
              className="bg-[#DCFCE7] w-7 h-7 rounded-full items-center justify-center"
            >
              <Icon name="add" size={14} color="#10B981" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => removeFromCart(item.id, item.name)}
            className="bg-[#FEE2E2] p-1.5 rounded-lg ml-2"
          >
            <Icon name="delete" size={14} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Computed values ---
  const products = productsQuery.data || [];
  const filtered = selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory);
  const hasPending = queryClient.getQueryData(['pendingStock']) || false;
  const subtotal = cart.reduce((sum, item) => sum + roundMoney(item.price * item.quantity), 0);
  const discountAmount = seniorDiscount ? Math.round(subtotal * 0.2 * 100) / 100 : 0;
  const total = Math.max(subtotal - discountAmount, 0);
  const change = cash ? Math.max(Number(cash) - total, 0) : 0;

  // --- Loading / error states ---
  // FIX: Only block the screen on the *very first* load. If we already have
  // data cached or the uiReady flag flipped, keep the POS interactive.
  const showBlockingLoader =
    !uiReady &&
    productsQuery.isLoading &&
    !productsQuery.data &&
    products.length === 0;

  if (showBlockingLoader) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF7ED' }} edges={['top']}>
        <View className="flex-1 justify-center items-center bg-[#FFF7ED]">
          <View
            className="w-24 h-24 rounded-full bg-[#FFF1E6] items-center justify-center mb-5 border border-[#FED7AA] overflow-hidden"
            style={{ shadowColor: '#EA580C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}
          >
            <Image source={LOGO} className="w-full h-full" resizeMode="cover" />
          </View>
          <Text className="text-[#171717] text-xl font-extrabold tracking-widest">NEWMOON</Text>
          <Text className="text-[#451A03] text-[11px] font-bold uppercase tracking-[2px] mt-1">Lechon Manok &amp; Liempo House</Text>
          <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 20 }} />
          <Text className="text-stone-500 text-[13px] mt-4">Loading your Point Of Sales...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (productsQuery.isError && products.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF7ED' }} edges={['top']}>
        <View className="flex-1 justify-center items-center bg-[#FFF7ED] px-6">
          <View className="w-20 h-20 rounded-full bg-[#FEE2E2] items-center justify-center mb-4">
            <Icon name="error-outline" size={36} color="#DC2626" />
          </View>
          <Text className="text-lg font-extrabold text-[#DC2626]">Failed to load products</Text>
          <TouchableOpacity
            onPress={() => productsQuery.refetch()}
            className="mt-4 bg-[#EA580C] px-8 py-3 rounded-2xl items-center"
            style={ORANGE_SHADOW}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- JSX ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF7ED' }} edges={['top']}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-[#FFF7ED]">
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 bg-[#FFF7ED]"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#EA580C']}
                tintColor="#EA580C"
                title="Pull to refresh..."
                titleColor="#A8A29E"
              />
            }
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: Math.max(140, insets.bottom + 120),
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* ===== COMPACT CASHIER HEADER ===== */}
              <View className="px-5 pt-2 pb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-xl font-extrabold text-[#171717]">Point of Sales</Text>
                    <Text className="text-sm text-stone-500 mt-0.5">Tap a product to start an order</Text>
                  </View>

                  <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#FED7AA] ml-2"
                    style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
                    onPress={handleRefresh}
                    disabled={refreshing}
                    activeOpacity={0.7}
                  >
                    <Icon name="refresh" size={17} color="#451A03" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ===== POS UTILITY ACTIONS ===== */}
              <View className="px-5 mt-2">
                {branchResolved === false && (
                  <View className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-3 mb-3">
                    <Text className="text-[#92400E] text-[12px] font-semibold text-center">
                      Branch not resolved — stock may show 0. Check your staff branch assignment.
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setBranchResolved(null);
                        resolveBranchId().then((bid) => {
                          if (bid) queryClient.invalidateQueries({ queryKey: ['products'] });
                        });
                      }}
                      className="mt-2 bg-[#F59E0B] self-center px-4 py-1.5 rounded-full"
                      activeOpacity={0.85}
                    >
                      <Text className="text-white text-[11px] font-bold">Retry Branch</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-white rounded-2xl p-3.5 border border-[#FED7AA] items-center"
                    style={CARD_SHADOW}
                    onPress={loadOngoingStocks}
                    activeOpacity={0.85}
                  >
                    <View className="relative mb-2">
                      <View
                        className="w-11 h-11 rounded-xl bg-[#EA580C] items-center justify-center"
                        style={ORANGE_SHADOW}
                      >
                        <Icon name="inventory" size={20} color="#FFFFFF" />
                      </View>
                      {hasPending && (
                        <View className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#DC2626] border-2 border-white" />
                      )}
                    </View>
                    <Text className="text-[#171717] text-xs font-extrabold">Ongoing Stocks</Text>
                    <Text className="text-stone-400 text-[10px] font-semibold mt-0.5">Check deliveries</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-white rounded-2xl p-3.5 border border-[#FED7AA] items-center"
                    style={CARD_SHADOW}
                    onPress={() => setAddExpenseModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <View
                      className="w-11 h-11 rounded-xl bg-[#F59E0B] items-center justify-center mb-2"
                      style={{ shadowColor: '#D97706', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 }}
                    >
                      <Icon name="account-balance-wallet" size={20} color="#FFFFFF" />
                    </View>
                    <Text className="text-[#171717] text-xs font-extrabold">Add Expense</Text>
                    <Text className="text-stone-400 text-[10px] font-semibold mt-0.5">Record branch expense</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ===== MENU SECTION HEADER ===== */}
              <View className="px-5 mt-6">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-xl font-extrabold text-[#171717]">Menu</Text>
                    <Text className="text-sm text-stone-500 mt-0.5">Select an item to add to the order</Text>
                  </View>
                  <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full ml-2">
                    <Text className="text-[#EA580C] text-[11px] font-bold">🔥 {filtered.length}</Text>
                  </View>
                </View>
              </View>

              {/* ===== CATEGORY FILTER ===== */}
              <View className="px-5 mt-3">
                <ScrollView
                  ref={categoryScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {categories.map((category) => {
                    const active = selectedCategory === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        onPress={() => setSelectedCategory(category)}
                        className={`px-4 py-2.5 rounded-full border ${active ? 'bg-[#EA580C] border-[#EA580C]' : 'bg-white border-[#FED7AA]'}`}
                        style={active ? ORANGE_SHADOW : undefined}
                        activeOpacity={0.8}
                      >
                        <Text className={active ? 'text-white text-xs font-extrabold' : 'text-stone-500 text-xs font-bold'}>
                          {category === 'All' ? `All Items (${filtered.length})` : category}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ===== MENU GRID ===== */}
              <View className="px-5 mt-4">
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={{ justifyContent: 'space-between', gap: 12 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  renderItem={({ item }) => {
                    const outOfStock = item.quantity <= 0;
                    const lowStock = item.quantity > 0 && item.quantity <= 10;
                    const cartQty = cart.find((c) => idsEqual(c.id, item.id))?.quantity ?? 0;
                    const inCart = cartQty > 0;
                    return (
                      <View className="w-[48%] mb-4">
                        <TouchableOpacity
                          onPress={() => addToCart(item)}
                          className={`rounded-3xl p-4 items-center border-2 ${inCart ? 'bg-[#FFF1E6] border-[#EA580C]' : 'bg-white border-[#FED7AA]'}`}
                          style={{
                            ...(inCart ? ORANGE_SHADOW : CARD_SHADOW),
                            opacity: outOfStock ? 0.55 : 1,
                          }}
                          activeOpacity={outOfStock ? 1 : 0.7}
                          disabled={outOfStock}
                        >
                          {item.image ? (
                            <Image
                              source={{ uri: item.image ? `${STORAGE_URL}/${item.image}` : '' }}
                              className="w-full aspect-square rounded-2xl mb-3"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="bg-[#FFF1E6] p-4 rounded-full mb-3 items-center justify-center">
                              <Icon name={item.icon} size={30} color="#EA580C" />
                            </View>
                          )}

                          <View className="absolute top-3 left-3 bg-white px-2 py-0.5 rounded-full border border-[#F5EDE0]">
                            <Text className="text-[#171717] text-[10px] font-bold">Stock: {formatQtyForDisplay(item.quantity)}</Text>
                          </View>

                          {item.popular && !outOfStock && !inCart && (
                            <View className="absolute top-3 right-3 bg-[#EA580C] px-2 py-1 rounded-full flex-row items-center">
                              <Icon name="local-fire-department" size={10} color="white" />
                              <Text className="text-white text-[10px] font-bold ml-1">BESTSELLER</Text>
                            </View>
                          )}
                          {outOfStock && (
                            <View className="absolute top-3 right-3 bg-[#DC2626] px-2 py-1 rounded-full">
                              <Text className="text-white text-[10px] font-bold">OUT OF STOCK</Text>
                            </View>
                          )}
                          {inCart && !outOfStock && (
                            <View className="absolute top-3 right-3 bg-[#16A34A] px-2 py-1 rounded-full flex-row items-center">
                              <Icon name="check" size={10} color="white" />
                              <Text className="text-white text-[10px] font-bold ml-1">
                                IN CART · {formatQtyForDisplay(cartQty)}
                              </Text>
                            </View>
                          )}

                          <Text className="font-bold text-center text-base text-[#171717] mb-1.5 px-1" numberOfLines={2}>{item.name}</Text>
                          <View className="bg-[#DCFCE7] px-3 py-1 rounded-full">
                            <Text className="text-[#16A34A] font-extrabold text-lg">₱{item.price}</Text>
                          </View>
                          {lowStock && (
                            <View className="flex-row items-center mt-1.5 bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                              <Icon name="warning" size={12} color="#F59E0B" />
                              <Text className="text-[#D97706] text-[11px] font-bold ml-1">
                                Only {formatQtyForDisplay(item.quantity)} left!
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />

                {filtered.length === 0 && (
                  <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center">
                    <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                      <Icon name="restaurant-menu" size={30} color="#EA580C" />
                    </View>
                    <Text className="text-[#171717] font-extrabold text-base">No Menu Items</Text>
                    <Text className="text-stone-500 text-xs mt-1 text-center">Products will appear here once available</Text>
                  </View>
                )}
              </View>

              {/* ===== FOOTER BRANDING ===== */}
              <View className="items-center px-5 mt-8 mb-2">
                <View className="w-10 h-[3px] rounded-full bg-[#FED7AA] mb-4" />
                <Icon name="local-fire-department" size={16} color="#EA580C" />
                <Text className="text-[#451A03] text-xs font-extrabold tracking-widest mt-1">NEWMOON</Text>
                <Text className="text-stone-500 text-[10px] mt-0.5 tracking-wide">Lechon Manok &amp; Liempo House</Text>
                <Text className="text-[#EA580C] text-[10px] font-bold mt-0.5">Fresh from the Roasted</Text>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Floating Cart Button */}
          {cart.length > 0 && (
            <View style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: Math.max(insets.bottom + 8, 16)
            }}>
              <TouchableOpacity
                onPress={() => setOrderModalVisible(true)}
                activeOpacity={0.85}
              >
                <View
                  className="bg-[#EA580C] py-4 rounded-3xl px-5 flex-row items-center justify-between"
                  style={{ shadowColor: '#EA580C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}
                >
                  <View className="flex-row items-center">
                    <View className="bg-white/20 p-2 rounded-xl mr-3">
                      <Icon name="shopping-cart" size={18} color="white" />
                    </View>
                    <View>
                      <Text className="text-white font-bold text-base">View Order</Text>
                      <Text className="text-white/80 text-xs">{cart.length} item(s)</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-lg mr-2">₱{total}</Text>
                    <Icon name="chevron-right" size={24} color="white" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Order Summary Modal */}
          <Modal
            visible={orderModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setOrderModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View className="flex-1 bg-black/50 justify-end">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View className="bg-white rounded-t-3xl h-[96%] border-t border-[#FED7AA]">
                    {/* Header */}
                    <View className="px-4 py-4 flex-row justify-between items-center border-b border-[#F5EDE0]">
                      <View className="flex-row items-center">
                        <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                          <Icon name="receipt-long" size={20} color="#EA580C" />
                        </View>
                        <View>
                          <Text className="text-[#171717] font-extrabold text-lg">Order Summary</Text>
                          <Text className="text-stone-500 text-xs">{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setOrderModalVisible(false)}
                        className="w-9 h-9 rounded-full bg-[#FFF7ED] items-center justify-center border border-[#FED7AA]"
                        activeOpacity={0.7}
                      >
                        <Icon name="close" size={18} color="#78716C" />
                      </TouchableOpacity>
                    </View>

                    <View className="flex-1">
                      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
                        {cart.length > 0 && (
                          <View className="px-0 pt-3 pb-2 flex-row justify-between items-center">
                            <View className="bg-[#FEE2E2] px-3 py-1 rounded-full">
                              <Text className="text-[#DC2626] text-xs font-semibold">
                                {cart.length} {cart.length === 1 ? 'item' : 'items'}
                              </Text>
                            </View>
                            <TouchableOpacity onPress={handleCancelOrder} className="bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-xl">
                              <View className="flex-row items-center">
                                <Icon name="delete-sweep" size={16} color="#DC2626" />
                                <Text className="text-[#DC2626] font-bold text-xs ml-1">Clear</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}
                        {cart.length === 0 ? (
                          <View className="py-14 items-center">
                            <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                              <Icon name="shopping-cart" size={30} color="#EA580C" />
                            </View>
                            <Text className="text-stone-500 font-semibold">Your cart is empty</Text>
                            <Text className="text-stone-400 text-xs text-center mt-1">Tap on items to add</Text>
                          </View>
                        ) : (
                          <>
                            <View className="flex-row items-center mb-4 mt-3 gap-2">
                              <View className="flex-1 flex-row items-center bg-[#FFFBF5] border border-[#F5EDE0] rounded-xl">
                                <View className="px-2">
                                  <Icon name="person" size={16} color="#78716C" />
                                </View>
                                <TextInput
                                  className="flex-1 py-2 pr-2 text-sm text-[#1C1917]"
                                  placeholder="Customer name"
                                  placeholderTextColor="#A8A29E"
                                  value={customerName}
                                  onChangeText={setCustomerName}
                                />
                              </View>
                              <TouchableOpacity
                                onPress={() => setSeniorDiscount((p) => !p)}
                                activeOpacity={0.85}
                                className={`flex-row items-center px-2.5 py-2 rounded-xl border ${seniorDiscount ? 'bg-[#DCFCE7] border-[#86EFAC]' : 'bg-[#FFFBF5] border-[#F5EDE0]'
                                  }`}
                              >
                                <View
                                  className={`w-4 h-4 rounded-sm items-center justify-center mr-1.5 border ${seniorDiscount ? 'bg-[#16A34A] border-[#16A34A]' : 'bg-white border-stone-300'
                                    }`}
                                >
                                  {seniorDiscount && <Icon name="check" size={11} color="white" />}
                                </View>
                                <Text className={`text-[11px] font-bold ${seniorDiscount ? 'text-[#15803D]' : 'text-stone-600'}`}>
                                  Senior 20%
                                </Text>
                                {seniorDiscount && (
                                  <Text className="text-[#16A34A] text-[11px] font-bold ml-1">-₱{discountAmount}</Text>
                                )}
                              </TouchableOpacity>
                            </View>

                            <View className="bg-[#FFFBF5] rounded-2xl px-3 pt-2 pb-2 mb-3 border border-[#F5EDE0]">
                              {cart.map((item) => (
                                <View key={item.id}>
                                  {renderCartItem({ item })}
                                </View>
                              ))}
                            </View>
                          </>
                        )}
                      </ScrollView>

                      {cart.length > 0 && (
                        <View className="px-4 pt-2 border-t border-[#F5EDE0]" style={{ paddingBottom: Math.max(10, insets.bottom + 8) }}>
                          <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3 mb-2 flex-row justify-between items-center">
                            <View>
                              <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Total</Text>
                              <Text className="text-[#EA580C] font-extrabold text-2xl mt-0.5">₱{total}</Text>
                            </View>
                            {seniorDiscount ? (
                              <Text className="text-[#16A34A] text-[11px] font-bold">-₱{discountAmount} of ₱{subtotal}</Text>
                            ) : null}
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2" nestedScrollEnabled={true}>
                            <View className="flex-row">
                              {quickAddAmounts.map((amount) => (
                                <TouchableOpacity
                                  key={amount}
                                  onPress={() => setCash(amount.toString())}
                                  className="bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1.5 rounded-lg mr-2"
                                >
                                  <Text className="text-[#EA580C] font-bold text-xs">₱{amount}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>

                          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <View className="flex-row items-center bg-[#FFFBF5] border-2 rounded-xl" style={{ borderColor: '#E7E5E4' }}>
                              <View className="bg-[#EA580C] px-2.5 py-2 rounded-l-xl">
                                <Icon name="attach-money" size={16} color="white" />
                              </View>
                              <TextInput
                                className="flex-1 px-3 py-2 text-sm text-[#1C1917]"
                                placeholder="Cash amount"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={cash.toString()}
                                onChangeText={(value) => setCash(value)}
                                onFocus={zoomIn}
                                onBlur={zoomOut}
                              />
                              {cash && Number(cash) >= total && (
                                <View className="bg-[#16A34A] px-3 py-2 rounded-r-xl">
                                  <Text className="text-white font-bold text-xs">Change ₱{change}</Text>
                                </View>
                              )}
                            </View>
                          </Animated.View>

                          {cash && Number(cash) < total && Number(cash) > 0 && (
                            <View className="bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1.5 rounded-lg mt-2 flex-row items-center justify-center">
                              <Icon name="error-outline" size={14} color="#DC2626" />
                              <Text className="text-[#DC2626] text-xs ml-1.5 font-medium">
                                Need ₱{total - Number(cash)} more
                              </Text>
                            </View>
                          )}

                          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                            <TouchableOpacity
                              onPress={handleCheckout}
                              activeOpacity={0.85}
                            >
                              <View
                                className="bg-[#EA580C] py-3.5 mt-2 rounded-2xl items-center flex-row justify-center"
                                style={ORANGE_SHADOW}
                              >
                                <Icon name="check-circle" size={18} color="white" />
                                <Text className="text-white font-bold text-sm ml-2">Complete Order</Text>
                              </View>
                            </TouchableOpacity>
                          </Animated.View>
                        </View>
                      )}
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Ongoing Stocks Modal */}
          <Modal
            visible={ongoingStocksModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setOngoingStocksModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setOngoingStocksModalVisible(false)}>
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback>
                  <View className="bg-white rounded-t-3xl h-[90%] border-t border-[#FED7AA]">
                    {/* Header */}
                    <View className="px-4 py-4 flex-row justify-between items-center border-b border-[#F5EDE0]">
                      <View className="flex-row items-center">
                        <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                          <Icon name="inventory" size={20} color="#EA580C" />
                        </View>
                        <View>
                          <Text className="text-[#171717] font-extrabold text-lg">Ongoing Stocks</Text>
                          <Text className="text-stone-500 text-xs">{ongoingStocks.length} products</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setOngoingStocksModalVisible(false)}
                        className="w-9 h-9 rounded-full bg-[#FFF7ED] items-center justify-center border border-[#FED7AA]"
                        activeOpacity={0.7}
                      >
                        <Icon name="close" size={18} color="#78716C" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
                      {ongoingStocks.length === 0 ? (
                        <View className="py-14 items-center">
                          <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                            <Icon name="inventory" size={30} color="#EA580C" />
                          </View>
                          <Text className="text-[#171717] font-extrabold text-base">No ongoing stocks</Text>
                          <Text className="text-stone-500 text-xs text-center mt-1">All deliveries have been received</Text>
                        </View>
                      ) : (
                        <>
                          {/* Received Section */}
                          {(() => {
                            const allReceivedDeliveries: { delivery: StockDelivery; product: StockItem }[] = [];
                            ongoingStocks.forEach(product => {
                              (product.ongoing_stocks || []).forEach(d => {
                                if (d.received_at) {
                                  allReceivedDeliveries.push({ delivery: d, product });
                                }
                              });
                            });

                            return allReceivedDeliveries.length > 0 ? (
                              <View className="mb-4">
                                <TouchableOpacity
                                  onPress={toggleCollapsedReceived}
                                  className="flex-row justify-between items-center bg-[#DCFCE7] px-3 py-2.5 rounded-xl mb-2 border border-[#BBF7D0]"
                                >
                                  <View className="flex-row items-center">
                                    <Icon name="check-circle" size={18} color="#10B981" />
                                    <Text className="text-green-700 font-bold text-sm ml-2">Received</Text>
                                    <Text className="text-green-700 text-xs ml-2 bg-white px-2 py-0.5 rounded-full">
                                      {allReceivedDeliveries.length}
                                    </Text>
                                  </View>
                                  <Icon
                                    name={collapsedReceived ? "chevron-right" : "expand-more"}
                                    size={20}
                                    color="#10B981"
                                  />
                                </TouchableOpacity>

                                {!collapsedReceived && (
                                  <View className="ml-2">
                                    {allReceivedDeliveries.map(({ delivery, product }) => (
                                      <View key={delivery.id} className="bg-white rounded-2xl p-3 mb-2 border border-[#FED7AA]">
                                        <View className="flex-row justify-between items-start">
                                          <View className="flex-1">
                                            <Text className="text-[#171717] font-bold text-sm">{product.name}</Text>
                                            <Text className="text-stone-400 text-[10px]">
                                              Restocked {formatRestockDate(delivery.restocked_at)}
                                            </Text>
                                          </View>
                                          <View className="bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                                            <Text className="text-[#16A34A] text-xs font-bold">
                                              {delivery.quantity} pcs
                                            </Text>
                                          </View>
                                        </View>
                                        <View className="flex-row justify-between items-center mt-1">
                                          <Text className="text-stone-400 text-[10px]">
                                            Received {formatRestockDate(delivery.received_at)}
                                          </Text>
                                          <Text className="text-stone-500 text-[10px]">Stock: {product.quantity}</Text>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            ) : null;
                          })()}

                          {(() => {
                            const allPendingDeliveries: { delivery: StockDelivery; product: StockItem }[] = [];
                            const allNotReceivedDeliveries: { delivery: StockDelivery; product: StockItem }[] = [];

                            ongoingStocks.forEach(product => {
                              (product.ongoing_stocks || []).forEach(d => {
                                if (!d.received_at && !d.marked_as_not_received) {
                                  allPendingDeliveries.push({ delivery: d, product });
                                }
                                if (d.marked_as_not_received) {
                                  allNotReceivedDeliveries.push({ delivery: d, product });
                                }
                              });
                            });

                            return (
                              <>
                                {/* Pending Section */}
                                {allPendingDeliveries.length > 0 && (
                                  <View className="mb-4">
                                    <TouchableOpacity
                                      onPress={toggleCollapsedNotReceived}
                                      className="flex-row justify-between items-center bg-[#FFF1E6] px-3 py-2.5 rounded-xl mb-2 border border-[#FED7AA]"
                                    >
                                      <View className="flex-row items-center">
                                        <Icon name="pending" size={18} color="#EA580C" />
                                        <Text className="text-[#C2410C] font-bold text-sm ml-2">Pending</Text>
                                        <Text className="text-[#EA580C] text-xs ml-2 bg-white px-2 py-0.5 rounded-full">
                                          {allPendingDeliveries.length}
                                        </Text>
                                      </View>
                                      <Icon
                                        name={collapsedNotReceived ? "chevron-right" : "expand-more"}
                                        size={20}
                                        color="#EA580C"
                                      />
                                    </TouchableOpacity>

                                    {!collapsedNotReceived && (
                                      <View className="ml-2">
                                        {allPendingDeliveries.map(({ delivery, product }) => (
                                          <View key={delivery.id} className="bg-white rounded-2xl p-3 mb-2 border border-[#FED7AA]">
                                            <View className="flex-row justify-between items-start">
                                              <View className="flex-1">
                                                <Text className="text-[#171717] font-bold text-sm">{product.name}</Text>
                                                <Text className="text-stone-400 text-[10px]">
                                                  Restocked {formatRestockDate(delivery.restocked_at)}
                                                </Text>
                                              </View>
                                              <View className="bg-[#FFF1E6] px-2 py-0.5 rounded-full">
                                                <Text className="text-[#EA580C] text-xs font-bold">
                                                  {delivery.quantity} pcs
                                                </Text>
                                              </View>
                                            </View>
                                            <View className="flex-row justify-end mt-2 gap-2">
                                              <TouchableOpacity
                                                onPress={() => markAsReceived(product)}
                                                className="bg-[#16A34A] px-3 py-1.5 rounded-lg"
                                              >
                                                <View className="flex-row items-center">
                                                  <Icon name="check" size={14} color="white" />
                                                  <Text className="text-white font-bold text-xs ml-1">Receive</Text>
                                                </View>
                                              </TouchableOpacity>
                                              <TouchableOpacity
                                                onPress={() => markAsNotReceived(product)}
                                                className="bg-[#DC2626] px-3 py-1.5 rounded-lg"
                                              >
                                                <View className="flex-row items-center">
                                                  <Icon name="close" size={14} color="white" />
                                                  <Text className="text-white font-bold text-xs ml-1">Not Received</Text>
                                                </View>
                                              </TouchableOpacity>
                                            </View>
                                          </View>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                )}

                                {/* Not Received Section */}
                                {allNotReceivedDeliveries.length > 0 && (
                                  <View className="mb-4">
                                    <TouchableOpacity
                                      onPress={toggleCollapsedNotReceived}
                                      className="flex-row justify-between items-center bg-[#FEE2E2] px-3 py-2.5 rounded-xl mb-2 border border-[#FECACA]"
                                    >
                                      <View className="flex-row items-center">
                                        <Icon name="cancel" size={18} color="#EF4444" />
                                        <Text className="text-red-700 font-bold text-sm ml-2">Not Received</Text>
                                        <Text className="text-red-700 text-xs ml-2 bg-white px-2 py-0.5 rounded-full">
                                          {allNotReceivedDeliveries.length}
                                        </Text>
                                      </View>
                                      <Icon
                                        name={collapsedNotReceived ? "chevron-right" : "expand-more"}
                                        size={20}
                                        color="#EF4444"
                                      />
                                    </TouchableOpacity>

                                    {!collapsedNotReceived && (
                                      <View className="ml-2">
                                        {allNotReceivedDeliveries.map(({ delivery, product }) => (
                                          <View key={delivery.id} className="bg-white rounded-2xl p-3 mb-2 border border-[#FED7AA]">
                                            <View className="flex-row justify-between items-start">
                                              <View className="flex-1">
                                                <Text className="text-[#171717] font-bold text-sm">{product.name}</Text>
                                                <Text className="text-stone-400 text-[10px]">
                                                  Restocked {formatRestockDate(delivery.restocked_at)}
                                                </Text>
                                              </View>
                                              <View className="bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                                                <Text className="text-[#DC2626] text-xs font-bold">
                                                  {delivery.quantity} pcs
                                                </Text>
                                              </View>
                                            </View>
                                            <View className="flex-row justify-between items-center mt-1">
                                              {delivery.not_received_at && (
                                                <Text className="text-stone-400 text-[10px]">
                                                  Reported: {new Date(delivery.not_received_at).toLocaleDateString()}
                                                </Text>
                                              )}
                                            </View>
                                          </View>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                )}
                              </>
                            );
                          })()}
                        </>
                      )}
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Add Expense Modal */}
          <Modal
            visible={addExpenseModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              if (expenseSaving) return;
              setAddExpenseModalVisible(false);
            }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View className="flex-1 bg-black/50 justify-end">
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                  style={{ width: '100%' }}
                >
                  <View
                    className="bg-white rounded-t-3xl border-t border-[#FED7AA]"
                    style={{ maxHeight: screenHeight * 0.92 }}
                  >
                    {/* Header */}
                    <View className="px-4 py-4 flex-row justify-between items-center border-b border-[#F5EDE0]">
                      <View className="flex-row items-center flex-1">
                        <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                          <Icon name="account-balance-wallet" size={20} color="#F59E0B" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[#171717] font-extrabold text-lg">Add Expense</Text>
                          <Text className="text-stone-500 text-xs" numberOfLines={1}>
                            Record a branch operating expense
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          if (expenseSaving) return;
                          setAddExpenseModalVisible(false);
                        }}
                        className="w-9 h-9 rounded-full bg-[#FFF7ED] items-center justify-center border border-[#FED7AA]"
                        activeOpacity={0.7}
                        disabled={expenseSaving}
                      >
                        <Icon name="close" size={18} color="#78716C" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      className="px-4 pt-4"
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{
                        paddingBottom: Math.max(insets.bottom, 16) + 16,
                      }}
                    >
                      {/* Category */}
                      <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                        Expense Category
                      </Text>
                      <View className="flex-row flex-wrap gap-2 mb-5">
                        {EXPENSE_CATEGORIES.map((category) => {
                          const active = expenseCategory === category;
                          return (
                            <TouchableOpacity
                              key={category}
                              onPress={() => setExpenseCategory(category)}
                              className={`px-4 py-2.5 rounded-full border ${active
                                ? 'bg-[#F59E0B] border-[#F59E0B]'
                                : 'bg-[#FFFBF5] border-[#F5EDE0]'
                                }`}
                              style={
                                active
                                  ? {
                                    shadowColor: '#D97706',
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 6,
                                    elevation: 3,
                                  }
                                  : undefined
                              }
                              activeOpacity={0.8}
                            >
                              <Text
                                className={
                                  active
                                    ? 'text-white text-xs font-extrabold'
                                    : 'text-stone-600 text-xs font-bold'
                                }
                              >
                                {category}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Amount */}
                      <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                        Amount
                      </Text>
                      <View
                        className="flex-row items-center bg-[#FFFBF5] border-2 rounded-xl mb-5"
                        style={{ borderColor: '#E7E5E4' }}
                      >
                        <View className="bg-[#F59E0B] px-3 py-2.5 rounded-l-xl">
                          <Text className="text-white font-extrabold text-base">₱</Text>
                        </View>
                        <TextInput
                          className="flex-1 px-3 py-2.5 text-base font-bold text-[#1C1917]"
                          placeholder="0.00"
                          placeholderTextColor="#D6D3D1"
                          keyboardType="decimal-pad"
                          value={expenseAmount}
                          onChangeText={(v) => {
                            let clean = v.replace(/[^\d.]/g, '');
                            const firstDot = clean.indexOf('.');
                            if (firstDot !== -1) {
                              clean =
                                clean.slice(0, firstDot + 1) +
                                clean.slice(firstDot + 1).replace(/\./g, '');
                            }
                            setExpenseAmount(clean);
                          }}
                          returnKeyType="done"
                          editable={!expenseSaving}
                        />
                      </View>

                      {/* Expense Date */}
                      <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                        Expense Date
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                        className="mb-5"
                        keyboardShouldPersistTaps="handled"
                      >
                        {expenseDateOptions.map((date) => {
                          const active = expenseDate === date;
                          return (
                            <TouchableOpacity
                              key={date}
                              onPress={() => setExpenseDate(date)}
                              className={`px-3.5 py-2 rounded-xl border ${active
                                ? 'bg-[#EA580C] border-[#EA580C]'
                                : 'bg-[#FFFBF5] border-[#F5EDE0]'
                                }`}
                              activeOpacity={0.8}
                            >
                              <Text
                                className={
                                  active
                                    ? 'text-white text-[11px] font-bold'
                                    : 'text-stone-600 text-[11px] font-bold'
                                }
                              >
                                {formatPhDateShort(date)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* Description */}
                      <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                        Description (optional)
                      </Text>
                      <View
                        className="bg-[#FFFBF5] border-2 rounded-xl mb-4"
                        style={{ borderColor: '#E7E5E4' }}
                      >
                        <TextInput
                          className="px-3 py-2.5 text-sm text-[#1C1917]"
                          style={{ minHeight: 80, textAlignVertical: 'top' }}
                          placeholder="e.g. Delivery transportation for today's stock"
                          placeholderTextColor="#A8A29E"
                          multiline
                          value={expenseDescription}
                          onChangeText={setExpenseDescription}
                          editable={!expenseSaving}
                        />
                      </View>

                      <View className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-3 py-2.5 mb-4 flex-row items-center">
                        <Icon name="info-outline" size={15} color="#EA580C" />
                        <Text className="text-[#B45309] text-[11px] font-semibold ml-2 flex-1">
                          Recorded for your assigned branch. This does not affect your cart,
                          sales, or stock.
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={handleSaveExpense}
                        disabled={expenseSaving}
                        activeOpacity={0.85}
                      >
                        <View
                          className="bg-[#F59E0B] py-3.5 rounded-2xl items-center flex-row justify-center"
                          style={{
                            opacity: expenseSaving ? 0.6 : 1,
                            shadowColor: '#D97706',
                            shadowOffset: { width: 0, height: 5 },
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 4,
                          }}
                        >
                          {expenseSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Icon name="check-circle" size={18} color="white" />
                          )}
                          <Text className="text-white font-bold text-sm ml-2">
                            {expenseSaving ? 'Saving…' : 'Record Expense'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}