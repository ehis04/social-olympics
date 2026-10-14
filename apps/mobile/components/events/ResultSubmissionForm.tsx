/*
 * This file defines the ResultSubmissionForm user-interface component.
 */

// Result submission form — friendly result entry (seconds, metres, kg), stopwatch, DNF and photo evidence.
import { useEffect, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Pause, Play, RotateCcw, X } from 'lucide-react-native';
import { formatResultForInput, getResultInputConfig, parseResultInput } from '@repo/scoring';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface Props {
  competitionEventId: string;
  competitionId: string;
  resultType: string;
  onClose: () => void;
  onSubmitted: () => void;
}

// Renders the stopwatch used for timed events.
function Stopwatch({ onStop }: { onStop: (milliseconds: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (startedAt.current !== null) setElapsed(base.current + (Date.now() - startedAt.current));
    }, 47);
    return () => clearInterval(timer);
  }, [running]);

  function start() {
    startedAt.current = Date.now();
    setRunning(true);
  }

  function stop() {
    if (startedAt.current !== null) {
      base.current += Date.now() - startedAt.current;
      startedAt.current = null;
    }
    setElapsed(base.current);
    setRunning(false);
    onStop(Math.round(base.current));
  }

  function reset() {
    base.current = 0;
    startedAt.current = null;
    setElapsed(0);
    setRunning(false);
  }

  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
      <Text className="font-mono text-lg font-semibold text-neutral-900">
        {formatResultForInput('time', elapsed)}s
      </Text>
      <View className="ml-auto flex-row gap-2">
        <TouchableOpacity
          className={`flex-row items-center gap-1 rounded-md px-3 py-1.5 ${running ? 'bg-error' : 'bg-primary'}`}
          onPress={running ? stop : start}
        >
          {running ? <Pause size={14} color="#fff" /> : <Play size={14} color="#fff" />}
          <Text className="text-xs font-semibold text-white">
            {running ? 'Stop' : elapsed > 0 ? 'Resume' : 'Start timer'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`rounded-md border border-neutral-200 bg-white p-1.5 ${running || elapsed === 0 ? 'opacity-40' : ''}`}
          onPress={reset}
          disabled={running || elapsed === 0}
          accessibilityLabel="Reset timer"
        >
          <RotateCcw size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Renders the result submission form component.
