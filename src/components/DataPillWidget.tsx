import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Minus } from 'lucide-react';

const HALO =
  'shadow-[0_0_0_4px_rgba(255,255,255,0.45),0_4px_14px_rgba(0,0,0,0.18)]';

type Props = {
  correct: number;
  tries: number;
  dockedLeft: boolean;
  onToggleSide: () => void;
  visible: boolean;
  onToggleVisible: () => void;
  /** Score buttons rendered above the pill box (Memory). */
  showScoreButtons?: boolean;
  onCorrect?: () => void;
  onTryAgain?: () => void;
  /** Rendered above the whole group; moves with it when it docks. */
  topExtra?: ReactNode;
};

/**
 * Vertical floating data panel: [score buttons] / [arrow] / [pill] / [hide],
 * stacked top to bottom. Anchored bottom-right by default; the arrow docks
 * the whole panel to the bottom-left.
 */
export function DataPillWidget({
  correct,
  tries,
  dockedLeft,
  onToggleSide,
  visible,
  onToggleVisible,
  showScoreButtons = false,
  onCorrect,
  onTryAgain,
  topExtra,
}: Props) {
  const Arrow = dockedLeft ? ArrowRight : ArrowLeft;
  return (
    <div
      className={`absolute bottom-4 z-30 flex flex-col items-center gap-2 transition-all duration-300 ${
        dockedLeft ? 'left-4' : 'right-4'
      }`}
    >
      {visible ? (
        <>
          {topExtra}
          {showScoreButtons && onCorrect && onTryAgain && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onCorrect}
                className={`w-11 h-11 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors active:scale-95 ${HALO}`}
                title="Correct"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={onTryAgain}
                className={`w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors active:scale-95 ${HALO}`}
                title="Try again"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleSide}
              className={`w-9 h-9 rounded-full bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center transition-colors active:scale-95 ${HALO}`}
              title={dockedLeft ? 'Move data tracking to the right' : 'Move data tracking to the left'}
            >
              <Arrow className="w-4 h-4" />
            </button>
            <DataStatsVertical correct={correct} tries={tries} />
            <button
              onClick={onToggleVisible}
              className={`w-9 h-9 rounded-full bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center transition-colors active:scale-95 ${HALO}`}
              title="Hide data tracking"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={onToggleVisible}
          className={`w-9 h-9 rounded-full bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center transition-colors active:scale-95 ${HALO}`}
          title="Show data tracking"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function DataStatsVertical({ correct, tries }: { correct: number; tries: number }) {
  const total = correct + tries;
  const pct = total > 0 ? Math.round((correct / total) * 100) : null;
  return (
    <div className="flex flex-col items-center gap-1 bg-white rounded-full px-2 py-3 border border-gray-200">
      <span className="flex flex-col items-center text-xs font-semibold text-green-600 tabular-nums leading-tight">
        <Check className="w-3.5 h-3.5" />
        {correct}
      </span>
      <span className="w-5 h-px bg-gray-200" />
      <span className="flex flex-col items-center text-xs font-semibold text-orange-500 tabular-nums leading-tight">
        <Minus className="w-3.5 h-3.5" />
        {tries}
      </span>
      <span className="w-5 h-px bg-gray-200" />
      <span className="text-xs font-semibold text-gray-700 tabular-nums leading-tight min-w-[3ch] text-center">
        {pct === null ? '—' : `${pct}%`}
      </span>
    </div>
  );
}
