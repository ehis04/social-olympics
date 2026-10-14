/*
 * This file defines the ReportButton user-interface component.
 */

// ReportButton and ReportSheet — let anyone report a profile, competition, message or feed post for review.
import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Flag } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';

type ReportTarget = 'profile' | 'competition' | 'message' | 'feed_item';

interface Props {
  targetType: ReportTarget;
  targetId: string;
  competitionId?: string;
  // Shows only the flag icon, for tight spaces such as message rows.
  compact?: boolean;
}

const REASON_OPTIONS = [
  'Offensive or abusive content',
  'Harassment or bullying',
  'Spam or fake account',
  'Cheating or result manipulation',
  'Inappropriate name or description',
  'Other',
];

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTarget;
  targetId: string;
  competitionId?: string;
}

// Renders the report sheet, a bottom sheet for choosing a reason and sending the report.
export function ReportSheet({ visible, onClose, targetType, targetId, competitionId }: SheetProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalReason = reason === 'Other' ? customReason.trim() : reason;

  function close() {
    setReason('');
    setCustomReason('');
    onClose();
  }

  async function submit() {
    if (!finalReason) return;
    setIsSubmitting(true);
    const { error } = await apiCall('/api/report', {
      method: 'POST',
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        ...(competitionId ? { competition_id: competitionId } : {}),
        reason: finalReason,
      }),
    });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Report sent. Our team will review it.');
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable className="flex-1 bg-black/40" onPress={close} />
      <View className="bg-white rounded-t-2xl px-5 pt-5 pb-10">
        <Text className="text-base font-bold text-neutral-900">Report</Text>
        <Text className="text-sm text-neutral-500 mt-1 mb-4">
          Choose the reason that best describes the problem. Reports are reviewed by our moderation team.
        </Text>
        {REASON_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setReason(option)}
            className={`px-4 py-3 rounded-lg mb-2 border ${reason === option ? 'border-primary bg-primary-muted' : 'border-neutral-200'}`}
          >
            <Text className={`text-sm ${reason === option ? 'text-primary font-semibold' : 'text-neutral-700'}`}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
        {reason === 'Other' && (
          <TextInput
            className="border border-neutral-300 rounded-lg px-4 py-3 text-neutral-800 mb-2"
            placeholder="Tell us what's wrong"
            value={customReason}
            onChangeText={setCustomReason}
            maxLength={300}
            multiline
          />
        )}
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity className="flex-1 border border-neutral-200 rounded-lg py-3 items-center" onPress={close}>
            <Text className="text-sm font-semibold text-neutral-600">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 bg-primary rounded-lg py-3 items-center ${!finalReason || isSubmitting ? 'opacity-50' : ''}`}
            disabled={!finalReason || isSubmitting}
            onPress={() => void submit()}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text className="text-sm font-semibold text-white">Send report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Renders the report button component.
export function ReportButton({ targetType, targetId, competitionId, compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        accessibilityLabel="Report"
        className={compact ? 'p-1' : 'flex-row items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-2'}
      >
        <Flag size={compact ? 14 : 16} color="#9CA3AF" />
        {!compact && <Text className="text-sm font-medium text-neutral-700">Report</Text>}
      </TouchableOpacity>
      <ReportSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        targetType={targetType}
        targetId={targetId}
        {...(competitionId ? { competitionId } : {})}
      />
    </>
  );
}
