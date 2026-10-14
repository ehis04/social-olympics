/*
 * This file defines the DeleteAccountSection user-interface component.
 */

// DeleteAccountSection — permanently delete the signed-in user's account.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { apiCall } from '@/lib/api/client';
import { queryClient } from '@/lib/query-client';
import { toast } from '@/lib/toast';

// Renders the delete account section component.
export function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    const { error } = await apiCall('/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    if (error) {
      setIsDeleting(false);
      toast.error(error.message);
      return;
    }
    // The login no longer exists; clearing the local session returns to the sign-in screen.
    queryClient.clear();
    await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
    toast.success('Your account has been deleted.');
  }

  return (
    <View className="bg-white rounded-lg border border-red-200 p-4">
      <Text className="text-sm font-semibold text-error">Delete account</Text>
      <Text className="text-xs text-neutral-600 mt-1 leading-5">
        This permanently removes your login, profile details, photos, messages, comments, follows and personal
        bests. Your name is replaced with &ldquo;Deleted user&rdquo; on past results so other people&apos;s standings
        stay correct. Competitions you host that haven&apos;t finished are handed to your co-host or another
        competitor. This cannot be undone.
      </Text>
      {!isOpen ? (
        <TouchableOpacity
          className="mt-3 border border-red-300 rounded-lg py-2.5 items-center"
          onPress={() => setIsOpen(true)}
        >
          <Text className="text-sm font-semibold text-error">Delete my account</Text>
        </TouchableOpacity>
      ) : (
        <View className="mt-3 gap-3">
          <Text className="text-sm font-medium text-neutral-700">Type DELETE to confirm</Text>
          <TextInput
            className="border border-neutral-300 rounded-lg px-4 py-3 text-neutral-800"
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Type DELETE to confirm"
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 border border-neutral-200 rounded-lg py-2.5 items-center"
              onPress={() => {
                setIsOpen(false);
                setConfirmText('');
              }}
            >
              <Text className="text-sm font-semibold text-neutral-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg py-2.5 items-center bg-error ${confirmText !== 'DELETE' || isDeleting ? 'opacity-50' : ''}`}
              disabled={confirmText !== 'DELETE' || isDeleting}
              onPress={() => void handleDelete()}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">Delete forever</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
