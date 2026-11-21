import { Minus, Plus } from 'lucide-react';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
};

export function CardCountStepper({ value, min = 1, max = 10, onChange }: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center rounded-full border border-gray-200 bg-white overflow-hidden select-none">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
          aria-label="Fewer cards"
        >
          <Minus className="w-5 h-5" />
        </button>
        <span className="min-w-[2.25rem] text-center text-lg font-semibold text-gray-800 tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
          aria-label="More cards"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
