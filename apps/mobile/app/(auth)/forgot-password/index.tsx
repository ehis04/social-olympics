// Forgot password screen — sends reset email via Supabase.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    if (!email) return;
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center">
        <TouchableOpacity className="mb-8" onPress={() => router.back()}>
          <Text className="text-primary text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-neutral-900 mb-2">Reset password</Text>
        <Text className="text-neutral-500 text-base mb-8">
          Enter your email and we'll send you a reset link.
        </Text>

        {sent ? (
          <View className="items-center gap-4">
            <CheckCircle size={48} color="#2D6A4F" />
            <Text className="text-neutral-700 text-center text-base">
              If an account exists for that email, a reset link has been sent.
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-primary font-medium">Back to sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 bg-neutral-50 mb-4"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              className="bg-primary rounded-lg py-4 items-center"
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Send reset link</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
