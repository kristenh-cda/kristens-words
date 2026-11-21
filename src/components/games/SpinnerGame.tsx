import { useMemo, useRef, useState } from 'react';
import {
  X,
  Check,
  Minus,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Eye,
  EyeOff,
  Shuffle as ShuffleIcon,
  ImageOff,
  Disc3,
  PlayCircle,
  ListChecks,
} from 'lucide-react';
import {
  findCategory,
  findSubcategory,
  slugifyWord,
  type Mode,
  type SelectableSource,
  type SoundCategory,
} from '@/data/words';
import { MixedModePicker } from '@/components/MixedModePicker';
import { DataPillWidget } from '@/components/DataPillWidget';
import { r2ImagePaths, rememberSuccess } from '@/lib/images';
import { FlashcardImage } from '@/components/FlashcardImage';
import { formatWordDisplay } from '@/lib/formatters';

/** A pie slice with a slash through it — "hide this slice". */
function PieSliceOff({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 12 L12 2.5 A9.5 9.5 0 0 1 21.4 14.5 Z" />
      <path d="M21.2 15.5 A9.5 9.5 0 1 1 8.2 2.7" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

type Target = {
  key: string;
  word: string;
  category: SoundCategory;
  subId: string;
  groupId: string | null;
  label: string;
};

type Props = {
  mode: Mode;
  onClose: () => void;
};

const SLICE_COLORS = [
  '#f87171',
  '#fbbf24',
  '#34d399',
  '#38bdf8',
  '#fb923c',
  '#a3e635',
  '#f472b6',
  '#22d3ee',
  '#4ade80',
  '#facc15',
];

const RANDOM_MIN = 1;
const RANDOM_MAX = 20;
const RANDOM_DEFAULT = 5;

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  if (end - start >= 359.9) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  }
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

/** Image with the standard R2 fallback chain (svg -> png -> jpg -> placeholder). */
function TargetImage({ target, className }: { target: Target; className?: string }) {
  const sub = useMemo(
    () => findSubcategory(target.category, target.subId),
    [target],
  );
  const plan = useMemo(
    () => r2ImagePaths(target.word, target.category, sub, target.groupId),
    [target, sub],
  );
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const attempt = plan.attempts[Math.min(stage, plan.attempts.length - 1)];
  const noImage = !attempt || attempt.stage === 'placeholder' || attempt.stage === 'icon' || failed;

  if (noImage) {
    return (
      <div className={`flex items-center justify-center text-gray-300 ${className ?? ''}`}>
        <ImageOff className="w-10 h-10" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      key={attempt.url}
      src={attempt.url ?? undefined}
      alt={target.word}
      loading="lazy"
      decoding="async"
      onLoad={() => {
        setReady(true);
        if (attempt.stage !== 'placeholder' && attempt.stage !== 'icon') {
          rememberSuccess(plan.sound, plan.position, attempt.stage, plan.wordKey);
        }
      }}
      onError={() => {
        setReady(false);
        setStage((prev) => {
          const next = Math.min(prev + 1, plan.attempts.length - 1);
          if (next === prev) setFailed(true);
          return next;
        });
      }}
      className={`${className ?? ''} object-contain transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

/** Slice image rendered inside the SVG wheel, with the standard R2 fallback chain. */
function SliceImage({
  target,
  cx,
  cy,
  size,
  mid,
  fallbackFontSize,
}: {
  target: Target;
  cx: number;
  cy: number;
  size: number;
  mid: number;
  fallbackFontSize: number;
}) {
  const sub = useMemo(() => findSubcategory(target.category, target.subId), [target]);
  const plan = useMemo(
    () => r2ImagePaths(target.word, target.category, sub, target.groupId),
    [target, sub],
  );
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState(false);

  const attempt = plan.attempts[Math.min(stage, plan.attempts.length - 1)];
  const noImage = failed || !attempt || attempt.stage === 'placeholder' || attempt.stage === 'icon';

  if (noImage) {
    const display = formatWordDisplay(target.word, target.category.id, target.subId);
    const label = display.length > 12 ? `${display.slice(0, 11)}…` : display;
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fallbackFontSize}
        fontWeight="700"
        fill="#111827"
        transform={`rotate(${mid > 90 && mid < 270 ? mid + 180 : mid} ${cx} ${cy})`}
      >
        {label}
      </text>
    );
  }

  return (
    <image
      key={attempt.url}
      href={attempt.url ?? undefined}
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      onLoad={() => {
        if (attempt.stage !== 'placeholder' && attempt.stage !== 'icon') {
          rememberSuccess(plan.sound, plan.position, attempt.stage, plan.wordKey);
        }
      }}
      onError={() =>
        setStage((prev) => {
          const next = Math.min(prev + 1, plan.attempts.length - 1);
          if (next === prev) setFailed(true);
          return next;
        })
      }
      transform={`rotate(${mid} ${cx} ${cy})`}
    />
  );
}

export function SpinnerGame({ mode, onClose }: Props) {
  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chosen, setChosen] = useState<SelectableSource[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [randomCount, setRandomCount] = useState(RANDOM_DEFAULT);
  const [targets, setTargets] = useState<Target[]>([]);

  // Game state
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [current, setCurrent] = useState<Target | null>(null);
  const [modal, setModal] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [checks, setChecks] = useState(0);
  const [dashes, setDashes] = useState(0);
  const [showData, setShowData] = useState(true);
  const [pillLeft, setPillLeft] = useState(false);
  const rotRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const activeSlices = useMemo(() => targets.filter((t) => !hidden.has(t.key)), [targets, hidden]);

  const beginGame = () => {
    const seen = new Set<string>();
    const out: Target[] = [];
    for (const s of chosen) {
      const category = findCategory(s.categoryId);
      if (!category) continue;
      for (const w of s.words) {
        const slug = slugifyWord(w);
        if (!picked.has(slug) || seen.has(slug)) continue;
        seen.add(slug);
        out.push({
          key: slug,
          word: w,
          category,
          subId: s.subId,
          groupId: s.groupId,
          label: s.groupLabel ? `${s.subLabel} ${s.groupLabel}` : s.subLabel,
        });
      }
    }
    setTargets(out);
    setHidden(new Set());
    setCurrent(null);
    setModal(false);
    setChecks(0);
    setDashes(0);
    setRotation(0);
    rotRef.current = 0;
    setStep(3);
  };

  const spin = () => {
    if (spinning || activeSlices.length === 0) return;
    const count = activeSlices.length;
    const sliceAngle = 360 / count;
    const slice = Math.floor(Math.random() * count);
    // Wheel coordinate of the chosen slice's center; pointer sits at top (0deg).
    const center = slice * sliceAngle + sliceAngle / 2;
    // We need (360 - finalRotation) % 360 === center  =>  finalRotation ≡ 360 - center (mod 360)
    const from = rotRef.current;
    const delta = ((360 - center - (from % 360)) % 360 + 360) % 360;
    const finalRot = from + 360 * 5 + delta;
    rotRef.current = finalRot;
    setRotation(finalRot);
    setSpinning(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setCurrent(activeSlices[slice]);
      setModal(true);
    }, 2200);
  };

  const closeCard = () => setModal(false);

  // Hide whichever slice currently sits at the top selection spot — works at
  // any time, regardless of whether the flashcard is open.
  const hideTopSlice = () => {
    if (activeSlices.length === 0) return;
    const sliceAngle = 360 / activeSlices.length;
    // Pointer sits at top (0deg) in wheel coordinates: rotation ≡ -center.
    const normalized = ((-(rotation % 360)) % 360 + 360) % 360;
    const slice = Math.floor(normalized / sliceAngle) % activeSlices.length;
    const target = activeSlices[slice];
    if (target) {
      setHidden((prev) => new Set(prev).add(target.key));
      if (current?.key === target.key) {
        setModal(false);
        setCurrent(null);
      }
    }
  };

  const mark = (kind: 'correct' | 'try') => {
    if (kind === 'correct') setChecks((c) => c + 1);
    else setDashes((d) => d + 1);
    setModal(false);
    setCurrent(null);
  };

  const resetToStep1 = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setStep(1);
    setChosen([]);
    setPicked(new Set());
    setTargets([]);
    setHidden(new Set());
    setCurrent(null);
    setModal(false);
    setChecks(0);
    setDashes(0);
    setRotation(0);
    rotRef.current = 0;
    setSpinning(false);
  };

  const restoreHidden = () => setHidden(new Set());

  // ---------- Step 1: deck selection (reuses MixedModePicker) ----------
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50">
        <MixedModePicker
          mode={mode}
          onStart={(_words, sources) => {
            setChosen(sources);
            setPicked(new Set());
            setStep(2);
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  // ---------- Step 2: word selection (matches Memory's picker) ----------
  if (step === 2) {
    const chosenTargets: Target[] = [];
    const seen = new Set<string>();
    for (const s of chosen) {
      const category = findCategory(s.categoryId);
      if (!category) continue;
      for (const w of s.words) {
        const slug = slugifyWord(w);
        if (seen.has(slug)) continue;
        seen.add(slug);
        chosenTargets.push({
          key: slug,
          word: w,
          category,
          subId: s.subId,
          groupId: s.groupId,
          label: s.groupLabel ? `${s.subLabel} ${s.groupLabel}` : s.subLabel,
        });
      }
    }
    const pickedCount = chosenTargets.filter((t) => picked.has(t.key)).length;

    const randomPick = () => {
      const shuffled = [...chosenTargets].sort(() => Math.random() - 0.5);
      const capped = Math.max(RANDOM_MIN, Math.min(RANDOM_MAX, randomCount));
      setPicked(new Set(shuffled.slice(0, Math.min(capped, chosenTargets.length)).map((t) => t.key)));
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Spinner</h2>
            </div>
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Word selection grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-gray-700">
                Pick words <span className="font-normal text-gray-400">({pickedCount} selected)</span>
              </h3>
              <button
                onClick={randomPick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                <ShuffleIcon className="w-3.5 h-3.5" />
                Random
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {chosenTargets.map((t) => {
                const on = picked.has(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.key)) next.delete(t.key);
                        else next.add(t.key);
                        return next;
                      })
                    }
                    className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                      on ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-square bg-gray-50">
                      <FlashcardImage
                        word={t.word}
                        category={t.category}
                        subId={t.subId}
                        groupId={t.groupId}
                      />
                    </div>
                    <span className="block text-[10px] text-gray-500 truncate px-1 py-0.5 text-center leading-tight">
                      {formatWordDisplay(t.word, t.category.id, t.subId)}
                    </span>
                    {on && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {pickedCount === 0
                  ? 'Tap cards to add them to the wheel'
                  : `${pickedCount} target${pickedCount > 1 ? 's' : ''} on the wheel`}
              </span>
              <button
                onClick={beginGame}
                disabled={pickedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                Begin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Step 3: game board ----------
  const count = activeSlices.length;
  const sliceAngle = 360 / Math.max(count, 1);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      {/* Floating controls: top-left restore, top-right reset + exit */}
      <button
        onClick={restoreHidden}
        disabled={hidden.size === 0}
        className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center shadow-md transition-colors active:scale-95"
        title="Restore all hidden slices"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={resetToStep1}
          className="w-11 h-11 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-md transition-colors active:scale-95"
          title="Start over"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-md transition-colors active:scale-95"
          title="Exit"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

        {/* Wheel area — clicking the wheel spins it */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-2 relative">
        <div
          className={`relative ${count > 0 && !spinning ? 'cursor-pointer active:scale-[0.99]' : ''} transition-transform`}
          onClick={() => {
            if (!spinning && count > 0) spin();
          }}
          role="button"
          aria-label="Spin the wheel"
        >
          {/* Pointer (fixed at top) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[18px] border-l-transparent border-r-transparent border-b-gray-900 drop-shadow" />

          {/* Rotating wheel: slices + images rotate together */}
          <svg
            viewBox="0 0 300 300"
            className="w-[min(92vw,80vh)] h-[min(92vw,80vh)] max-w-none drop-shadow-xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 2.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {activeSlices.map((t, i) => {
              const start = i * sliceAngle;
              const end = (i + 1) * sliceAngle;
              return (
                <path
                  key={t.key}
                  d={slicePath(150, 150, 143, start, end)}
                  fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              );
            })}
            {activeSlices.map((t, i) => {
              const mid = i * sliceAngle + sliceAngle / 2;
              const [ix, iy] = polar(150, 150, 88, mid);
              const imgSize = Math.min(64, Math.max(22, 500 / Math.max(count, 1)));
              return (
                <SliceImage
                  key={`t-${t.key}`}
                  target={t}
                  cx={ix}
                  cy={iy}
                  size={imgSize}
                  mid={mid}
                  fallbackFontSize={Math.max(8, Math.min(14, 200 / Math.max(count, 1)))}
                />
              );
            })}
            <circle cx="150" cy="150" r="143" fill="none" stroke="#111827" strokeWidth="5" />
            <circle cx="150" cy="150" r="24" fill="#111827" />
            <circle cx="150" cy="150" r="9" fill="#ffffff" />
          </svg>
        </div>

        {/* Floating dockable data pill; hide-slice rides above it */}
        <DataPillWidget
          correct={checks}
          tries={dashes}
          dockedLeft={pillLeft}
          onToggleSide={() => setPillLeft((p) => !p)}
          visible={showData}
          onToggleVisible={() => setShowData((v) => !v)}
          topExtra={
            <button
              onClick={hideTopSlice}
              disabled={activeSlices.length === 0}
              className="w-9 h-9 rounded-full bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center shadow-md transition-colors active:scale-95"
              title="Hide the slice at the top"
            >
              <PieSliceOff className="w-5 h-5" />
            </button>
          }
        />
      </main>

      {/* Card evaluation overlay: close button lives on the card itself */}
      {modal && current && (
        <div className="fixed inset-0 z-[60] bg-gray-900/30 flex flex-col">
          <div className="flex-1 min-h-0 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-w-md w-full ring-1 ring-gray-100">
              <button
                onClick={closeCard}
                className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-600 border border-gray-200 flex items-center justify-center shadow-md transition-colors active:scale-95"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-square max-h-[48svh] flex items-center justify-center bg-white overflow-hidden">
                <div className="w-full h-full flex items-center justify-center p-4">
                  <TargetImage target={current} className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              <div className="shrink-0 text-center px-6 py-3">
                <h2 className="font-medium text-gray-800 tracking-tight text-xl sm:text-2xl">
                  {formatWordDisplay(current.word, current.category.id, current.subId)}
                </h2>
              </div>
            </div>
          </div>
          <div className="shrink-0 px-4 py-5 flex items-center justify-center gap-4">
            <button
              onClick={() => mark('correct')}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
              title="Correct"
            >
              <Check className="w-7 h-7" />
            </button>
            <button
              onClick={() => mark('try')}
              className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
              title="Try again"
            >
              <Minus className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
