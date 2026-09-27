import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { useAuth } from '../../context/authContext';

interface MessageSender {
  id: number;
  firstname?: string | null;
  lastname?: string | null;
}

interface ChatMessage {
  id: number;
  order_id: number;
  sender_id: number;
  body: string;
  is_read: boolean;
  created_at: string;
  sender?: MessageSender | null;
}

interface Props {
  orderId: number;
  currentUserId: number;
  onBack: () => void;
}

const POLL_INTERVAL = 4000;

export default function OrderChat({ orderId, currentUserId, onBack }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await api.get(`/chat/${orderId}/messages`);
      const data = Array.isArray(response.data) ? response.data : [];
      setMessages(data);
    } catch {}
  }, [orderId]);

  const markAsRead = useCallback(async () => {
    try {
      await api.post(`/chat/${orderId}/read`);
    } catch {}
  }, [orderId]);

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
    markAsRead();
    const timer = setInterval(() => loadMessages(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadMessages, markAsRead]);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api.post(`/chat/${orderId}/messages`, { body });
      setInput('');
      await loadMessages();
    } catch {} finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender_id === currentUserId;
    const senderName =
      !mine && item.sender
        ? `${item.sender.firstname || ''} ${item.sender.lastname || ''}`.trim()
        : '';
    const time = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View className={`mb-3 max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
        {senderName ? <Text className="text-xs text-gray-400 mb-1 ml-1">{senderName}</Text> : null}
        <View
          className={`rounded-2xl px-4 py-2.5 ${
            mine ? 'bg-yellow-400 rounded-br-sm' : 'bg-gray-200 rounded-bl-sm'
          }`}
        >
          <Text className={`text-[15px] ${mine ? 'text-yellow-900' : 'text-gray-900'}`}>{item.body}</Text>
        </View>
        <Text className="text-[10px] text-gray-400 mt-0.5 ml-1">{time}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-4 flex-row items-center" style={{ backgroundColor: '#FBBF24' }}>
          <TouchableOpacity onPress={onBack} className="p-1 mr-3">
            <Ionicons name="arrow-back" size={24} color="#78350F" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-yellow-900 text-lg font-bold">Order Chat</Text>
            <Text className="text-yellow-800 text-xs">Order #{orderId}</Text>
          </View>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#78350F" />
        </View>

        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            className="flex-1 px-4 py-4"
            contentContainerStyle={{ paddingBottom: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View className="items-center justify-center py-16">
                <Ionicons name="chatbubble-outline" size={40} color="#9CA3AF" />
                <Text className="text-gray-400 text-sm mt-3">No messages yet. Say hi!</Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-200 bg-white">
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-[15px] text-gray-900 mr-3"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || !input.trim()}
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: '#F59E0B', opacity: sending || !input.trim() ? 0.5 : 1 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}