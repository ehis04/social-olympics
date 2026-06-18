// Join competition modal — invite code input; QR scanner added in Branch 5.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, QrCode } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { MOBILE_ROUTES } from '@/constants/routes';

export default function JoinCompetitionModal() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setError('Invite code must be 8 characters');
      return;
    }
    setError(null);
    setLoading(true);

    const { data, error: apiError } = await apiCall<{ id: string }>('/api/competitions/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: trimmed }),
    });

    setLoading(false);

    if (apiError || !data) {
      setError(apiError?.message ?? 'Invalid or expired invite code');
      return;
    }

    toast.success('Joined competition!');
    router.dismiss();
    router.push(MOBILE_ROUTES.COMPETITION_FEED(data.id));
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.dismiss()}>
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800">Join Competition</Text>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView
        className="flex-1 px-4 pt-8"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Text className="text-sm font-semibold text-neutral-700 mb-1">Invite code</Text>
        <TextInput
          className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50 text-center text-xl font-mono tracking-widest uppercase mb-2"
          placeholder="XXXXXXXX"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            setError(null);
          }}
          onSubmitEditing={handleJoin}
        />
        {error ? <Text className="text-error text-xs mb-4">{error}</Text> : null}

        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center mb-4"
          onPress={handleJoin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Join</Text>
          )}
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-neutral-400 text-sm mb-3">or</Text>
          {/* QR scanner wired up in Branch 5 */}
          <TouchableOpacity
            className="flex-row items-center gap-2 border border-neutral-200 rounded-lg px-5 py-3"
            onPress={() => toast.info('QR scanner coming soon')}
          >
            <QrCode size={18} color="#2D6A4F" />
            <Text className="text-primary font-semibold text-sm">Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
