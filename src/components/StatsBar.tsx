import { RotateCcw } from 'lucide-react';
import { DataStats } from '@/components/DataStats';

type Props = {
  correct: number;
  tries: number;
  onReset: () => void;
};

export function StatsBar({ correct, tries, onReset }: Props) {
  return (
    <div className="flex items-center gap-3">
      <DataStats correct={correct} tries={tries} />
      <button
        onClick={onReset}
        aria-label="Reset stats"
        title="Reset stats"
        className="w-8 h-8 rounded-full bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center shadow-sm transition-colors active:scale-95"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
