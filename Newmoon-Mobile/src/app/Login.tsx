import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/authContext';
import { getDashboardPath } from '../../lib/userType';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, userType, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [navigationReady, setNavigationReady] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showAccountNotFoundModal, setShowAccountNotFoundModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setNavigationReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated && navigationReady) {
      const redirectPath = getDashboardPath(userType || 'staff');
      router.replace(redirectPath as any);
    }
  }, [isAuthenticated, userType, navigationReady]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (authLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FFF8ED]">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  const validateUsername = (username: string) => {
    if (!username) return 'Username is required';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    return '';
  };

  const handleLogin = async () => {
    if (isLoading) return;

    const usernameValidationError = validateUsername(username);
    const passwordValidationError = validatePassword(password);

    setUsernameError(usernameValidationError);
    setPasswordError(passwordValidationError);

    if (usernameValidationError || passwordValidationError) return;

    setIsLoading(true);

    try {
      const result = await login(username.trim(), password);

      if (result?.success) {
        const userTypeFromResult = result.userType || 'staff';
        const redirectPath = getDashboardPath(userTypeFromResult);
        const welcomeLabel =
          userTypeFromResult === 'rider'
            ? 'Rider'
            : userTypeFromResult === 'customer'
              ? 'Customer'
              : 'Staff';

        Alert.alert('Login Successful', `Welcome ${welcomeLabel}!`, [
          {
            text: 'Continue',
            onPress: () => {
              setTimeout(() => {
                try {
                  router.replace(redirectPath as any);
                } catch {
                  try {
                    router.push(redirectPath as any);
                  } catch {}
                }
              }, 300);
            },
          },
        ]);
      } else {
        if (result?.errorCode === 'account_not_found') {
          setShowAccountNotFoundModal(true);
        } else {
          Alert.alert(
            'Login Failed',
            result?.error || 'Incorrect username or password',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to connect to server',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FFF8ED]">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="grow"
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView className="flex-1">
            {/* Dark Restaurant Brand Cover */}
            <View className="bg-[#171717] px-6 pt-6 pb-20 rounded-b-[40px] overflow-hidden">
              {/* subtle roasted glow accents */}
              <View className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-orange-600/10" />
              <View className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-amber-500/10" />

              <Animated.View
                className="items-center pt-2"
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {/* Compact Logo */}
                <View className="relative items-center justify-center">
                  <View className="absolute w-[96px] h-[96px] rounded-[24px] bg-orange-500/25" />
                  <View className="w-[84px] h-[84px] rounded-2xl shadow-lg shadow-black/50">
                    <Image
                      source={require('../../assets/images/logooos.jpg')}
                      className="w-full h-full rounded-2xl border-[2px] border-[#FFF8ED]"
                      resizeMode="cover"
                    />
                  </View>
                </View>

                {/* Brand Text */}
                <Text className="text-[28px] font-extrabold text-[#FFF] mt-4 tracking-wide">
                  NewMoon
                </Text>
                <Text className="text-[11px] font-medium text-[#D6D3D1] uppercase mt-1 tracking-[3px]">
                  Lechon Manok & Liempo House
                </Text>

                {/* Fresh From The Grill Badge */}
                <View className="bg-orange-500/15 border border-orange-500/40 rounded-full px-4 py-1.5 mt-4">
                  <Text className="text-[#F97316] text-xs font-bold tracking-widest uppercase">
                    🔥 Fresh From The Grill
                  </Text>
                </View>

                {/* subtle grill lines */}
                <View className="flex-row items-center justify-center gap-1.5 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View
                      key={i}
                      className="w-4 h-[2px] rounded-full bg-orange-500/50"
                    />
                  ))}
                </View>
              </Animated.View>
            </View>

            {/* Login Bottom Sheet - overlaps the dark section */}
            <View className="relative flex-1 px-6 -mt-10 pb-8 pt-2">
              {/* subtle cream background decorations */}
              <View className="absolute top-16 -left-10 w-40 h-40 rounded-full bg-[#FED7AA]/45" />
              <View className="absolute top-40 -right-14 w-52 h-52 rounded-full bg-[#FDBA74]/25" />
              <View className="absolute top-72 -left-8 w-24 h-24 rounded-full bg-[#FED7AA]/40" />

              <Animated.View
                className="bg-[#FFFEFB] rounded-t-[32px] rounded-b-3xl border border-[#F5EDE0] shadow-lg shadow-black/5 p-6"
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {/* Welcome Text */}
                <View className="mb-6 items-center">
                  <Text className="text-[26px] font-bold text-[#171717]">
                    Welcome back 👋
                  </Text>
                  <Text className="text-sm text-[#78716C] mt-1.5">
                    Sign in to continue to NewMoon
                  </Text>
                </View>

                {/* Username */}
                <View className="mb-4">
                  <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
                    Username
                  </Text>
                  <View
                    className={`flex-row items-center bg-white rounded-xl border h-[56px] px-4 ${
                      usernameError
                        ? 'border-[#DC2626]'
                        : usernameFocused
                          ? 'border-[#F97316]'
                          : 'border-[#E7E0D8]'
                    }`}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={usernameFocused ? '#F97316' : '#A8A29E'}
                    />
                    <TextInput
                      className="flex-1 px-3 text-base text-[#1C1917]"
                      placeholder="Enter your username"
                      placeholderTextColor="#A8A29E"
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        setUsernameError('');
                      }}
                      onFocus={() => setUsernameFocused(true)}
                      onBlur={() => setUsernameFocused(false)}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {usernameError ? (
                    <Text className="text-[#DC2626] text-xs mt-1 ml-1">
                      {usernameError}
                    </Text>
                  ) : null}
                </View>

                {/* Password */}
                <View className="mb-2">
                  <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
                    Password
                  </Text>
                  <View
                    className={`flex-row items-center bg-white rounded-xl border h-[56px] px-4 ${
                      passwordError
                        ? 'border-[#DC2626]'
                        : passwordFocused
                          ? 'border-[#F97316]'
                          : 'border-[#E7E0D8]'
                    }`}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={passwordFocused ? '#F97316' : '#A8A29E'}
                    />
                    <TextInput
                      className="flex-1 px-3 text-base text-[#1C1917]"
                      placeholder="Enter your password"
                      placeholderTextColor="#A8A29E"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setPasswordError('');
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="pl-2"
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#A8A29E"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <Text className="text-[#DC2626] text-xs mt-1 ml-1">
                      {passwordError}
                    </Text>
                  ) : null}
                </View>

                {/* Forgot Password */}
                <View className="flex-row justify-end mb-6 mt-2">
                  <TouchableOpacity
                    className="py-1"
                    onPress={() => router.push('/ForgotPassword' as any)}
                  >
                    <Text className="text-[#F97316] text-sm font-semibold">
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Premium Orange Sign In Button */}
                <View className="rounded-2xl shadow-lg shadow-[#EA580C]/30">
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.85}
                    className={`rounded-2xl overflow-hidden ${
                      isLoading ? 'opacity-70' : ''
                    }`}
                  >
                    <LinearGradient
                      colors={['#EA580C', '#F97316', '#F59E0B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="h-14"
                      style={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isLoading ? (
                        <View className="flex-row items-center">
                          <ActivityIndicator color="#fff" size="small" />
                          <Text className="text-white text-base font-semibold ml-2.5">
                            Logging in...
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-center">
                          <Text className="text-white text-base font-bold tracking-wide">
                            Sign In
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={17}
                            color="#fff"
                            style={{ marginLeft: 8 }}
                          />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-6">
                  <Text className="text-[#78716C] text-sm">
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/Registration')}>
                    <Text className="text-[#F97316] text-sm font-bold">
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Footer */}
              <Text className="text-[#A8A29E] text-[10px] text-center mt-5 tracking-[3px] font-semibold uppercase">
                Traditional Flavors • Authentic Taste
              </Text>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Not Found Modal */}
      <Modal
        visible={showAccountNotFoundModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountNotFoundModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-8">
          <View className="w-full max-w-[340px] bg-[#FFF8ED] rounded-3xl border border-[#F5EDE0] shadow-2xl p-7 items-center">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center mb-4 border-2 border-[#F5EDE0] overflow-hidden shadow-lg shadow-black/10">
              <Image
                source={require('../../assets/images/logooos.jpg')}
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
              />
            </View>

            <Text className="text-xl font-bold text-[#171717] text-center mb-2">
              Account Not Found
            </Text>
            <Text className="text-sm text-[#78716C] text-center leading-6 mb-6">
              This account has not been created yet. Sign up to create your account.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowAccountNotFoundModal(false);
                setTimeout(() => router.push('/Registration'), 200);
              }}
              activeOpacity={0.85}
              className="w-full mb-3 rounded-2xl overflow-hidden shadow-lg shadow-[#EA580C]/25"
            >
              <LinearGradient
                colors={['#EA580C', '#F97316', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="h-12"
                style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
              >
                <Text className="text-white text-base font-bold tracking-wide">
                  Create Account
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAccountNotFoundModal(false)}
              activeOpacity={0.85}
              className="w-full py-3.5 rounded-xl items-center border border-[#E7E0D8] bg-white"
            >
              <Text className="text-[#57534E] text-sm font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}