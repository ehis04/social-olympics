/*
 * This file defines the AvatarUpload user-interface component.
 */

// AvatarUpload — click or drag-and-drop avatar uploader with preview
'use client';

import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUploadAvatar } from '@/hooks/profile/useProfile';
import { toast } from '@/lib/toast';

interface Props {
  currentUrl: string | null;
  displayName: string;
}

// Renders the avatar upload component.
export function AvatarUpload({ currentUrl, displayName }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadAvatar, isPending } = useUploadAvatar();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    uploadAvatar(file, {
      onSuccess: (avatarUrl) => {
        setSavedUrl(avatarUrl);
        setPreview(null);
        toast.success('Profile photo updated');
        router.refresh();
      },
      onError: (uploadError) => {
        setPreview(null);
        const message = uploadError instanceof Error ? uploadError.message : 'Upload failed. Please try again.';
        setError(message);
        toast.error(message);
      },
    });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Allow choosing the same file again after an error.
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const displayUrl = preview ?? savedUrl;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        disabled={isPending}
        aria-label="Change profile photo"
        className={[
          'relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDragging ? 'border-primary bg-primary-muted' : 'border-grey-300 bg-grey-100',
          isPending ? 'opacity-60' : '',
        ].join(' ')}
      >
        {displayUrl ? (
          <Image src={displayUrl} alt={displayName} fill sizes="96px" className="object-cover" unoptimized={displayUrl.startsWith('blob:')} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-grey-400">
            {initials}
          </span>
        )}
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        )}
        {!isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity hover:bg-black/30 hover:opacity-100">
            <span className="text-xs font-medium text-white">Change</span>
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
      >
        {isPending ? 'Uploading…' : savedUrl ? 'Change photo' : 'Upload photo'}
      </button>

      <p className="text-xs text-grey-500">Any photo works: it is cropped to a square and resized for you.</p>
      {error && (
        <p role="alert" className="max-w-xs text-center text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
