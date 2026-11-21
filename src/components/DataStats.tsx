import { Check, Minus } from 'lucide-react';

type Props = {
  correct: number;
  tries: number;
};

/**
 * Data collection boxes (check / dash / percentage) in the canonical pill
 * style, shared by the main screen and every game.
 */
export function DataStats({ correct, tries }: Props) {
  const total = correct + tries;
  const pct = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-md border border-gray-200">
      <span className="flex items-center gap-1 text-sm font-semibold text-green-600 tabular-nums">
        <Check className="w-4 h-4" />
        {correct}
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold text-orange-500 tabular-nums">
        <Minus className="w-4 h-4" />
        {tries}
      </span>
      <span className="text-sm font-semibold text-gray-700 tabular-nums min-w-[3ch] text-right">
        {pct === null ? '—' : `${pct}%`}
      </span>
    </div>
  );
}
