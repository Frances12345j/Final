import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
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
import api from '../../lib/api';

// Password recovery is unauthenticated, so it must keep working after a logout
// has ended the session.
const PUBLIC_REQUEST = { allowWhileSignedOut: true } as const;

type Step = 'email' | 'otp' | 'new';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return '';
  };

  const handleSendOtp = async () => {
    if (isLoading) return;

    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    if (emailErr) return;

    setIsLoading(true);
    try {
      const { data } = await api.post('/forgot-password', { email }, PUBLIC_REQUEST);
      setSentEmail(data.email || email);
      setOtp('');
      setOtpError('');
      setStep('otp');
      setResendIn(60);
    } catch (error: any) {
      const msg =
        error?.response?.data?.errors?.email?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to send OTP. Please try again.';
      if (error?.response?.status === 404) {
        setEmailError(msg);
      } else {
        Alert.alert('Failed to Send OTP', msg, [{ text: 'OK' }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isLoading) return;

    if (!otp) {
      setOtpError('Enter the 6-digit code from your email');
      return;
    }
    setOtpError('');

    setIsLoading(true);
    try {
      const { data } = await api.post('/forgot-password/verify', { email, otp }, PUBLIC_REQUEST);
      setResetToken(data.reset_token);
      setPasswordError('');
      setStep('new');
    } catch (error: any) {
      setOtpError(
        error?.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (resendIn > 0 || isLoading) return;
    setOtpError('');
    handleSendOtp();
  };

  const handleResetPassword = async () => {
    if (isLoading) return;

    let passwordErr = '';
    if (!newPassword) {
      passwordErr = 'Enter a new password';
    } else if (newPassword.length < 8) {
      passwordErr = 'Password must be at least 8 characters';
    } else if (newPassword !== confirmPassword) {
      passwordErr = 'Passwords do not match';
    }
    setPasswordError(passwordErr);
    if (passwordErr) return;

    setIsLoading(true);
    try {
      await api.post('/forgot-password/reset', {
        email,
        reset_token: resetToken,
        password: newPassword,
        password_confirmation: confirmPassword,
      }, PUBLIC_REQUEST);
      Alert.alert(
        'Password Reset Successful',
        'You can now sign in with your new password.',
        [{ text: 'Continue', onPress: () => router.replace('/Login' as any) }]
      );
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message || 'Unable to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: 'email' as Step, label: 'Email' },
    { key: 'otp' as Step, label: 'OTP' },
    { key: 'new' as Step, label: 'New Password' },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

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
            <View className="bg-[#171717] px-6 pt-8 pb-20 rounded-b-[40px] overflow-hidden">
              <View className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-orange-600/10" />
              <View className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-amber-500/10" />

              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-10 left-5 w-10 h-10 rounded-full bg-white/10 items-center justify-center z-10"
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>

              <Animated.View
                className="items-center pt-4"
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
              >
                <View className="relative items-center justify-center">
                  <View className="absolute w-[88px] h-[88px] rounded-[22px] bg-orange-500/25" />
                  <View className="w-[76px] h-[76px] rounded-2xl shadow-lg shadow-black/50">
                    <Image
                      source={require('../../assets/images/logooos.jpg')}
                      className="w-full h-full rounded-2xl border-[2px] border-[#FFF8ED]"
                      resizeMode="cover"
                    />
                  </View>
                </View>

                <Text className="text-[22px] font-extrabold text-[#FFF] mt-3 tracking-wide">
                  NewMoon
                </Text>
                <Text className="text-[10px] font-medium text-[#D6D3D1] uppercase mt-1 tracking-[3px]">
                  Lechon Manok & Liempo House
                </Text>
                <View className="bg-orange-500/15 border border-orange-500/40 rounded-full px-3 py-1 mt-3">
                  <Text className="text-[#F97316] text-[10px] font-bold tracking-widest uppercase">
                    🔥 Reset Your Password
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* Form Bottom Sheet */}
            <View className="relative flex-1 px-6 -mt-10 pb-8 pt-2">
              <View className="absolute top-16 -left-10 w-40 h-40 rounded-full bg-[#FED7AA]/45" />
              <View className="absolute top-56 -right-14 w-52 h-52 rounded-full bg-[#FDBA74]/25" />

              <Animated.View
                className="bg-[#FFFEFB] rounded-t-[32px] rounded-b-3xl border border-[#F5EDE0] shadow-lg shadow-black/5 p-6"
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
              >
                {/* Step indicator */}
                <View className="flex-row items-center justify-center gap-2 mb-6 mt-1">
                  {steps.map((s, i) => (
                    <View key={s.key} className="flex-row items-center">
                      {i > 0 && (
                        <View
                          className={`h-[2px] w-8 rounded-full ${
                            i <= stepIndex ? 'bg-[#F97316]' : 'bg-[#E7E0D8]'
                          }`}
                        />
                      )}
                      <View
                        className={`h-8 w-8 rounded-full items-center justify-center border-2 ${
                          i === stepIndex
                            ? 'bg-[#F97316] border-[#F97316]'
                            : i < stepIndex
                              ? 'bg-[#FDE8D7] border-[#F97316]'
                              : 'bg-white border-[#E7E0D8]'
                        }`}
                      >
                        {i < stepIndex ? (
                          <Ionicons name="checkmark" size={14} color="#F97316" />
                        ) : (
                          <Text
                            className={`text-xs font-bold ${
                              i === stepIndex ? 'text-white' : 'text-[#A8A29E]'
                            }`}
                          >
                            {i + 1}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {step === 'email' && (
                  <View>
                    <Text className="text-[26px] font-bold text-[#171717] text-center">
                      Forgot Password?
                    </Text>
                    <Text className="text-sm text-[#78716C] text-center mt-1.5 leading-5">
                      Enter the email registered to your account and we&apos;ll send you a
                      one-time code.
                    </Text>

                    <View className="mt-6 mb-4">
                      <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
                        Email Address
                      </Text>
                      <View
                        className={`flex-row items-center bg-white rounded-xl border h-[56px] px-4 ${
                          emailError ? 'border-[#DC2626]' : 'border-[#E7E0D8]'
                        }`}
                      >
                        <Ionicons name="mail-outline" size={20} color="#A8A29E" />
                        <TextInput
                          className="flex-1 px-3 text-base text-[#1C1917]"
                          placeholder="Enter your registered email"
                          placeholderTextColor="#A8A29E"
                          value={email}
                          onChangeText={(text) => {
                            setEmail(text);
                            setEmailError('');
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                          onSubmitEditing={handleSendOtp}
                        />
                      </View>
                      {emailError ? (
                        <Text className="text-[#DC2626] text-xs mt-1 ml-1">{emailError}</Text>
                      ) : null}
                    </View>

                    <View className="rounded-2xl shadow-lg shadow-[#EA580C]/30">
                      <TouchableOpacity
                        onPress={handleSendOtp}
                        disabled={isLoading}
                        activeOpacity={0.85}
                        className={`rounded-2xl overflow-hidden ${isLoading ? 'opacity-70' : ''}`}
                      >
                        <LinearGradient
                          colors={['#EA580C', '#F97316', '#F59E0B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="h-14"
                          style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        >
                          {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Text className="text-white text-base font-bold tracking-wide">
                                Send OTP Code
                              </Text>
                              <Ionicons
                                name="mail-open-outline"
                                size={17}
                                color="#fff"
                                style={{ marginLeft: 8 }}
                              />
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {step === 'otp' && (
                  <View>
                    <Text className="text-[24px] font-bold text-[#171717] text-center">
                      Enter OTP Code
                    </Text>
                    <Text className="text-sm text-[#78716C] text-center mt-1.5 leading-5">
                      We sent a 6-digit code to{' '}
                      <Text className="font-bold text-[#F97316]">{sentEmail || email}</Text>
                    </Text>

                    <View className="mt-6 mb-2">
                      <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
                        6-Digit Code
                      </Text>
                      <View
                        className={`flex-row items-center bg-white rounded-xl border h-[56px] px-4 ${
                          otpError ? 'border-[#DC2626]' : 'border-[#E7E0D8]'
                        }`}
                      >
                        <Ionicons name="keypad-outline" size={20} color="#A8A29E" />
                        <TextInput
                          className="flex-1 px-3 text-base text-[#1C1917] tracking-[10px] text-center"
                          placeholder="••••••"
                          placeholderTextColor="#A8A29E"
                          value={otp}
                          onChangeText={(text) => {
                            setOtp(text.replace(/[^0-9]/g, ''));
                            setOtpError('');
                          }}
                          keyboardType="number-pad"
                          maxLength={6}
                          onSubmitEditing={handleVerifyOtp}
                        />
                      </View>
                      {otpError ? (
                        <Text className="text-[#DC2626] text-xs mt-1 ml-1">{otpError}</Text>
                      ) : null}
                      <Text className="text-[#A8A29E] text-[11px] mt-2 ml-1">
                        Code expires in 10 minutes
                      </Text>
                    </View>

                    <View className="rounded-2xl shadow-lg shadow-[#EA580C]/30 mt-4">
                      <TouchableOpacity
                        onPress={handleVerifyOtp}
                        disabled={isLoading}
                        activeOpacity={0.85}
                        className={`rounded-2xl overflow-hidden ${isLoading ? 'opacity-70' : ''}`}
                      >
                        <LinearGradient
                          colors={['#EA580C', '#F97316', '#F59E0B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="h-14"
                          style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        >
                          {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Text className="text-white text-base font-bold tracking-wide">
                                Verify Code
                              </Text>
                              <Ionicons
                                name="shield-checkmark-outline"
                                size={17}
                                color="#fff"
                                style={{ marginLeft: 8 }}
                              />
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center items-center mt-5">
                      <Text className="text-[#78716C] text-sm">
                        Didn&apos;t receive it?{' '}
                      </Text>
                      <TouchableOpacity onPress={handleResendOtp} disabled={resendIn > 0 || isLoading}>
                        <Text
                          className={`text-sm font-bold ${
                            resendIn > 0 ? 'text-[#A8A29E]' : 'text-[#F97316]'
                          }`}
                        >
                          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {step === 'new' && (
                  <View>
                    <Text className="text-[24px] font-bold text-[#171717] text-center">
                      Set New Password
                    </Text>
                    <Text className="text-sm text-[#78716C] text-center mt-1.5 leading-5">
                      Choose a strong password you&apos;ll remember.
                    </Text>

                    <View className="mt-6 mb-4">
                      <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
                        New Password
                      </Text>
                      <View className="flex-row items-center bg-white rounded-xl border h-[56px] px-4 border-[#E7E0D8]">
                        <Ionicons name="lock-closed-outline" size={20} color="#A8A29E" />
                        <TextInput
                          className="flex-1 px-3 text-base text-[#1C1917]"
                          placeholder="At least 8 characters"
                          placeholderTextColor="#A8A29E"
                          secureTextEntry={!showPassword}
                          value={newPassword}
                          onChangeText={(text) => {
                            setNewPassword(text);
                            setPasswordError('');
                          }}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="pl-2">
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#A8A29E"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 mt-4 uppercase tracking-wider">
                        Confirm New Password
                      </Text>
                      <View className="flex-row items-center bg-white rounded-xl border h-[56px] px-4 border-[#E7E0D8]">
                        <Ionicons name="lock-closed-outline" size={20} color="#A8A29E" />
                        <TextInput
                          className="flex-1 px-3 text-base text-[#1C1917]"
                          placeholder="Re-enter your new password"
                          placeholderTextColor="#A8A29E"
                          secureTextEntry={!showConfirm}
                          value={confirmPassword}
                          onChangeText={(text) => {
                            setConfirmPassword(text);
                            setPasswordError('');
                          }}
                        />
                        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="pl-2">
                          <Ionicons
                            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#A8A29E"
                          />
                        </TouchableOpacity>
                      </View>
                      {passwordError ? (
                        <Text className="text-[#DC2626] text-xs mt-2 ml-1">{passwordError}</Text>
                      ) : null}
                      <View className="bg-[#FFF1E6] rounded-xl border border-[#FFE3C9] px-4 py-3 mt-4">
                        <Text className="text-[#9A3412] text-xs leading-5">
                          Password must have at least 8 characters.
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-2xl shadow-lg shadow-[#EA580C]/30">
                      <TouchableOpacity
                        onPress={handleResetPassword}
                        disabled={isLoading}
                        activeOpacity={0.85}
                        className={`rounded-2xl overflow-hidden ${isLoading ? 'opacity-70' : ''}`}
                      >
                        <LinearGradient
                          colors={['#EA580C', '#F97316', '#F59E0B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="h-14"
                          style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        >
                          {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Text className="text-white text-base font-bold tracking-wide">
                                Reset Password
                              </Text>
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={17}
                                color="#fff"
                                style={{ marginLeft: 8 }}
                              />
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Back to login */}
                <View className="flex-row justify-center mt-6">
                  <Text className="text-[#78716C] text-sm">Remembered it? </Text>
                  <TouchableOpacity onPress={() => router.replace('/Login' as any)}>
                    <Text className="text-[#F97316] text-sm font-bold">Back to Sign In</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Text className="text-[#A8A29E] text-[10px] text-center mt-5 tracking-[3px] font-semibold uppercase">
                Traditional Flavors • Authentic Taste
              </Text>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}