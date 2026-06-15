import React from 'react';

function initial(name) {
  return (name && name[0] && name[0].toUpperCase()) || '?';
}

export default function MessageBubble({ message, own, grouped }) {
  if (message.kind === 'sys') {
    return (
      <div className="msg-in system-msg flex justify-center py-1">
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300/90 italic">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`msg-in flex gap-3 ${own ? 'justify-end' : 'justify-start'} w-full`}>
      {!own ? (
        grouped ? (
          <div className="w-9" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-semibold text-[#020617] border border-white/10">
            {initial(message.username)}
          </div>
        )
      ) : null}

      <div className={`max-w-[65%] ${own ? 'order-2' : ''} ${own ? 'text-right' : 'text-left'}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm border border-white/10 transition ${
            own
              ? 'bg-emerald-500 text-[#020617] border-emerald-300/30'
              : 'bg-slate-900/40 text-white/95'
          }`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1">
            {!grouped ? (
              <div className="text-sm font-semibold">
                <span className={own ? 'text-[#020617]' : 'text-emerald-400'}>{message.username}</span>{' '}
                <span className="text-xs opacity-70 font-normal">{own ? '' : ''}</span>
              </div>
            ) : null}
            <div className="text-[11px] font-mono text-slate-300/80">
              {message.time}
            </div>
          </div>
          <div className="text-sm leading-relaxed break-words">{message.message}</div>
        </div>
      </div>

      {own ? (
        grouped ? (
          <div className="w-9" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 flex items-center justify-center text-sm font-semibold text-[#020617] border border-white/10">
            {initial(message.username)}
          </div>
        )
      ) : null}
    </div>
  );
}

