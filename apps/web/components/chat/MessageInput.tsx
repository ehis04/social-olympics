// MessageInput — chat input with Enter-to-send and send button
'use client';

import { useState, useRef, type KeyboardEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  isSending: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, isSending, placeholder = 'Send a message…' }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="flex items-end gap-2 border-t border-grey-200 bg-white p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={1}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-xl border border-grey-200 bg-grey-50 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || isSending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
        title="Send"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
