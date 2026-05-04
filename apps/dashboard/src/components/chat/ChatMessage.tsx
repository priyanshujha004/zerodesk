'use client';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user';

  // Strip <report>...</report> from display
  const open = content.indexOf('<report>');
  const displayText = open !== -1 ? content.slice(0, open).trim() : content;

  if (!displayText) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#6ee7b7]/20 border border-[#6ee7b7]/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <span className="text-[10px] text-[#6ee7b7]">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#6ee7b7] text-[#0a0a0f] rounded-br-sm'
            : 'bg-[#1c1c28] text-white/90 rounded-bl-sm border border-white/5'
        }`}
      >
        {displayText}
      </div>
    </div>
  );
}