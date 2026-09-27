// app/rider/History.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../lib/api';

interface DeliveryHistory {
    id: string;
    orderNumber: string;
    customerName: string;
    customerAddress: string;
    items: string;
    totalAmount: number;
    status: 'delivered' | 'cancelled';
    date: string;
    time: string;
    earnings: number;
}

const TERMINAL_STATUSES = ['delivered', 'cancelled'];

const STATUS_META = {
    delivered: { color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle', label: 'Delivered', accent: '#F97316' },
    cancelled: { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle', label: 'Cancelled', accent: '#DC2626' },
} as const;

export default function HistoryScreen() {
    const [history, setHistory] = useState<DeliveryHistory[]>([]);
    const [filteredHistory, setFilteredHistory] = useState<DeliveryHistory[]>([]);
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

    const loadHistory = useCallback(async () => {
        try {
            const res = await api.get('/rider/orders?per_page=100');
            const orders = res.data?.data ?? [];
            const mapped: DeliveryHistory[] = orders
                .filter((o: any) => TERMINAL_STATUSES.includes(o.status))
                .map((o: any) => ({
                    id: String(o.id),
                    orderNumber: o.order_number ?? `#${o.id}`,
                    customerName: o.customer_name ?? 'Customer',
                    customerAddress: o.customer_address ?? '',
                    items: (o.items ?? []).map((i: any) => `${i.name} (x${i.quantity})`).join(', '),
                    totalAmount: o.total ?? 0,
                    status: o.status as 'delivered' | 'cancelled',
                    date: o.created_at ?? '',
                    time: o.created_at ? new Date(o.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
                    earnings: o.status === 'delivered' ? (o.delivery_fee ?? 0) : 0,
                }));
            setHistory(mapped);
        } catch {
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        filterHistory();
    }, [selectedFilter, searchQuery, selectedPeriod, history]);

    const filterHistory = () => {
        let filtered = history;

        if (selectedFilter !== 'all') {
            filtered = filtered.filter(item => item.status === selectedFilter);
        }

        if (selectedPeriod !== 'all') {
            const today = new Date();
            let filterDate: Date;

            if (selectedPeriod === 'today') {
                filterDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            } else if (selectedPeriod === 'week') {
                filterDate = new Date(today);
                filterDate.setDate(today.getDate() - 7);
            } else {
                filterDate = new Date(today);
                filterDate.setMonth(today.getMonth() - 1);
            }

            filtered = filtered.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= filterDate;
            });
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.orderNumber.toLowerCase().includes(query) ||
                item.customerName.toLowerCase().includes(query)
            );
        }

        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setFilteredHistory(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHistory();
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            delivered: '#16A34A',
            cancelled: '#DC2626',
        };
        return colors[status] || '#78716C';
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, string> = {
            delivered: 'checkmark-circle',
            cancelled: 'close-circle',
        };
        return icons[status] || 'ellipse';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            delivered: 'Delivered',
            cancelled: 'Cancelled',
        };
        return labels[status] || status;
    };

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString()}`;
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTotalEarnings = () => {
        return history
            .filter(item => item.status === 'delivered')
            .reduce((sum, item) => sum + item.earnings, 0);
    };

    const getDeliveryCount = () => {
        return history.filter(item => item.status === 'delivered').length;
    };

    const cancelledCount = history.filter(item => item.status === 'cancelled').length;

    const renderHistoryCard = (item: DeliveryHistory) => {
        const statusMeta = STATUS_META[item.status] || STATUS_META.cancelled;
        return (
            <TouchableOpacity
                key={item.id}
                className="bg-white rounded-3xl border border-[#FED7AA] overflow-hidden mb-4"
                style={{
                    shadowColor: '#7C2D12',
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    elevation: 2,
                }}
                onPress={() => { }}
                activeOpacity={0.7}
            >
                <View className="flex-row">
                    <View className="w-1.5" style={{ backgroundColor: statusMeta.accent }} />
                    <View className="flex-1 p-4">
                        {/* Header */}
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center flex-1">
                                <View className="bg-[#FFF1E6] p-2 rounded-xl mr-2.5 border border-[#FED7AA]">
                                    <Ionicons name="receipt" size={16} color="#F97316" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Order</Text>
                                    <Text className="text-[15px] font-bold text-[#7C2D12]" numberOfLines={1}>
                                        {item.orderNumber}
                                    </Text>
                                </View>
                            </View>
                            <View
                                className="px-3 py-1.5 rounded-full flex-row items-center"
                                style={{ backgroundColor: getStatusColor(item.status) + '14' }}
                            >
                                <Ionicons
                                    name={getStatusIcon(item.status) as any}
                                    size={12}
                                    color={getStatusColor(item.status)}
                                    style={{ marginRight: 4 }}
                                />
                                <Text
                                    className="text-[11px] font-extrabold uppercase tracking-wide"
                                    style={{ color: getStatusColor(item.status) }}
                                >
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>

                        {/* Customer */}
                        <View className="bg-[#FFFBF5] rounded-2xl p-3 mb-3 border border-[#F5EDE0]">
                            <View className="flex-row items-center mb-2">
                                <View className="w-8 h-8 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5">
                                    <Ionicons name="person-outline" size={15} color="#F97316" />
                                </View>
                                <Text className="text-[15px] font-bold text-[#7C2D12] flex-1" numberOfLines={1}>
                                    {item.customerName}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-[#FFF7ED] items-center justify-center mr-2.5 border border-[#FED7AA]">
                                    <Ionicons name="location-outline" size={14} color="#7C2D12" />
                                </View>
                                <Text className="text-[12px] text-stone-500 flex-1" numberOfLines={1}>
                                    {item.customerAddress || 'No address provided'}
                                </Text>
                            </View>
                        </View>

                        {/* Items */}
                        <View className="bg-[#FFF7ED] rounded-2xl p-3 mb-3 border border-[#FED7AA]">
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5">
                                    <Ionicons name="fast-food-outline" size={15} color="#F97316" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] uppercase tracking-wider text-[#7C2D12] font-semibold mb-0.5">
                                        Order Items
                                    </Text>
                                    <Text className="text-[12px] text-[#7C2D12] font-semibold flex-1" numberOfLines={1}>
                                        {item.items}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Meta row */}
                        <View className="flex-row items-center mb-3">
                            <View className="flex-row items-center">
                                <Ionicons name="calendar-outline" size={13} color="#A8A29E" />
                                <Text className="text-[11px] text-stone-500 ml-1.5">
                                    {formatDate(item.date)}
                                </Text>
                            </View>
                            <View className="w-0.5 h-3 bg-[#E7E0D8] mx-2" />
                            <Ionicons name="time-outline" size={13} color="#A8A29E" />
                            <Text className="text-[11px] text-stone-500 ml-1.5">{item.time}</Text>
                        </View>

                        {/* Footer */}
                        <View className="flex-row justify-between items-center pt-3 border-t border-[#F5EDE0]">
                            <View>
                                <Text className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Order Total</Text>
                                <Text className="text-[17px] font-extrabold text-[#F97316]">
                                    {formatCurrency(item.totalAmount)}
                                </Text>
                            </View>
                            {item.status === 'delivered' && (
                                <View className="bg-[#FFF1E6] px-3 py-2 rounded-2xl border border-[#FED7AA] items-end">
                                    <Text className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Rider Earnings</Text>
                                    <Text className="text-[14px] font-extrabold text-[#F97316]">
                                        +{formatCurrency(item.earnings)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Filter options
    const filters = [
        { id: 'all', label: 'All', icon: 'list' },
        { id: 'delivered', label: 'Delivered', icon: 'checkmark-circle' },
        { id: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
    ];

    const periodFilters = [
        { id: 'all', label: 'All Time' },
        { id: 'today', label: 'Today' },
        { id: 'week', label: 'This Week' },
        { id: 'month', label: 'This Month' },
    ];

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
                <Text className="text-white/90 text-[13px] mt-4">Loading delivery history...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#FFF7ED]">
            {/* Orange header */}
            <View
                className="bg-[#F97316] rounded-b-[36px]"
                style={{ paddingTop: 16, paddingBottom: 22, paddingHorizontal: 20 }}
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-white items-center justify-center mr-2 overflow-hidden"
                                    style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}
                                >
                                    <Image
                                        source={require('../../../../assets/images/logooos.jpg')}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                </View>
                                <Text className="text-white text-lg font-extrabold leading-5">NewMoon</Text>
                            </View>
                            <View className="flex-row items-center mt-0.5">
                                <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                                <Text className="text-white/90 text-[10px] font-bold uppercase tracking-wider ml-1.5">
                                    Delivery History
                                </Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-2xl bg-white items-center justify-center"
                        style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}
                        activeOpacity={0.8}
                        onPress={onRefresh}
                    >
                        <Ionicons name="refresh" size={20} color="#F97316" />
                    </TouchableOpacity>
                </View>

                <Text className="text-white text-2xl font-extrabold mt-5">
                    Delivery History
                </Text>
                <Text className="text-white/90 text-[13px] mt-1">
                    Your completed delivery activity
                </Text>

                {/* Stats Summary */}
                <View className="flex-row justify-between gap-3 mt-5">
                    <View className="bg-white rounded-2xl px-4 py-3.5 flex-1 border border-[#FED7AA]"
                        style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
                    >
                        <View className="flex-row items-center mb-2">
                            <View className="w-8 h-8 rounded-xl bg-[#FFF1E6] items-center justify-center mr-2.5 border border-[#FED7AA]">
                                <Ionicons name="bicycle" size={16} color="#F97316" />
                            </View>
                            <Text className="text-stone-500 text-[10px] font-semibold uppercase tracking-wider flex-1">Deliveries</Text>
                        </View>
                        <Text className="text-[#7C2D12] text-2xl font-extrabold">{getDeliveryCount()}</Text>
                        <Text className="text-[#F97316] text-[10px] font-bold mt-0.5">✓ completed</Text>
                    </View>
                    <View className="bg-white rounded-2xl px-4 py-3.5 flex-1 border border-[#FED7AA]"
                        style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
                    >
                        <View className="flex-row items-center mb-2">
                            <View className="w-8 h-8 rounded-xl bg-[#FFF7ED] items-center justify-center mr-2.5 border border-[#FED7AA]">
                                <Ionicons name="wallet-outline" size={16} color="#F59E0B" />
                            </View>
                            <Text className="text-stone-500 text-[10px] font-semibold uppercase tracking-wider flex-1">Earnings</Text>
                        </View>
                        <Text className="text-[#7C2D12] text-2xl font-extrabold">{formatCurrency(getTotalEarnings())}</Text>
                        <Text className="text-[#F97316] text-[10px] font-bold mt-0.5">{cancelledCount} cancelled</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 mt-4 border border-[#FED7AA]"
                    style={{ shadowColor: '#7C2D12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}
                >
                    <Ionicons name="search" size={18} color="#F97316" />
                    <TextInput
                        className="flex-1 ml-3 text-sm text-[#7C2D12]"
                        placeholder="Search order or customer..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#A8A29E"
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-circle" size={18} color="#F97316" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Period Filters */}
            <View className="px-4 pt-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                        {periodFilters.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                className={`px-4 py-2 rounded-full ${selectedPeriod === filter.id
                                    ? 'bg-[#F97316]'
                                    : 'bg-[#FFF1E6] border border-[#FED7AA]'
                                    }`}
                                style={selectedPeriod === filter.id ? { shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 2 } : {}}
                                onPress={() => setSelectedPeriod(filter.id)}
                                activeOpacity={0.7}
                            >
                                <Text className={`text-sm font-bold ${selectedPeriod === filter.id
                                    ? 'text-white'
                                    : 'text-[#7C2D12]'
                                    }`}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Status Filters */}
            <View className="px-4 pt-2">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                        {filters.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                className={`px-4 py-2 rounded-full flex-row items-center ${selectedFilter === filter.id
                                    ? 'bg-[#F97316]'
                                    : 'bg-[#FFF1E6] border border-[#FED7AA]'
                                    }`}
                                style={selectedFilter === filter.id ? { shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 2 } : {}}
                                onPress={() => setSelectedFilter(filter.id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={filter.icon as any}
                                    size={12}
                                    color={selectedFilter === filter.id ? '#FFFFFF' : '#7C2D12'}
                                    style={{ marginRight: 5 }}
                                />
                                <Text className={`text-sm font-bold ${selectedFilter === filter.id
                                    ? 'text-white'
                                    : 'text-[#7C2D12]'
                                    }`}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* History List */}
            <ScrollView
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ paddingBottom: 130 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#F97316"
                        colors={['#F97316']}
                    />
                }
            >
                {filteredHistory.length === 0 ? (
                    <View className="items-center justify-center py-16">
                        <View
                            className="w-24 h-24 rounded-full bg-[#FFF1E6] border border-[#FED7AA] items-center justify-center mb-4"
                            style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}
                        >
                            <Ionicons name="receipt-outline" size={44} color="#F97316" />
                        </View>
                        <Text className="text-[#7C2D12] text-lg font-extrabold mb-1">
                            {searchQuery ? 'No Matching Deliveries' : 'No Delivery History'}
                        </Text>
                        <Text className="text-stone-500 text-sm text-center px-8">
                            {searchQuery
                                ? 'Try adjusting your search.'
                                : 'Your completed and cancelled deliveries will appear here.'}
                        </Text>
                    </View>
                ) : (
                    filteredHistory.map(renderHistoryCard)
                )}
            </ScrollView>
        </SafeAreaView>
    );
}