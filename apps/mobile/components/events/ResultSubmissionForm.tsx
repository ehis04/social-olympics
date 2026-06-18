// Result submission form — adapts input fields and labels to result_type.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { useAuthStore } from '@/stores/auth';

interface Props {
  competitionEventId: string;
  competitionId: string;
  resultType: string;
  onClose: () => void;
  onSubmitted: () => void;
}

function getResultLabel(resultType: string): string {
  switch (resultType) {
    case 'time': return 'Time (milliseconds)';
    case 'distance': return 'Distance (centimetres)';
    case 'score': return 'Score';
    case 'inverted_score': return 'Score (lower is better)';
    case 'weight': return 'Weight lifted (kg)';
    case 'compound': return 'Reps completed';
    case 'possession': return 'Points scored';
    default: return 'Result';
  }
}

function getResultPlaceholder(resultType: string): string {
  switch (resultType) {
    case 'time': return 'e.g. 10230 (10.23 seconds)';
    case 'distance': return 'e.g. 750 (7.50 metres)';
    case 'score': return 'e.g. 42';
    case 'inverted_score': return 'e.g. 5 (strokes / errors)';
    case 'weight': return 'e.g. 85.5';
    case 'compound': return 'e.g. 12';
    case 'possession': return 'e.g. 3';
    default: return '';
  }
}

function getResultHelp(resultType: string): string {
  switch (resultType) {
    case 'time': return 'Enter total milliseconds. 1 second = 1000ms. 1 minute = 60000ms.';
    case 'distance': return 'Enter centimetres. 1 metre = 100cm.';
    case 'weight': return 'Enter kilograms with up to 2 decimal places.';
    default: return '';
  }
}

export function ResultSubmissionForm({ competitionEventId, competitionId, resultType, onClose, onSubmitted }: Props) {
  const { profile } = useAuthStore();
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isDnf, setIsDnf] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDecimal = resultType === 'weight';
  const help = getResultHelp(resultType);

  async function handleSubmit() {
    if (!isDnf) {
      const parsed = isDecimal ? parseFloat(value) : parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        toast.error('Please enter a valid positive number');
        triggerError();
        return;
      }
    }

    setIsSubmitting(true);
    const parsed = isDnf ? undefined : (isDecimal ? parseFloat(value) : parseInt(value, 10));

    const { error } = await apiCall(`/api/competitions/${competitionId}/results`, {
      method: 'POST',
      body: JSON.stringify({
        competition_event_id: competitionEventId,
        profile_id: profile?.id,
        result_value_primary: parsed,
        is_dnf: isDnf,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(evidenceUrl.trim() && { evidence_url: evidenceUrl.trim() }),
      }),
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }

    triggerSuccess();
    toast.success('Result submitted');
    onSubmitted();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-white rounded-lg border border-neutral-200 mx-4 mb-4">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
          <Text className="text-sm font-semibold text-neutral-900">Submit your result</Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 gap-4">
          {/* DNF toggle */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-neutral-700">Mark as DNF</Text>
              <Text className="text-xs text-neutral-500">Did not finish / no result</Text>
            </View>
            <Switch
              value={isDnf}
              onValueChange={setIsDnf}
              trackColor={{ true: '#EF4444' }}
            />
          </View>

          {!isDnf && (
            <View>
              <Text className="text-sm font-medium text-neutral-700 mb-1">
                {getResultLabel(resultType)}
              </Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-3 py-3 text-neutral-800 bg-neutral-50"
                placeholder={getResultPlaceholder(resultType)}
                keyboardType="decimal-pad"
                value={value}
                onChangeText={setValue}
              />
              {help ? <Text className="text-xs text-neutral-500 mt-1">{help}</Text> : null}
            </View>
          )}

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">
              Notes <Text className="text-neutral-400 font-normal">(optional)</Text>
            </Text>
            <TextInput
              className="border border-neutral-200 rounded-lg px-3 py-3 text-neutral-800 bg-neutral-50"
              placeholder="Any context for the host…"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
              maxLength={300}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">
              Evidence URL <Text className="text-neutral-400 font-normal">(optional)</Text>
            </Text>
            <TextInput
              className="border border-neutral-200 rounded-lg px-3 py-3 text-neutral-800 bg-neutral-50"
              placeholder="https://youtube.com/…"
              keyboardType="url"
              autoCapitalize="none"
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
            />
          </View>

          <TouchableOpacity
            className="bg-primary rounded-lg py-3 items-center"
            onPress={handleSubmit}
            disabled={isSubmitting || (!isDnf && !value)}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-sm">Submit Result</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
