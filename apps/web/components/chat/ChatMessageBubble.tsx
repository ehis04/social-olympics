// ChatMessageBubble — renders a single chat message with optional delete
import Image from 'next/image';
import type { ChatMessage } from '@/types/social';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

function timeStr(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageBubble({ message, isOwn, canDelete, onDelete }: Props) {
  const sender = message.sender;
  const initials = sender?.display_name.charAt(0).toUpperCase() ?? '?';

  return (
    <div className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-grey-200">
          {sender?.avatar_url ? (
            <Image src={sender.avatar_url} alt={sender.display_name} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
              {initials}
            </span>
          )}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && sender && (
          <span className="text-xs font-medium text-grey-500">{sender.display_name}</span>
        )}
        <div
          className={[
            'rounded-2xl px-3.5 py-2 text-sm',
            isOwn
              ? 'rounded-br-sm bg-primary-600 text-white'
              : 'rounded-bl-sm bg-grey-100 text-grey-900',
          ].join(' ')}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-grey-400">{timeStr(message.created_at)}</span>
      </div>

      {canDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className="hidden shrink-0 rounded p-1 text-xs text-grey-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
          title="Delete message"
        >
          ✕
        </button>
      )}
    </div>
  );
}
