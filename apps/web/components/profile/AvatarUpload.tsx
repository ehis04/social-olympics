// AvatarUpload — click or drag-and-drop avatar uploader with preview
'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useUploadAvatar } from '@/hooks/profile/useProfile';
import { toast } from '@/lib/toast';

interface Props {
  currentUrl: string | null;
  displayName: string;
}

export function AvatarUpload({ currentUrl, displayName }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadAvatar, isPending } = useUploadAvatar();

  function handleFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    uploadAvatar(file, {
      onSuccess: () => toast.success('Avatar updated'),
      onError: () => {
        setPreview(null);
        toast.error('Upload failed');
      },
    });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const displayUrl = preview ?? currentUrl;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          'relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed transition-colors',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-grey-300 bg-grey-100',
          isPending ? 'opacity-60' : '',
        ].join(' ')}
      >
        {displayUrl ? (
          <Image src={displayUrl} alt={displayName} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-grey-400">
            {initials}
          </span>
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
        {!isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity hover:bg-black/30 hover:opacity-100">
            <span className="text-xs font-medium text-white">Change</span>
          </div>
        )}
      </div>

      <p className="text-xs text-grey-500">JPEG, PNG or WebP · max 5 MB</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
