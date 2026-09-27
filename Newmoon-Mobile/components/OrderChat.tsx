import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { listenToOrder } from '../lib/api';

interface Sender {
  id: number;
  firstname: string;
  lastname: string;
  role: string;
  avatar_url?: string | null;
}

interface Message {
  id: number;
  order_id: number;
  sender_id: number;
  body: string;
  is_read: boolean;
  created_at: string;
  sender: Sender;
}

interface Props {
  orderId: number;
  currentUserId: number;
  onBack: () => void;
  title?: string;
}

export default function OrderChat({ orderId, currentUserId, onBack, title = 'Chat' }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/${orderId}/messages`);
      setMessages(res.data);
      // Mark as read
      await api.post(`/chat/${orderId}/read`).catch(() => {});
    } catch {}
  }, [orderId]);

  useEffect(() => {
    (async () => {
      await fetchMessages();
      setLoading(false);
    })();
    const unsubscribe = listenToOrder(orderId, '.MessageSent', (data: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data]
      );
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchMessages, orderId]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/chat/${orderId}/messages`, { body: text });
      setMessages((prev) => [...prev, res.data]);
      setInputText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      // Silently fail if chat closed
    } finally {
      setSending(false);
    }
  };

  const riderSender = useMemo(
    () => messages.find((m) => m.sender?.role === 'delivery_rider')?.sender ?? null,
    [messages]
  );
  const riderName = riderSender
    ? `${riderSender.firstname} ${riderSender.lastname}`.trim()
    : null;

  const getSenderLabel = (msg: Message) => {
    if (msg.sender_id === currentUserId) return 'You';
    return msg.sender.role === 'delivery_rider' ? 'Rider' : 'Customer';
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === currentUserId;
    const showLabel = index === 0 || messages[index - 1].sender_id !== item.sender_id;

    return (
      <View style={{ marginBottom: 4, paddingHorizontal: 16 }}>
        {showLabel && (
          <Text
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              marginBottom: 2,
              marginLeft: isMe ? 'auto' : 0,
              marginRight: isMe ? 0 : 'auto',
            }}
          >
            {getSenderLabel(item)}
          </Text>
        )}
        <View
          style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            backgroundColor: isMe ? '#F59E0B' : '#F3F4F6',
            borderRadius: 16,
            borderBottomRightRadius: isMe ? 4 : 16,
            borderBottomLeftRadius: isMe ? 16 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            maxWidth: '78%',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: isMe ? '#78350F' : '#1F2937',
              lineHeight: 20,
            }}
          >
            {item.body}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: isMe ? 'rgba(120,53,15,0.5)' : '#9CA3AF',
              marginTop: 4,
              alignSelf: 'flex-end',
            }}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        {riderSender && (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 10,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: '#FFF1E6',
            }}
          >
            {riderSender.avatar_url ? (
              <Image key={riderSender.avatar_url} source={{ uri: riderSender.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={22} color="#EA580C" />
            )}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937' }}>{riderName || title}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            {riderName ? 'Delivery Rider' : `Order #${orderId}`}
          </Text>
        </View>
        <Ionicons name="chatbubbles" size={22} color="#F59E0B" />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
              <Text style={{ fontSize: 15, color: '#9CA3AF', marginTop: 8 }}>
                No messages yet
              </Text>
              <Text style={{ fontSize: 13, color: '#D1D5DB', marginTop: 4 }}>
                Start the conversation below
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#F3F4F6',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: '#1F2937',
              maxHeight: 100,
            }}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: inputText.trim() ? '#F59E0B' : '#E5E7EB',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#78350F" />
            ) : (
              <Ionicons name="send" size={18} color={inputText.trim() ? '#78350F' : '#9CA3AF'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
