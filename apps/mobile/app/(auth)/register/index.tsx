// Register screen — new account creation with 16+ age enforcement.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { RegisterSchema } from '@repo/validations';
import type { z } from 'zod';

type RegisterForm = z.infer<typeof RegisterSchema>;

function formatDateOfBirthInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join('-');
}

function toIsoDateOfBirth(value: string): string {
  const [day, month, year] = value.split('-');

  if (!day || !month || !year) {
    return value;
  }

  return `${year}-${month}-${day}`;
}

function getEmailRedirectTo(): string | undefined {
  const explicitRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;

  if (explicitRedirectUrl) {
    return explicitRedirectUrl;
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, '')}/api/auth/callback`;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      display_name: '',
      email: '',
      password: '',
      date_of_birth: '',
    },
  });

  async function onSubmit(values: RegisterForm) {
    setAuthError(null);
    const emailRedirectTo = getEmailRedirectTo();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          display_name: values.display_name,
          date_of_birth: toIsoDateOfBirth(values.date_of_birth),
        },
      },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-3xl font-bold text-primary mb-2">Create account</Text>
          <Text className="text-neutral-500 text-base">Join Social Olympics: must be 16 or older</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">Display name</Text>
            <Controller
              control={control}
              name="display_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 bg-neutral-50"
                  placeholder="YourName"
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.display_name && (
              <Text className="text-error text-xs mt-1">{errors.display_name.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 bg-neutral-50"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text className="text-error text-xs mt-1">{errors.email.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">Date of birth</Text>
            <Controller
              control={control}
              name="date_of_birth"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 bg-neutral-50"
                  placeholder="DD-MM-YYYY"
                  keyboardType={
                    Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'
                  }
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(formatDateOfBirthInput(text))}
                  maxLength={10}
                  value={value}
                />
              )}
            />
            {errors.date_of_birth && (
              <Text className="text-error text-xs mt-1">{errors.date_of_birth.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">Password</Text>
            <View className="relative">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="border border-neutral-200 rounded-lg px-4 py-3 pr-12 text-neutral-900 bg-neutral-50"
                    placeholder="Min. 8 characters"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <TouchableOpacity
                className="absolute right-4 top-3"
                onPress={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text className="text-error text-xs mt-1">{errors.password.message}</Text>
            )}
          </View>

          {authError && (
            <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <Text className="text-error text-sm">{authError}</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-primary rounded-lg py-4 items-center mt-2"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Create account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-6 gap-1">
          <Text className="text-neutral-500 text-sm">Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-primary text-sm font-medium">Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
