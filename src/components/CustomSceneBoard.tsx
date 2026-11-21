import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Check, Minus } from 'lucide-react';
import { customSceneImageUrl, r2ImagePaths, resolveFirstUrl } from '@/lib/images';
import { categories, findCategory, findSubcategory, languageCategories, type SoundCategory } from '@/data/words';
import { formatWordDisplay } from '@/lib/formatters';
import type { CustomTarget } from '@/components/CustomSceneSetup';

type Placed = {
  id: number;
  x: number; // stage-relative px
  y: number;
  targetIndex: number;
};

type Props = {
  sceneTitle: string;
  targets: CustomTarget[];
  onBack: () => void;
  onClose: () => void;
  onCorrect: () => void;
  onTryAgain: () => void;
};

const DRAG_SIZE = 64;

function categoryFor(target: CustomTarget): SoundCategory {
  return findCategory(target.source.categoryId) ?? categories[0] ?? languageCategories[0];
}

function targetImageUrl(target: CustomTarget): string {
  const cat = categoryFor(target);
  const sub = findSubcategory(cat, target.source.subId);
  return resolveFirstUrl(r2ImagePaths(target.word, cat, sub, target.source.groupId));
}

/**
 * Full-screen Custom Scene workbench: the scene fills the canvas, a right
 * sidebar holds the 12 word targets (borderless transparent images), and any
 * sidebar image can be dragged anywhere onto the scene. Small floating
 * check/dash buttons and a compact score tally sit in the sidebar top corner.
 */
export function CustomSceneBoard({ sceneTitle, targets, onBack, onClose, onCorrect, onTryAgain }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [dragging, setDragging] = useState<{ targetIndex: number; x: number; y: number; placedId?: number } | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);

  const pointToStage = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDragPlaced = (p: Placed) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({ targetIndex: p.targetIndex, x: p.x, y: p.y, placedId: p.id });
  };

  const startDrag = (targetIndex: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    const p = pointToStage(e.clientX, e.clientY);
    if (!p) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({ targetIndex, x: p.x, y: p.y });
  };

  const endDrag = useCallback(() => {
    setDragging((prev) => {
      if (!prev) return null;
      if (prev.placedId !== undefined) {
        setPlaced((cur) => cur.map((p) => (p.id === prev.placedId ? { ...p, x: prev.x, y: prev.y } : p)));
      } else {
        const stage = stageRef.current;
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const inside = prev.x >= 0 && prev.x <= rect.width && prev.y >= 0 && prev.y <= rect.height;
          if (inside) {
            setPlaced((cur) => [...cur, { id: Date.now() + Math.random(), x: prev.x, y: prev.y, targetIndex: prev.targetIndex }]);
          }
        }
      }
      return null;
    });
  }, []);

  // Pointer capture retargets move events to the sidebar element, so the drag
  // must be tracked with window-level listeners, not on the stage.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      setDragging((prev) => (prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null));
    };
    const onUp = () => endDrag();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, endDrag]);

  const removePlaced = (id: number) => {
    setPlaced((prev) => prev.filter((p) => p.id !== id));
  };

  const handleScore = (delta: 1 | -1) => {
    if (delta === 1) onCorrect();
    else onTryAgain();
    setScores((prev) => [Math.max(0, prev[0] + (delta === 1 ? 1 : 0)), Math.max(0, prev[1] + (delta === -1 ? 1 : 0))]);
  };

  const sidebarCounts = new Map<number, number>();
  placed.forEach((p) => sidebarCounts.set(p.targetIndex, (sidebarCounts.get(p.targetIndex) ?? 0) + 1));

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex overflow-hidden">
      {/* Stage */}
      <div ref={stageRef} className="relative flex-1 min-w-0">
        {/* Back button: returns to the custom scene setup/grid */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur transition-colors z-20"
          title="Back"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="absolute inset-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden">
          <img
            src={customSceneImageUrl(sceneTitle)}
            alt=""
            className="max-w-full max-h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Placed targets */}
        {placed.map((p) => {
          const target = targets[p.targetIndex];
          if (!target) return null;
          return (
            <div
              key={p.id}
              onDoubleClick={() => removePlaced(p.id)}
              onPointerDown={startDragPlaced(p)}
              className="absolute cursor-grab active:cursor-grabbing touch-none"
              style={{ left: p.x - DRAG_SIZE / 2, top: p.y - DRAG_SIZE / 2, width: DRAG_SIZE, height: DRAG_SIZE }}
              title="Drag to move · double-tap to remove"
            >
              <img
                src={targetImageUrl(target)}
                alt={target.word}
                className="w-full h-full object-contain drop-shadow-md select-none pointer-events-none"
                draggable={false}
              />
            </div>
          );
        })}

        {/* Currently dragged target: new from sidebar, or a placed one being moved */}
        {dragging && targets[dragging.targetIndex] && (
          <div
            className="absolute pointer-events-none z-30"
            style={{ left: dragging.x - DRAG_SIZE / 2, top: dragging.y - DRAG_SIZE / 2, width: DRAG_SIZE, height: DRAG_SIZE }}
          >
            <img
              src={targetImageUrl(targets[dragging.targetIndex])}
              alt=""
              className={`w-full h-full object-contain drop-shadow-lg select-none ${dragging.placedId !== undefined ? '' : 'opacity-90'}`}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="shrink-0 w-28 sm:w-36 bg-white/95 backdrop-blur border-l border-gray-200 flex flex-col">
        {/* Compact tally + exit, unobtrusive at the top */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 tabular-nums">
            <span className="text-green-600">+{scores[0]}</span>
            <span className="text-gray-300">/</span>
            <span className="text-orange-600">-{scores[1]}</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
            title="Exit"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating check/dash scorers, small and out of the way */}
        <div className="flex items-center justify-center gap-1.5 py-1.5 border-b border-gray-100">
          <button
            onClick={() => handleScore(1)}
            className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center active:scale-95 transition-all"
            title="Correct"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleScore(-1)}
            className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center active:scale-95 transition-all"
            title="Try again"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Target images: borderless, draggable onto the scene */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {targets.map((target, i) => {
              const copies = sidebarCounts.get(i) ?? 0;
              return (
                <div
                  key={`${target.word}-${i}`}
                  onPointerDown={startDrag(i)}
                  className={`relative aspect-square flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing ${
                    copies > 0 ? 'opacity-40' : ''
                  }`}
                  title={formatWordDisplay(target.word, target.source.categoryId, target.source.subId)}
                >
                  <img
                    src={targetImageUrl(target)}
                    alt={target.word}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  {copies > 0 && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-gray-900/70 text-white text-[9px] flex items-center justify-center pointer-events-none">
                      {copies}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
