"use client";

interface SpellingDisplayProps {
  /** Individual letters accumulated so far. */
  letters: string[];
  /** Seconds until auto-finalize (null if not spelling). */
  countdown: number | null;
  /** Whether a spelling session is currently active. */
  isSpelling: boolean;
  /** Optional notice message for spelling feedback. */
  notice?: string | null;
  /** Called when user manually finalizes the word. */
  onFinalize: () => void;
  /** Called when user cancels the spelling session. */
  onCancel: () => void;
  /** Called when user deletes the last letter. */
  onDeleteLast: () => void;
}

export default function SpellingDisplay({
  letters,
  countdown,
  isSpelling,
  notice,
  onFinalize,
  onCancel,
  onDeleteLast,
}: SpellingDisplayProps) {
  if (!isSpelling) return null;

  return (
    <div className="fixed inset-x-0 top-4 flex justify-center z-50 pointer-events-none">
      <div className="bg-th-surface-2/95 backdrop-blur-sm border border-cyan-400/30 rounded-2xl px-8 py-5 shadow-2xl pointer-events-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-sm font-medium tracking-wider uppercase">
              Spelling Mode
            </span>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          {countdown !== null && (
            <span className="text-xs text-th-text-3">
              Auto-confirm in {countdown}s
            </span>
          )}
        </div>

        {notice && (
          <div className="mb-3 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
            {notice}
          </div>
        )}

        {/* Letters */}
        <div className="flex items-center gap-1 flex-wrap min-h-14">
          {letters.map((letter, i) => (
            <span
              key={`${i}-${letter}`}
              className="inline-flex items-center justify-center w-12 h-14 bg-cyan-500/10 border border-cyan-400/40 rounded-lg text-2xl font-bold text-th-fg animate-[fadeIn_0.2s_ease-out]"
            >
              {letter}
            </span>
          ))}
          {/* Blinking cursor */}
          <span className="inline-flex items-center justify-center w-3 h-14 animate-pulse">
            <span className="w-0.5 h-8 bg-cyan-400 rounded-full" />
          </span>
        </div>

        {/* Word preview */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg text-th-text-2">
            Word:{" "}
            <span className="text-th-fg font-semibold">
              {letters.join("")}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onDeleteLast}
              className="px-3 py-1.5 text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/25 transition-colors"
              title="Delete last letter"
              data-hand-nav
            >
              ⌫ Undo
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition-colors"
              title="Discard word"
              data-hand-nav
            >
              ✕ Cancel
            </button>
            <button
              onClick={onFinalize}
              className="px-3 py-1.5 text-xs bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/25 transition-colors"
              title="Confirm word"
              data-hand-nav
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
