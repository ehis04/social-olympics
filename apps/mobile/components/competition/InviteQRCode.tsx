// InviteQRCode — renders competition invite URL as a scannable QR code.
import { View, Text, TouchableOpacity, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { toast } from '@/lib/toast';
import { triggerLight } from '@/utils/helpers/haptics';

interface Props {
  inviteCode: string;
  baseUrl?: string;
}

export function InviteQRCode({ inviteCode, baseUrl }: Props) {
  const url = `${baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL}/join?code=${inviteCode}`;

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteCode);
    triggerLight();
    toast.success('Invite code copied!');
  }

  async function handleShare() {
    await Share.share({
      message: `Join my Social Olympics competition!\n\nCode: ${inviteCode}\n\nLink: ${url}`,
      url,
    });
  }

  return (
    <View className="items-center gap-4">
      <View className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <QRCode value={url} size={180} color="#111827" backgroundColor="#FFFFFF" />
      </View>

      <View className="items-center gap-1">
        <Text className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
          Invite code
        </Text>
        <TouchableOpacity onPress={handleCopy}>
          <Text className="text-2xl font-mono font-bold text-neutral-800 tracking-widest">
            {inviteCode}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-neutral-400">Tap code to copy</Text>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="border border-neutral-200 rounded-lg px-5 py-2.5"
          onPress={handleCopy}
        >
          <Text className="text-sm font-semibold text-neutral-700">Copy Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-primary rounded-lg px-5 py-2.5"
          onPress={handleShare}
        >
          <Text className="text-sm font-semibold text-white">Share Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
