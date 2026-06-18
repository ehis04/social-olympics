// Login screen — email/password authentication with Supabase.
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
import { LoginSchema } from '@repo/validations';
import type { z } from 'zod';

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginForm) {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
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
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-3xl font-bold text-primary mb-2">Welcome back</Text>
          <Text className="text-neutral-500 text-base">Sign in to Social Olympics</Text>
        </View>

        <View className="gap-4">
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
            <Text className="text-sm font-medium text-neutral-700 mb-1">Password</Text>
            <View className="relative">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="border border-neutral-200 rounded-lg px-4 py-3 pr-12 text-neutral-900 bg-neutral-50"
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
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
              <Text className="text-white font-semibold text-base">Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-6 gap-2">
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text className="text-primary text-sm">Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-4 gap-1">
          <Text className="text-neutral-500 text-sm">Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-primary text-sm font-medium">Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
