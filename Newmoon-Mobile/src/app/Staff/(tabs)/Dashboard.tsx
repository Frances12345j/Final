import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { isSignedOut, isSessionEndedError } from '../../../../lib/api';
import { useAuth } from '../../../../context/authContext';
import { isAuthError, isNetworkError } from '../../../../lib/network';
import { getCachedProducts } from '../../../../lib/dataCache';
import { getUser as getStoredUserFromStorage } from '../../../../lib/userStorage';
import { resolveStaffBranch } from '../../../../lib/staffContext';
import { getResolvedBranchId } from '../../../../lib/branchCache';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type StockStatus = 'Low Stock' | 'In Stock' | 'Out of Stock';

type StockItem = {
  id: string;
  name: string;
  category: string;
  type: string;
  quantity: number;
  price: number;
  minStock: number;
  status: StockStatus;
  product_stocks?: { id: string; branch_id: string | number; quantity: number; minimum_stock: number; received: boolean; branch?: { id: string; name?: string } }[];
  icon?: string;
  description?: string;
  popular?: boolean;
  received?: boolean;
  branchStock?: { id: string; branch_id: string | number; quantity: number; minimum_stock: number; received: boolean };
};

// ===== Helpers =====

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTime = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const idsEqual = (a: any, b: any) => String(a ?? '') === String(b ?? '');

const getSaleDate = (sale: any) => {
  const rawDate = sale?.sale_date || sale?.created_at || '';
  if (typeof rawDate !== 'string') return '';
  const match = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const sumSalesTotal = (sales: any[] = []) => {
  if (!Array.isArray(sales)) return 0;
  return sales.reduce((sum, sale) => sum + Number(sale?.total || 0), 0);
};

const formatStockQty = (qty: number): { whole: string; hasHalf: boolean } => {
  const n = Math.round(Number(qty) * 2) / 2;
  const whole = Math.floor(n);
  const hasHalf = Math.abs(n - whole - 0.5) < 0.001;
  return { whole: String(whole), hasHalf };
};

const getStoredUser = async () => {
  const stored = await getStoredUserFromStorage();
  if (stored?.firstname || stored?.username) return stored;
  try {
    const response = await api.get('me');
    return response.data || stored || null;
  } catch (error) {
    if (!isAuthError(error) && !isNetworkError(error)) {
      console.error('Unable to load dashboard user:', error);
    }
    return stored || null;
  }
};

const loadCachedStockForBranch = async (branchId: string | number | null): Promise<StockItem[]> => {
  const cached = await getCachedProducts<any>();
  if (!cached) return [];
  const productsData = Array.isArray(cached) ? cached : cached?.data ?? [];
  return productsData
    .map((item: any) => {
      const branchStock = (item.product_stocks || []).find((s: any) => idsEqual(s.branch_id, branchId));
      const quantity = Number(branchStock?.quantity ?? 0) || 0;
      const minStock = Number(branchStock?.minimum_stock ?? 0) || 0;
      const lowStockThreshold = Math.max(minStock, 15);
      const status: StockStatus = quantity <= 0 ? 'Out of Stock' : quantity <= lowStockThreshold ? 'Low Stock' : 'In Stock';
      return {
        id: String(item.id),
        name: item.name,
        category: item.category || 'Product',
        type: 'Regular',
        quantity,
        price: Number(item.price || 0),
        minStock,
        status,
        branchStock,
        product_stocks: item.product_stocks,
      };
    })
    .filter((row: StockItem) => {
      if (!branchId) return true;
      return row.branchStock != null;
    });
};

// ===== Product Category Helper =====

type ProductCategory = 'LECHON_MANOK' | 'LIEMPO' | 'OTHER';

const getProductCategory = (item: StockItem): ProductCategory => {
  const nameLower = (item.name || '').toLowerCase();
  const categoryLower = (item.category || '').toLowerCase();
  const typeLower = (item.type || '').toLowerCase();
  const combined = `${nameLower} ${categoryLower} ${typeLower}`;

  // Check Liempo first (more specific)
  if (combined.includes('liempo') || combined.includes('pork')) {
    return 'LIEMPO';
  }
  // Check Lechon Manok
  if (combined.includes('lechon manok') || combined.includes('chicken') || combined.includes('manok')) {
    return 'LECHON_MANOK';
  }
  return 'OTHER';
};

// ===== Reusable Components =====

const QuickStatCard = React.memo(({ title, value, icon, color, bgColor }: { title: string; value: string | number; icon: IoniconName; color: string; bgColor: string }) => (
  <View
    className="flex-1 bg-white rounded-3xl p-4 border border-[#FED7AA]"
    style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}
  >
    <View style={{ backgroundColor: bgColor }} className="w-10 h-10 rounded-2xl items-center justify-center mb-3">
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text className="text-[#171717] text-xl font-extrabold" numberOfLines={1}>{value}</Text>
    <Text className="text-stone-400 text-[10px] font-bold tracking-wide uppercase mt-1">{title}</Text>
  </View>
));

