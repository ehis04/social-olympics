// Join competition modal — invite code input + live QR scanner via expo-camera.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, QrCode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { MOBILE_ROUTES } from '@/constants/routes';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';

export default function JoinCompetitionModal() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleJoin(inviteCode: string) {
    const trimmed = inviteCode.trim().toUpperCase();
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
      triggerError();
      return;
    }

    triggerSuccess();
    toast.success('Joined competition!');
    router.dismiss();
    router.push(MOBILE_ROUTES.COMPETITION_FEED(data.id));
  }

  function handleBarCodeScanned({ data: barcodeData }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);

    // Extract code from URL format: /join?code=XXXXXXXX or bare 8-char code
    const match =
      barcodeData.match(/[?&]code=([A-Z0-9]{8})/i) ??
      barcodeData.match(/^([A-Z0-9]{8})$/i);

    const extracted = match?.[1]?.toUpperCase() ?? null;

    if (!extracted) {
      toast.error('QR code not recognised');
      setScanned(false);
      return;
    }

    setCode(extracted);
    handleJoin(extracted);
  }

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        toast.error('Camera permission is required to scan QR codes');
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
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
          onSubmitEditing={() => handleJoin(code)}
        />
        {error ? <Text className="text-error text-xs mb-4">{error}</Text> : null}

        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center mb-4"
          onPress={() => handleJoin(code)}
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
          <TouchableOpacity
            className="flex-row items-center gap-2 border border-neutral-200 rounded-lg px-5 py-3"
            onPress={openScanner}
          >
            <QrCode size={18} color="#2D6A4F" />
            <Text className="text-primary font-semibold text-sm">Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* QR scanner modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-3">
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
              <Text className="text-white font-semibold text-base">Scan QR Code</Text>
              <View className="w-6" />
            </View>

            <CameraView
              className="flex-1"
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />

            <View className="items-center pb-8 pt-4">
              <Text className="text-white text-sm text-center px-8">
                Point your camera at the competition QR code
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
