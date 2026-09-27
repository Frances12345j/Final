import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import OrderChat from '../../../components/OrderChat';

export default function CustomerChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();

  return (
    <OrderChat
      orderId={Number(orderId)}
      currentUserId={user?.id ?? 0}
      onBack={() => router.back()}
      title="Rider"
    />
  );
}