const SaleRow = React.memo(({ sale }: { sale: any }) => {
  const cash = Number(sale?.cash_collected || 0);
  const change = Number(sale?.change_given ?? sale?.changeGiven ?? 0);
  const total = Number(sale?.total || 0);
  const invoice = sale?.invoice_number || `INV-${sale?.id || '-'}`;
  const hasSenior = Boolean(sale?.senior_discount);
  const discountAmount = Number(sale?.discount_amount || 0);
  const customer = sale?.customer_name || '-';

  return (
    <View
      className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]"
      style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text className="text-[#171717] text-sm font-extrabold">{invoice}</Text>
          <Text className="text-stone-500 text-xs mt-1">
            {formatDateTime(sale?.created_at || sale?.sale_date)}
          </Text>
          <Text className="text-stone-500 text-xs">Customer: {customer}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[#EA580C] text-lg font-extrabold">
            ₱{total.toLocaleString()}
          </Text>
          {hasSenior && (
            <Text className="text-[#16A34A] text-[11px] font-bold mt-0.5">
              Senior: -₱{discountAmount.toLocaleString()}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row justify-between mt-3 pt-3 border-t border-[#F5EDE0]">
        <View className="items-center flex-1">
          <Text className="text-stone-400 text-[10px] font-bold uppercase">Cash</Text>
          <Text className="text-[#171717] text-sm font-bold mt-0.5">₱{cash.toLocaleString()}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-stone-400 text-[10px] font-bold uppercase">Change</Text>
          <Text className="text-[#171717] text-sm font-bold mt-0.5">₱{change.toLocaleString()}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-stone-400 text-[10px] font-bold uppercase">Payment</Text>
          <Text className="text-[#EA580C] text-sm font-extrabold mt-0.5">
            {String(sale?.payment_method || 'cash').toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
});

const StockRow = React.memo(({ item }: { item: StockItem }) => {
  const isLow = item.status === 'Low Stock';
  const isOut = item.status === 'Out of Stock';
  const { whole, hasHalf } = formatStockQty(item.quantity);
  const statusColors = {
    bg: isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#DCFCE7',
    text: isOut ? '#DC2626' : isLow ? '#F59E0B' : '#16A34A',
  };
  const statusLabel = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

  return (
    <View
      className="bg-white rounded-3xl p-4 mb-3 border border-[#FED7AA]"
      style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
    >
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View style={{ backgroundColor: statusColors.bg }} className="w-9 h-9 rounded-xl items-center justify-center mr-3">
            <Ionicons name={isOut ? 'alert-circle' : isLow ? 'warning-outline' : 'checkmark-circle'} size={17} color={statusColors.text} />
          </View>
          <View className="flex-1">
            <Text className="text-[#171717] text-sm font-extrabold" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-stone-500 text-[11px] mt-0.5" numberOfLines={1}>
              {item.category} • {item.type}
            </Text>
          </View>
        </View>
        <View style={{ backgroundColor: statusColors.bg }} className="px-2.5 py-1 rounded-full">
          <Text style={{ color: statusColors.text }} className="text-[9px] font-extrabold uppercase tracking-wide">
            {statusLabel}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between pt-3 border-t border-[#F5EDE0]">
        <View className="items-center flex-1">
          <Text className="text-stone-400 text-[9px] font-bold uppercase mb-1">Stock</Text>
          <Text className="text-[#171717] text-lg font-extrabold">{hasHalf ? `${whole}.5` : whole}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-stone-400 text-[9px] font-bold uppercase mb-1">Price</Text>
          <Text className="text-[#EA580C] text-base font-extrabold">₱{item.price}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-stone-400 text-[9px] font-bold uppercase mb-1">Min</Text>
          <Text className="text-[#171717] text-base font-extrabold">{item.minStock}</Text>
        </View>
      </View>

      {hasHalf && (
        <View className="flex-row justify-center mt-2">
          <View className="bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
            <Text className="text-[#F59E0B] text-[10px] font-bold">Half stock: {whole}.5</Text>
          </View>
        </View>
      )}
    </View>
  );
});

// ===== Main Dashboard Component =====

const DashboardScreen = () => {
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();

  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branchResolved, setBranchResolved] = useState<boolean | null>(null);
  const [branchRetryCount, setBranchRetryCount] = useState(0);
  const [grossSales, setGrossSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [todaySalesList, setTodaySalesList] = useState<any[]>([]);
  const [salesTodayModalVisible, setSalesTodayModalVisible] = useState(false);
  const [salesTodayPage, setSalesTodayPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState();
  const [user, setUser] = useState<any>(null);
  const [quotaProductsSold, setQuotaProductsSold] = useState(0);
  const [monthlyProductsSold, setMonthlyProductsSold] = useState(0);
  const [quotaIncentive, setQuotaIncentive] = useState(0);
  const [dailyIncentive, setDailyIncentive] = useState(0);
  // The Product Quota is the daily incentive threshold (50 pcs = 1 incentive),
  // NOT a slice of the monthly SalesTarget. The API supplies the real value.
  const [productTarget, setProductTarget] = useState(50);
  const [monthlyTarget, setMonthlyTarget] = useState(0);

  const SALES_TODAY_PAGE_SIZE = 4;

  // Several in-flight requests can fail with 401 at the same time (this screen
  // loads data from more than one effect). Without this guard each failure
  // would call router.replace('/Login'), remounting the Login screen and
  // replaying its entry animation several times.
  const redirectingToLoginRef = useRef(false);

  const redirectToLogin = useCallback(async () => {
    if (redirectingToLoginRef.current) return;
    redirectingToLoginRef.current = true;
    // signOut() already revokes the token server-side and ends the session.
    await signOut();
    router.replace('/Login');
  }, [signOut, router]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          redirectToLogin();
        },
      },
    ]);
  }, [redirectToLogin]);

  const loadDashboardData = useCallback(async () => {
    // Logging out (or an expired token) ends the session while this loader is
    // still running. Bail out instead of firing requests that can only 401.
    if (isSignedOut()) return;
    try {
      const today = formatLocalDate();
      const now = new Date();
      const monthStart = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const monthEnd = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const nextMonthStart = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));

      const { branchId } = await resolveStaffBranch();
      setBranchResolved(Boolean(branchId));
      if (branchId) setBranchRetryCount(0);
      const branchParams = branchId ? { branch_id: branchId } : {};

      const [productsRes, summaryRes, monthlySalesRes] = await Promise.all([
        api.get('products'),
        api.get('sales', { params: { ...branchParams, date: today, per_page: 100 } }),
        api.get('sales', { params: { ...branchParams, start_date: monthStart, end_date: nextMonthStart, per_page: 100 } }),
      ]);

      const productsData = Array.isArray(productsRes?.data) ? productsRes.data : (productsRes?.data?.data || []);

      if (!branchId) {
        try {
          const cachedBranchId = await getResolvedBranchId();
          const cachedStock = await loadCachedStockForBranch(branchId ?? cachedBranchId);
          if (cachedStock.some((row) => Number(row.quantity) > 0)) {
            setStockData(cachedStock);
          }
        } catch { }
      } else {
        const mappedStock: StockItem[] = productsData
          .map((item: any) => {
            const branchStock = (item.product_stocks || []).find((s: any) => idsEqual(s.branch_id, branchId));
            const quantity = Number(branchStock?.quantity ?? 0) || 0;
            const minStock = Number(branchStock?.minimum_stock ?? 0) || 0;
            const lowStockThreshold = Math.max(minStock, 15);
            const status: StockStatus = quantity <= 0 ? 'Out of Stock' : quantity <= lowStockThreshold ? 'Low Stock' : 'In Stock';
            return {
              id: String(item.id),
              name: item.name,
              category: item.category || 'Product',
              type: 'Regular',
              quantity,
              price: Number(item.price || 0),
              minStock,
              status,
              branchStock,
              product_stocks: item.product_stocks,
            };
          })
          .filter((row: StockItem) => row.branchStock != null);

        setStockData(mappedStock);
      }

      const summaryData = Array.isArray(summaryRes?.data) ? summaryRes.data : (summaryRes?.data?.data || []);
      setTodaySalesList(summaryData);
      setTodaySales(sumSalesTotal(summaryData));
      setSalesTodayPage(1);

      const monthlyData = Array.isArray(monthlySalesRes?.data) ? monthlySalesRes.data : (monthlySalesRes?.data?.data || []);
      const monthSalesTotal = sumSalesTotal(
        monthlyData.filter((sale: any) => {
          const saleDate = getSaleDate(sale);
          return saleDate >= monthStart && saleDate <= monthEnd;
        })
      );
      setGrossSales(monthSalesTotal);

      const storedUser = await getStoredUserFromStorage();
      if (isSignedOut()) return;
      try {
        const incentivesRes = await api.get('sales/product-incentives', {
          params: { month: now.getMonth() + 1, year: now.getFullYear() },
        });
        const incentivesData = incentivesRes?.data || {};
        const userIncentive = Object.values(incentivesData).find(
          (entry: any) => entry?.user_id === storedUser?.id
        ) as any;
        setQuotaProductsSold(userIncentive?.daily_products_sold ?? 0);
        setMonthlyProductsSold(userIncentive?.total_products_sold ?? 0);
        setQuotaIncentive(userIncentive?.incentive_amount ?? 0);
        setDailyIncentive(userIncentive?.daily_incentive_amount ?? 0);
        if (userIncentive?.daily_incentive_goal) {
          setProductTarget(Number(userIncentive.daily_incentive_goal));
        }
      } catch (error: any) {
        if (isSessionEndedError(error)) return;
        setQuotaProductsSold(0);
        setQuotaIncentive(0);
        setDailyIncentive(0);
      }

      if (isSignedOut()) return;
      try {
        // The server resolves the target (staff-level first, then branch) so the
        // app and the admin report always agree on the same number.
        const targetRes = await api.get('sales-targets/me');
        const targetProducts = Number(targetRes?.data?.target_products) || 0;
        setMonthlyTarget(targetProducts);
        if (!targetProducts) {
          console.log(
            '[Dashboard] No monthly target set. branch_id=',
            targetRes?.data?.branch_id ?? null,
            'source=',
            targetRes?.data?.source ?? null
          );
        }
      } catch (error: any) {
        // A 401 here means the session ended (logout, expired token). The auth
        // layer already handled it, so redirect silently instead of warning.
        if (isSessionEndedError(error) || isAuthError(error) || isSignedOut()) {
          await redirectToLogin();
          return;
        }
        console.warn('[Dashboard] sales-targets/me failed:', error?.message ?? error);
        setMonthlyTarget(0);
      }
    } catch (error: any) {
      if (isSessionEndedError(error) || isAuthError(error) || isSignedOut()) {
        await redirectToLogin();
        return;
      }
      let cachedStock: StockItem[] = [];
      try {
        const { branchId } = await resolveStaffBranch();
        cachedStock = await loadCachedStockForBranch(branchId);
      } catch { }
      setStockData((prev) => (prev.length === 0 ? cachedStock : prev));
    } finally {
      if (!isSignedOut()) {
        setLoading(false);
      }
    }
  }, [redirectToLogin]);

  const loadUserData = useCallback(async () => {
    const userData = await getStoredUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // useFocusEffect already runs on mount, so calling loadDashboardData() from a
  // plain useEffect as well would fire every request twice.
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  useEffect(() => {
    if (isSignedOut()) return;
    if (branchResolved !== false || branchRetryCount >= 5) return;
    const timer = setTimeout(() => {
      if (isSignedOut()) return;
      setBranchRetryCount((count) => count + 1);
      loadDashboardData();
    }, 6000);
    return () => clearTimeout(timer);
  }, [branchResolved, branchRetryCount, loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const totalStock = useMemo(() => stockData.reduce((sum, item) => sum + Number(item.quantity), 0), [stockData]);
  const lowStockCount = useMemo(() => stockData.filter(item => item.status === 'Low Stock').length, [stockData]);
  const totalValue = useMemo(() => stockData.reduce((sum, item) => sum + (item.quantity * item.price), 0), [stockData]);
  const outOfStockCount = useMemo(() => stockData.filter((i) => i.status === 'Out of Stock').length, [stockData]);

  const alertsList = useMemo(
    () => stockData.filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock'),
    [stockData]
  );

  const filteredStock = useMemo(() => {
    if (filterCategory === 'ALL') return stockData;
    if (filterCategory === 'LECHON_MANOK') {
      return stockData.filter(i => getProductCategory(i) === 'LECHON_MANOK');
    }
    if (filterCategory === 'LIEMPO') {
      return stockData.filter(i => getProductCategory(i) === 'LIEMPO');
    }
    return stockData;
  }, [stockData, filterCategory]);

  const lechonManokCount = useMemo(
    () => stockData.filter(i => getProductCategory(i) === 'LECHON_MANOK').length,
    [stockData]
  );
  const liempoCount = useMemo(
    () => stockData.filter(i => getProductCategory(i) === 'LIEMPO').length,
    [stockData]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(todaySalesList.length / SALES_TODAY_PAGE_SIZE)),
    [todaySalesList.length]
  );

  const pagedSales = useMemo(() => {
    const start = (salesTodayPage - 1) * SALES_TODAY_PAGE_SIZE;
    return todaySalesList.slice(start, start + SALES_TODAY_PAGE_SIZE);
  }, [todaySalesList, salesTodayPage]);

  const displayName =
    authUser?.firstname?.trim() ||
    user?.firstname?.trim() ||
    authUser?.username ||
    user?.username ||
    'Staff';

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FFF7ED]">
        <View
          className="w-24 h-24 rounded-full bg-[#FFF1E6] items-center justify-center mb-5 border border-[#FED7AA] overflow-hidden"
          style={{ shadowColor: '#EA580C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}
        >
          <Image
            source={require('../../../../assets/images/logooos.jpg')}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        <Text className="text-[#171717] text-xl font-extrabold tracking-widest">NEWMOON</Text>
        <Text className="text-[#451A03] text-[11px] font-bold uppercase tracking-[2px] mt-1">Lechon Manok &amp; Liempo House</Text>
        <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 20 }} />
        <Text className="text-stone-500 text-[13px] mt-4">Loading your staff dashboard...</Text>
      </View>
    );
  }

  const { whole: totalWhole, hasHalf: totalHasHalf } = formatStockQty(totalStock);
  const quotaProgress = productTarget > 0 ? Math.min((quotaProductsSold / productTarget) * 100, 100) : 0;
  const monthlyProgress = monthlyTarget > 0 ? Math.min((monthlyProductsSold / monthlyTarget) * 100, 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EA580C"
            colors={['#EA580C']}
            title="Pull to refresh..."
            titleColor="#A8A29E"
          />
        }
      >
        {/* ===== COMPACT HEADER ===== */}
        <View className="px-5 pt-2 pb-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-11 h-11 rounded-xl bg-[#FFF1E6] items-center justify-center mr-3 overflow-hidden border border-[#FED7AA]">
                <Image
                  source={require('../../../../assets/images/logooos.jpg')}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View>
                <Text className="text-[#171717] text-base font-extrabold tracking-wide">NEWMOON</Text>
                <Text className="text-[#451A03] text-[9px] font-bold uppercase tracking-[1.5px] mt-0.5">Lechon Manok &amp; Liempo House</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 ml-2">
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#FED7AA]"
                style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
                onPress={onRefresh}
                disabled={refreshing}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={17} color="#451A03" />
              </TouchableOpacity>
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#FED7AA]"
                style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={17} color="#451A03" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <View className="mt-4">
            <Text className="text-xl font-extrabold text-[#171717]">Hey, {displayName}! 👋</Text>
            <Text className="text-sm text-stone-500 mt-0.5">Ready for today&apos;s sales?</Text>
          </View>
        </View>

        {/* ===== BRANCH WARNING (compact) ===== */}
        {branchResolved === false && (
          <View className="mx-5 mt-4 px-3.5 py-3 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex-row items-center">
            <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
            <View className="ml-2.5 flex-1">
              <Text className="text-[#92400E] text-[12px] font-bold">Branch not resolved</Text>
              <Text className="text-[#B45309] text-[10px] mt-0.5 leading-tight">
                Stock may show 0. Check your connection and pull to refresh.
              </Text>
            </View>
          </View>
        )}

        {/* ===== TODAY'S SALES HERO ===== */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-[#171717]">Today&apos;s Sales</Text>
              <Text className="text-sm text-stone-500 mt-0.5">Your branch performance today</Text>
            </View>
          </View>

          <TouchableOpacity
            className="bg-white rounded-3xl p-5 border border-[#FED7AA]"
            style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}
            onPress={() => { setSalesTodayPage(1); setSalesTodayModalVisible(true); }}
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-[#EA580C] text-lg">🔥</Text>
                <Text className="text-[#EA580C] text-[10px] font-extrabold uppercase tracking-wider ml-1.5">Gross Today</Text>
              </View>
              <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full">
                <Text className="text-[#EA580C] text-[11px] font-bold">{todaySalesList.length} sale(s)</Text>
              </View>
            </View>

            <Text className="text-[#EA580C] text-4xl font-extrabold mt-2">₱{todaySales.toLocaleString()}</Text>

            <View className="mt-4 pt-4 border-t border-[#F5EDE0]">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-stone-500 text-[11px] font-semibold">This Month</Text>
                <Text className="text-[#171717] text-sm font-extrabold">₱{grossSales.toLocaleString()}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-stone-500 text-[11px] font-semibold">Monthly Target</Text>
                <Text className="text-[#171717] text-sm font-extrabold">
                  {monthlyTarget > 0 ? `${monthlyTarget.toLocaleString()} pcs` : 'Not set'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-center mt-4 pt-4 border-t border-[#F5EDE0]">
              <Text className="text-[#F97316] text-xs font-extrabold">View Sales</Text>
              <Ionicons name="arrow-forward" size={14} color="#F97316" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ===== QUICK STATS - 2x2 Grid ===== */}
        <View className="px-5 mt-6">
          <Text className="text-xl font-extrabold text-[#171717]">Quick Stats</Text>
          <Text className="text-sm text-stone-500 mt-0.5">Branch overview</Text>

          <View className="flex-row gap-3 mt-4">
            <QuickStatCard
              title="Total Stock"
              value={totalHasHalf ? `${totalWhole}.5` : totalWhole}
              icon="cube-outline"
              color="#EA580C"
              bgColor="#FFF1E6"
            />
            <QuickStatCard
              title="Total Products"
              value={stockData.length}
              icon="restaurant-outline"
              color="#F59E0B"
              bgColor="#FEF3C7"
            />
          </View>

          <View className="flex-row gap-3 mt-3">
            <QuickStatCard
              title="Low Stock"
              value={lowStockCount}
              icon="warning-outline"
              color="#F59E0B"
              bgColor="#FEF3C7"
            />
            <QuickStatCard
              title="Inventory Value"
              value={`₱${totalValue.toLocaleString()}`}
              icon="wallet-outline"
              color="#EA580C"
              bgColor="#FFF1E6"
            />
          </View>
        </View>

        {/* ===== PRODUCT QUOTA ===== */}
        <View className="px-5 mt-6">
          <Text className="text-xl font-extrabold text-[#171717]">Product Quota</Text>
          <Text className="text-sm text-stone-500 mt-0.5">Daily goal &amp; incentive</Text>

          <View
            className="bg-white rounded-3xl p-5 border border-[#FED7AA] mt-3"
            style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5">
                  <Ionicons name="trophy-outline" size={16} color="#EA580C" />
                </View>
                <Text className="text-[#EA580C] text-[10px] font-extrabold uppercase tracking-wider">Daily Goal</Text>
              </View>
              <Text className="text-stone-500 text-[11px] font-semibold">
                {productTarget > 0 ? `${quotaProductsSold} / ${productTarget} sold` : `${quotaProductsSold} sold`}
              </Text>
            </View>

            {productTarget > 0 ? (
              <View className="mt-4">
                <View className="h-2.5 rounded-full bg-[#FFF1E6] overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: quotaProductsSold >= productTarget ? '#16A34A' : '#F97316',
                      width: `${quotaProgress}%`
                    }}
                  />
                </View>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-stone-500 text-[11px] font-semibold">{quotaProgress}% of daily quota</Text>
                  <Text className="text-[#EA580C] text-[11px] font-extrabold">
                    {quotaProductsSold >= productTarget
                      ? 'Target hit! 🔥'
                      : `${productTarget - quotaProductsSold} to go`}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-stone-400 text-[11px] font-semibold mt-4">
                No daily goal set.
              </Text>
            )}

            <View className="mt-4 pt-4 border-t border-[#F5EDE0] flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="flash-outline" size={18} color={dailyIncentive > 0 ? '#16A34A' : '#A8A29E'} />
              </View>
              <View className="flex-1">
                <Text className="text-stone-500 text-[11px] font-semibold">Today&apos;s Incentive</Text>
                <Text className={dailyIncentive > 0 ? 'text-[#16A34A] text-2xl font-extrabold' : 'text-[#A8A29E] text-2xl font-extrabold'}>
                  ₱{dailyIncentive.toLocaleString()}
                </Text>
              </View>
            </View>

            <View className="mt-3 pt-4 border-t border-[#F5EDE0] flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                <Ionicons name="cash-outline" size={18} color={quotaIncentive > 0 ? '#EA580C' : '#A8A29E'} />
              </View>
              <View className="flex-1">
                <Text className="text-stone-500 text-[11px] font-semibold">Monthly Incentive Bonus</Text>
                <Text className={quotaIncentive > 0 ? 'text-[#EA580C] text-2xl font-extrabold' : 'text-[#A8A29E] text-2xl font-extrabold'}>
                  ₱{quotaIncentive.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== MONTHLY TARGET ===== */}
        <View className="px-5 mt-6">
          <Text className="text-xl font-extrabold text-[#171717]">Monthly Target</Text>
          <Text className="text-sm text-stone-500 mt-0.5">
            {monthlyTarget > 0 ? 'Monthly progress' : 'No target set for you yet'}
          </Text>

          <View
            className="bg-white rounded-3xl p-5 border border-[#FED7AA] mt-3"
            style={{ shadowColor: '#451A03', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#FEF3C7] items-center justify-center mr-2.5">
                  <Ionicons name="trending-up-outline" size={16} color="#F59E0B" />
                </View>
                <Text className="text-[#F59E0B] text-[10px] font-extrabold uppercase tracking-wider">Products Sold</Text>
              </View>
              <Text className="text-[#171717] text-sm font-extrabold">
                {monthlyTarget > 0 ? `${monthlyProductsSold} / ${monthlyTarget} pcs` : 'Not set'}
              </Text>
            </View>

            {monthlyTarget > 0 ? (
              <View className="mt-4">
                <View className="h-2.5 rounded-full bg-[#FFF1E6] overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: monthlyProgress >= 100 ? '#16A34A' : '#F97316',
                      width: `${monthlyProgress}%`
                    }}
                  />
                </View>
                <Text className="text-stone-500 text-[11px] font-semibold mt-2">{Math.round(monthlyProgress)}% completed</Text>
              </View>
            ) : (
              <Text className="text-stone-400 text-[11px] font-semibold mt-4">
                Ask your admin to set a monthly product target in Manage Targets.
              </Text>
            )}
          </View>
        </View>

        {/* ===== STOCK LEVELS ===== */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-[#171717]">Stock Levels</Text>
              <Text className="text-sm text-stone-500 mt-0.5">Monitor today&apos;s available products</Text>
            </View>
            <View className="bg-[#FFF1E6] px-2.5 py-1 rounded-full">
              <Text className="text-[#EA580C] text-[11px] font-bold">{filteredStock.length}</Text>
            </View>
          </View>

          {/* Product Cards */}
          {filteredStock.map((item) => (
            <StockRow key={item.id} item={item} />
          ))}

          {filteredStock.length === 0 && (
            <View className="bg-white rounded-3xl p-8 border border-[#FED7AA] items-center">
              <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                <Ionicons name="cube-outline" size={30} color="#EA580C" />
              </View>
              <Text className="text-[#171717] font-extrabold text-base">No Products</Text>
              <Text className="text-stone-500 text-xs mt-1 text-center">
                {filterCategory === 'LECHON_MANOK'
                  ? 'No Lechon Manok products found'
                  : filterCategory === 'LIEMPO'
                    ? 'No Liempo products found'
                    : 'No products available'}
              </Text>
            </View>
          )}
        </View>

        {/* ===== STOCK ALERTS ===== */}
        {alertsList.length > 0 && (
          <View className="px-5 mt-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-xl font-extrabold text-[#171717]">Stock Alerts</Text>
                <Text className="text-sm text-stone-500 mt-0.5">Products that need attention</Text>
              </View>
              <View className="bg-[#FEE2E2] px-2.5 py-1 rounded-full ml-2">
                <Text className="text-[#DC2626] text-[11px] font-bold">{alertsList.length}</Text>
              </View>
            </View>

            {alertsList.map((item) => {
              const isOut = item.status === 'Out of Stock';
              return (
                <View
                  key={`alert-${item.id}`}
                  className={`rounded-3xl p-4 mb-3 border ${isOut ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}
                >
                  <View className="flex-row items-center mb-1.5">
                    <View style={{ backgroundColor: isOut ? '#FEE2E2' : '#FEF3C7' }} className="w-8 h-8 rounded-xl items-center justify-center mr-2.5">
                      <Ionicons name={isOut ? 'alert-circle' : 'warning-outline'} size={16} color={isOut ? '#DC2626' : '#F59E0B'} />
                    </View>
                    <Text className={isOut ? 'text-[#DC2626] text-sm font-extrabold' : 'text-[#D97706] text-sm font-extrabold'}>
                      {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                    </Text>
                  </View>
                  <Text className="text-[#171717] text-sm font-bold ml-10">{item.name}</Text>
                  <Text className="text-stone-500 text-xs mt-0.5 ml-10">
                    {isOut
                      ? 'No stock remaining'
                      : `Only ${item.quantity} remaining`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ===== FOOTER ===== */}
        <View className="items-center px-5 mt-8 mb-2">
          <View className="w-10 h-[3px] rounded-full bg-[#FED7AA] mb-4" />
          <Ionicons name="flame" size={16} color="#EA580C" />
          <Text className="text-[#451A03] text-xs font-extrabold tracking-widest mt-1">NEWMOON</Text>
          <Text className="text-stone-500 text-[10px] mt-0.5 tracking-wide">Lechon Manok &amp; Liempo House</Text>
          <Text className="text-[#EA580C] text-[10px] font-bold mt-0.5">Fresh from the Roasted</Text>
        </View>
      </ScrollView>

      {/* ===== SALES TODAY MODAL ===== */}
      <Modal
        visible={salesTodayModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSalesTodayModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setSalesTodayModalVisible(false)} />
          <View className="bg-white border-t border-[#FED7AA]" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' }}>
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-2xl bg-[#FFF1E6] items-center justify-center mr-3">
                  <Ionicons name="receipt-outline" size={20} color="#EA580C" />
                </View>
                <View>
                  <Text className="text-[#171717] font-extrabold text-lg">Sales Today</Text>
                  <Text className="text-stone-500 text-xs">{todaySalesList.length} total checkout(s)</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSalesTodayModalVisible(false)}
                className="w-9 h-9 rounded-full bg-[#FFF7ED] items-center justify-center border border-[#FED7AA]"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {todaySalesList.length === 0 ? (
                <View className="p-10 items-center">
                  <View className="w-16 h-16 rounded-full bg-[#FFF1E6] items-center justify-center mb-3 border border-[#FED7AA]">
                    <Ionicons name="receipt-outline" size={30} color="#EA580C" />
                  </View>
                  <Text className="text-[#171717] font-extrabold text-base">No Sales Today</Text>
                  <Text className="text-stone-500 text-xs mt-1 text-center">Transactions via POS will appear here</Text>
                </View>
              ) : (
                <>
                  {/* Daily Total */}
                  <View className="bg-[#FFF7ED] rounded-3xl p-4 mb-4 border border-[#FED7AA]">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Daily Gross Total</Text>
                        <Text className="text-[#EA580C] text-3xl font-extrabold mt-1">₱{todaySales.toLocaleString()}</Text>
                      </View>
                      <View className="bg-[#FFF1E6] px-3 py-1.5 rounded-full">
                        <Text className="text-[#EA580C] text-[11px] font-bold">{formatLocalDate()}</Text>
                      </View>
                    </View>
                  </View>

                  {pagedSales.map((item) => (
                    <SaleRow key={item?.id || item?.invoice_number} sale={item} />
                  ))}
                </>
              )}
            </ScrollView>

            {/* Pagination */}
            {todaySalesList.length > SALES_TODAY_PAGE_SIZE && (
              <View className="flex-row justify-between items-center pt-4 border-t border-[#F5EDE0] mt-4">
                <TouchableOpacity
                  onPress={() => setSalesTodayPage((p) => Math.max(1, p - 1))}
                  disabled={salesTodayPage <= 1}
                  className="flex-row items-center px-4 py-2.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA]"
                  style={{ opacity: salesTodayPage <= 1 ? 0.5 : 1 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color="#EA580C" />
                  <Text className="text-[#EA580C] font-bold text-xs ml-1.5">Prev</Text>
                </TouchableOpacity>

                <Text className="text-stone-500 text-sm font-bold">
                  Page {salesTodayPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  onPress={() => setSalesTodayPage((p) => Math.min(totalPages, p + 1))}
                  disabled={salesTodayPage >= totalPages}
                  className="flex-row items-center px-4 py-2.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA]"
                  style={{ opacity: salesTodayPage >= totalPages ? 0.5 : 1 }}
                  activeOpacity={0.7}
                >
                  <Text className="text-[#EA580C] font-bold text-xs mr-1.5">Next</Text>
                  <Ionicons name="chevron-forward" size={18} color="#EA580C" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              className="mt-4 rounded-2xl py-3.5 items-center bg-[#FFF7ED] border border-[#FED7AA]"
              onPress={() => setSalesTodayModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text className="text-[#78716C] font-bold text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DashboardScreen;