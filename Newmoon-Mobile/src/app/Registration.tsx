import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import api from '../../lib/api';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Availability checks are unauthenticated, so they must keep working after a
// logout has ended the session.
const PUBLIC_REQUEST = { allowWhileSignedOut: true } as const;

type RegisterFormData = {
  username: string;
  firstname: string;
  lastname: string;
  middlename: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  password_confirmation: string;
};

type RegisterFormField = keyof RegisterFormData;

const REQUIRED_FIELDS: RegisterFormField[] = [
  'username',
  'firstname',
  'lastname',
  'email',
  'password',
  'password_confirmation',
];

type InputConfig = {
  key: RegisterFormField;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  required: boolean;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
};

const INPUT_FIELDS: InputConfig[] = [
  { key: 'firstname', icon: 'person-outline', label: 'First Name', placeholder: 'Enter first name', required: true, autoCapitalize: 'words' },
  { key: 'middlename', icon: 'person-circle-outline', label: 'Middle Name', placeholder: 'Enter middle name (optional)', required: false, autoCapitalize: 'words' },
  { key: 'lastname', icon: 'people-outline', label: 'Last Name', placeholder: 'Enter last name', required: true, autoCapitalize: 'words' },
  { key: 'username', icon: 'at-outline', label: 'Username', placeholder: 'Choose a username', required: true, autoCapitalize: 'none' },
  { key: 'email', icon: 'mail-outline', label: 'Email Address', placeholder: 'Enter email address', required: true, keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'phone', icon: 'call-outline', label: 'Phone Number', placeholder: 'Enter phone number (optional)', required: false, keyboardType: 'phone-pad' },
  { key: 'address', icon: 'home-outline', label: 'Address', placeholder: 'Enter your address (optional)', required: false, multiline: true },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<RegisterFormField | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

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

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    firstname: '',
    lastname: '',
    middlename: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    password_confirmation: '',
  });

  const validateField = (name: RegisterFormField, value: string) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'username':
        if (!value) newErrors.username = 'Username is required';
        else if (value.length < 3) newErrors.username = 'Username must be at least 3 characters';
        else if (value.length > 255) newErrors.username = 'Username must be less than 255 characters';
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) newErrors.username = 'Username can only contain letters, numbers, and underscores';
        else delete newErrors.username;
        break;

      case 'firstname':
        if (!value) newErrors.firstname = 'First name is required';
        else if (value.length < 2) newErrors.firstname = 'First name must be at least 2 characters';
        else delete newErrors.firstname;
        break;

      case 'lastname':
        if (!value) newErrors.lastname = 'Last name is required';
        else if (value.length < 2) newErrors.lastname = 'Last name must be at least 2 characters';
        else delete newErrors.lastname;
        break;

      case 'email':
        if (!value) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(value)) newErrors.email = 'Please enter a valid email address';
        else delete newErrors.email;
        break;

      case 'phone':
        if (value && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(value)) {
          newErrors.phone = 'Please enter a valid phone number';
        } else {
          delete newErrors.phone;
        }
        break;

      case 'password':
        if (!value) newErrors.password = 'Password is required';
        else if (value.length < 8) newErrors.password = 'Password must be at least 8 characters';
        else if (!/[A-Z]/.test(value)) newErrors.password = 'Password must contain at least one uppercase letter';
        else if (!/[a-z]/.test(value)) newErrors.password = 'Password must contain at least one lowercase letter';
        else if (!/[0-9]/.test(value)) newErrors.password = 'Password must contain at least one number';
        else delete newErrors.password;

        if (formData.password_confirmation && value !== formData.password_confirmation) {
          newErrors.password_confirmation = 'Passwords do not match';
        } else if (formData.password_confirmation) {
          delete newErrors.password_confirmation;
        }
        break;

      case 'password_confirmation':
        if (!value) newErrors.password_confirmation = 'Please confirm your password';
        else if (value !== formData.password) newErrors.password_confirmation = 'Passwords do not match';
        else delete newErrors.password_confirmation;
        break;

      default:
        delete newErrors[name];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name: RegisterFormField, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) return true;
    try {
      const response = await api.post('/check-username', { username }, PUBLIC_REQUEST);
      if (!response.data.available) {
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return true;
    try {
      const response = await api.post('/check-email', { email }, PUBLIC_REQUEST);
      if (!response.data.available) {
        setErrors(prev => ({ ...prev, email: 'Email is already registered' }));
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const handleRegister = async () => {
    const fieldsToValidate = REQUIRED_FIELDS;
    let isValid = true;

    fieldsToValidate.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });

    if (!agreeTerms) {
      Alert.alert('Terms & Conditions', 'Please agree to the Terms and Conditions to continue.');
      return;
    }

    if (!isValid) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    const isEmailAvailable = await checkEmailAvailability(formData.email);

    if (!isUsernameAvailable || !isEmailAvailable) return;

    setIsLoading(true);

    try {
      const result = await register(formData);

      if (result.success) {
        Alert.alert(
          'Registration Successful! 🎉',
          'Your customer account has been created successfully. Please login to continue.',
          [{ text: 'Go to Login', onPress: () => router.replace('/Login') }]
        );
      } else {
        if (result.errors) setErrors(result.errors);
        Alert.alert('Registration Failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderSectionHeader = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    extraClass = 'mb-4'
  ) => (
    <View className={`flex-row items-center ${extraClass}`}>
      <View className="w-9 h-9 rounded-xl bg-[#FFF1E6] items-center justify-center">
        <Ionicons name={icon} size={18} color="#F97316" />
      </View>
      <Text className="text-xs font-bold text-[#171717] tracking-wider uppercase ml-3">
        {label}
      </Text>
      <View className="flex-1 h-px bg-[#F5EDE0] ml-3" />
    </View>
  );

  const renderInput = (config: InputConfig) => {
    const { key, icon, label, placeholder, required, keyboardType, autoCapitalize, multiline } = config;
    const isFocused = focusedField === key;
    const hasError = !!errors[key];

    return (
      <View key={key} className="mb-4">
        <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
          {label}{' '}
          {!required && <Text className="text-[#A8A29E] font-normal normal-case tracking-normal">Optional</Text>}
        </Text>
        <View className={`flex-row items-center bg-[#FFFBF7] rounded-2xl border px-4 ${
          multiline ? 'min-h-[56px] items-start py-3' : 'h-[56px]'
        } ${
          hasError ? 'border-[#DC2626]' : isFocused ? 'border-[#F97316]' : 'border-[#E7E0D8]'
        }`}>
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? '#F97316' : '#A8A29E'}
          />
          <TextInput
            className={`flex-1 px-3 text-[15px] text-[#1C1917] ${multiline ? 'text-top' : ''}`}
            placeholder={placeholder}
            placeholderTextColor="#A8A29E"
            value={formData[key]}
            onChangeText={(text) => {
              const val = key === 'username' || key === 'email' ? text.toLowerCase() : text;
              handleInputChange(key, val);
            }}
            onFocus={() => setFocusedField(key)}
            onBlur={() => setFocusedField(null)}
            secureTextEntry={config.secure}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize || 'none'}
            autoCorrect={false}
            multiline={multiline}
            numberOfLines={multiline ? 3 : undefined}
          />
        </View>
        {hasError && (
          <Text className="text-[#DC2626] text-xs mt-1.5 ml-1">{errors[key]}</Text>
        )}
      </View>
    );
  };

  const renderPasswordField = (
    key: Extract<RegisterFormField, 'password' | 'password_confirmation'>,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    placeholder: string,
    value: string,
    visible: boolean,
    toggle: () => void
  ) => {
    const isFocused = focusedField === key;
    const hasError = !!errors[key];

    return (
      <View className="mb-4">
        <Text className="text-[11px] font-bold text-[#57534E] mb-2 ml-1 uppercase tracking-wider">
          {label} <Text className="text-[#F97316]">*</Text>
        </Text>
        <View className={`flex-row items-center bg-[#FFFBF7] rounded-2xl border h-[56px] px-4 ${
          hasError ? 'border-[#DC2626]' : isFocused ? 'border-[#F97316]' : 'border-[#E7E0D8]'
        }`}>
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? '#F97316' : '#A8A29E'}
          />
          <TextInput
            className="flex-1 px-3 text-[15px] text-[#1C1917]"
            placeholder={placeholder}
            placeholderTextColor="#A8A29E"
            secureTextEntry={!visible}
            value={value}
            onChangeText={(text) => handleInputChange(key, text)}
            onFocus={() => setFocusedField(key)}
            onBlur={() => setFocusedField(null)}
          />
          <TouchableOpacity onPress={toggle} className="pl-2">
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#A8A29E"
            />
          </TouchableOpacity>
        </View>
        {hasError && (
          <Text className="text-[#DC2626] text-xs mt-1.5 ml-1">{errors[key]}</Text>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#FFF8ED]">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="grow"
        >
          <SafeAreaView className="flex-1">
            {/* Dark Restaurant Brand Cover */}
            <View className="bg-[#171717] px-6 pt-3 pb-16 rounded-b-[40px] overflow-hidden">
              {/* subtle roasted glow accents */}
              <View className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-orange-600/10" />
              <View className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-amber-500/10" />

              {/* Back Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                className="self-start w-10 h-10 rounded-full bg-white/10 items-center justify-center mb-6"
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <Animated.View
                className="items-center"
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
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

            {/* Registration Bottom Sheet - overlaps the dark section */}
            <View className="relative flex-1 px-6 -mt-8 pb-8 pt-2">
              {/* subtle cream background decorations */}
              <View className="absolute top-16 -left-10 w-40 h-40 rounded-full bg-[#FED7AA]/45" />
              <View className="absolute top-40 -right-14 w-52 h-52 rounded-full bg-[#FDBA74]/25" />
              <View className="absolute top-72 -left-8 w-24 h-24 rounded-full bg-[#FED7AA]/40" />

              <Animated.View
                className="bg-[#FFFEFB] rounded-t-[32px] rounded-b-3xl border border-[#F5EDE0] shadow-lg shadow-black/5 p-6"
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
              >
                {/* Registration Header */}
                <View className="mb-6">
                  <Text className="text-[26px] font-bold text-[#171717]">
                    Create your account
                  </Text>
                  <Text className="text-sm text-[#78716C] mt-1.5">
                    Join NewMoon today
                  </Text>
                  <View className="w-12 h-[3px] bg-[#F97316] rounded-full mt-3" />
                </View>

                {/* Personal Information Section */}
                {renderSectionHeader('person-outline', 'Account Information')}

                {INPUT_FIELDS.map(renderInput)}

                {/* Security Section */}
                {renderSectionHeader('shield-checkmark-outline', 'Account Security', 'mt-6')}

                {/* Password */}
                {renderPasswordField(
                  'password',
                  'lock-closed-outline',
                  'Password',
                  'Create a strong password',
                  formData.password,
                  showPassword,
                  () => setShowPassword(!showPassword)
                )}
                {!errors.password && (
                  <View className="bg-[#FFFBF7] border border-[#F5EDE0] rounded-xl px-3.5 py-2.5 mt-1 mb-4">
                    <Text className="text-[11px] text-[#A8A29E] leading-4">
                      Password requirements: Minimum 8 characters with at least one uppercase letter, one lowercase letter, and one number.
                    </Text>
                  </View>
                )}

                {/* Confirm Password */}
                {renderPasswordField(
                  'password_confirmation',
                  'lock-closed-outline',
                  'Confirm Password',
                  'Confirm your password',
                  formData.password_confirmation,
                  showConfirmPassword,
                  () => setShowConfirmPassword(!showConfirmPassword)
                )}

                {/* Terms and Conditions */}
                <TouchableOpacity
                  className={`flex-row items-center mb-6 rounded-2xl border px-4 py-3.5 ${
                    agreeTerms ? 'border-[#F97316] bg-[#FFF1E6]' : 'border-[#E7E0D8] bg-[#FFFBF7]'
                  }`}
                  onPress={() => setAgreeTerms(!agreeTerms)}
                  activeOpacity={0.7}
                >
                  <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 ${
                    agreeTerms ? 'bg-[#F97316] border-[#F97316]' : 'border-[#A8A29E] bg-transparent'
                  }`}>
                    {agreeTerms && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </View>
                  <Text className="text-[#57534E] text-[13px] flex-1 leading-5">
                    I agree to the{' '}
                    <Text className="text-[#F97316] font-bold">Terms and Conditions</Text>
                    {' '}and{' '}
                    <Text className="text-[#F97316] font-bold">Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                {/* Create Account Button - Orange to Amber */}
                <View className="rounded-2xl shadow-lg shadow-[#EA580C]/30">
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={isLoading || !agreeTerms}
                    activeOpacity={0.85}
                    className={`rounded-2xl overflow-hidden ${
                      isLoading || !agreeTerms ? 'opacity-50' : ''
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
                        <View className="flex-row items-center justify-center">
                          <ActivityIndicator color="#fff" size="small" />
                          <Text className="text-white text-[16px] font-semibold ml-2.5">
                            Creating Account...
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-center">
                          <Text className="text-white text-[16px] font-bold tracking-wide">
                            Create Account
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#fff"
                            style={{ marginLeft: 8 }}
                          />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Login Link */}
                <View className="flex-row justify-center mt-6">
                  <Text className="text-[#78716C] text-sm">
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/Login')}>
                    <Text className="text-[#F97316] text-sm font-bold">Sign In</Text>
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
    </View>
  );
}