export function ResultSubmissionForm({ competitionEventId, competitionId, resultType, onClose, onSubmitted }: Props) {
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isDnf, setIsDnf] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [photo, setPhoto] = useState<{ localUri: string; url: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = getResultInputConfig(resultType);
  const parsedValue = parseResultInput(resultType, value);
  const showValueError = !isDnf && value.trim().length > 0 && parsedValue === null;

  async function uploadPhoto(asset: ImagePicker.ImagePickerAsset) {
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
      toast.error('That photo is larger than 5 MB. Please choose a smaller one.');
      return;
    }
    setIsUploadingPhoto(true);
    const formData = new FormData();
    // React Native uploads a local file when given its uri, name and type.
    formData.append('photo', { uri: asset.uri, name: 'evidence.jpg', type: 'image/jpeg' } as unknown as Blob);
    const { data, error } = await apiCall<{ url: string }>('/api/results/evidence', {
      method: 'POST',
      body: formData,
    });
    setIsUploadingPhoto(false);
    if (error || !data) {
      toast.error(error?.message ?? 'The photo could not be uploaded');
      return;
    }
    setPhoto({ localUri: asset.uri, url: data.url });
  }

  async function pickPhoto(source: 'camera' | 'library') {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access in Settings to take an evidence photo.'
          : 'Allow photo access in Settings to choose an evidence photo.',
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.6,
      exif: false,
      // Converts iPhone HEIC photos to JPEG so they can be viewed anywhere.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0]);
  }

  function choosePhotoSource() {
    Alert.alert('Add evidence photo', undefined, [
      { text: 'Take photo', onPress: () => void pickPhoto('camera') },
      { text: 'Choose from library', onPress: () => void pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    if (!isDnf && parsedValue === null) {
      toast.error(`Enter a valid ${config.label.toLowerCase()}`);
      triggerError();
      return;
    }
    const link = photo?.url ?? evidenceUrl.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      toast.error('Evidence must be a full link starting with https://');
      return;
    }

    setIsSubmitting(true);
    const { error } = await apiCall(`/api/competitions/${competitionId}/results`, {
      method: 'POST',
      body: JSON.stringify({
        competition_event_id: competitionEventId,
        ...(isDnf ? {} : { result_value: parsedValue }),
        is_dnf: isDnf,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(link && { evidence_url: link }),
      }),
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }

    triggerSuccess();
    toast.success('Result submitted: the host will confirm it');
    onSubmitted();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-white rounded-lg border border-neutral-200 mx-4 mb-4">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
          <Text className="text-sm font-semibold text-neutral-900">Submit your result</Text>
          <TouchableOpacity onPress={onClose} className="p-1" accessibilityLabel="Close">
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 gap-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-neutral-700">Did not finish</Text>
              <Text className="text-xs text-neutral-500">Mark DNF if you have no result</Text>
            </View>
            <Switch value={isDnf} onValueChange={setIsDnf} trackColor={{ true: '#EF4444' }} />
          </View>

          {!isDnf && resultType === 'time' && (
            <Stopwatch onStop={(milliseconds) => setValue(formatResultForInput('time', milliseconds))} />
          )}

          {!isDnf && (
            <View>
              <Text className="text-sm font-medium text-neutral-700 mb-1">
                {config.label}
                {config.unit ? <Text className="text-neutral-400 font-normal"> ({config.unit})</Text> : null}
              </Text>
              <TextInput
                className={`border rounded-lg px-3 py-3 text-neutral-800 bg-neutral-50 ${showValueError ? 'border-error' : 'border-neutral-200'}`}
                placeholder={config.placeholder}
                keyboardType={config.inputMode === 'text' ? 'numbers-and-punctuation' : config.inputMode === 'numeric' ? 'number-pad' : 'decimal-pad'}
                value={value}
                onChangeText={setValue}
                accessibilityLabel={config.label}
              />
              {showValueError ? (
                <Text className="text-xs text-error mt-1">That does not look like a valid {config.label.toLowerCase()}.</Text>
              ) : config.help ? (
                <Text className="text-xs text-neutral-500 mt-1">{config.help}</Text>
              ) : null}
            </View>
          )}

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1">
              Evidence <Text className="text-neutral-400 font-normal">(optional)</Text>
            </Text>
            {photo ? (
              <View className="flex-row items-center gap-3 rounded-lg border border-neutral-200 p-2">
                <Image source={{ uri: photo.localUri }} style={{ width: 56, height: 56, borderRadius: 6 }} />
                <Text className="flex-1 text-sm text-neutral-700">Photo attached</Text>
                <TouchableOpacity className="border border-neutral-200 rounded-md px-2.5 py-1" onPress={() => setPhoto(null)}>
                  <Text className="text-xs font-medium text-neutral-600">Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-2">
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2 border border-neutral-300 rounded-lg py-2.5"
                  onPress={choosePhotoSource}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? <ActivityIndicator color="#2D6A4F" size="small" /> : <Camera size={16} color="#374151" />}
                  <Text className="text-sm font-medium text-neutral-700">{isUploadingPhoto ? 'Uploading…' : 'Add photo'}</Text>
                </TouchableOpacity>
                <TextInput
                  className="border border-neutral-200 rounded-lg px-3 py-3 text-neutral-800 bg-neutral-50"
                  placeholder="or paste a link (https://…)"
                  keyboardType="url"
                  autoCapitalize="none"
                  value={evidenceUrl}
                  onChangeText={setEvidenceUrl}
                  accessibilityLabel="Evidence link"
                />
              </View>
            )}
          </View>

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

          <TouchableOpacity
            className={`bg-primary rounded-lg py-3 items-center ${isSubmitting || isUploadingPhoto || (!isDnf && parsedValue === null) ? 'opacity-50' : ''}`}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting || isUploadingPhoto || (!isDnf && parsedValue === null)}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-sm">Submit result</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
