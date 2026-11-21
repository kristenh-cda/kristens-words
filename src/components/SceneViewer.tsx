import { useCallback, useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Mic, Square, Play, Check, Minus, ArrowLeft } from 'lucide-react';
import { sceneImageUrl } from '@/lib/images';
import { useRecorder } from '@/hooks/useRecorder';

type Circle = {
  id: number;
  x: number;
  y: number;
  placed: boolean;
  dragging: boolean;
};

type Props = {
  title: string;
  onClose: () => void;
  onBack: () => void;
  onCorrect?: () => void;
  onTryAgain?: () => void;
};

const CHIP = 72;

/**
 * A draggable-chips overlay for picture scenes. The picture fills the screen.
 * Transparent circles sit in one overlapping pile anchored to the bottom bar;
 * grabbing the bottom chip reveals the next one, and so on. Chips dropped on
 * the picture stay there; dropping one back on the pile (or the bar) returns
 * it to the stack. The reset button returns all chips to the pile.
 *
 * The bottom action bar mirrors the flashcard controls (Record | Check/Dash |
 * Reset + Close) so the scene can be used in a therapy session.
 */
export function SceneViewer({ title, onClose, onBack, onCorrect, onTryAgain }: Props) {
  const { status, record, stopRecording, playback, reset } = useRecorder();

  const [circles, setCircles] = useState<Circle[]>(() =>
    Array.from({ length: 40 }, (_, i) => ({ id: i, x: 0, y: 0, placed: false, dragging: false })),
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: React.PointerEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setCircles((prev) => prev.map((c) => (c.id === id ? { ...c, x, y, dragging: true } : c)));
    setDragging(id);
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCircles((prev) => prev.map((c) => (c.id === dragging ? { ...c, x, y } : c)));
  };

  const endDrag = useCallback(() => {
    setDragging((prevDragging) => {
      if (prevDragging === null) return null;
      const stage = stageRef.current;
      const pile = pileRef.current;
      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const circle = circles.find((c) => c.id === prevDragging);
        if (circle) {
          const absX = stageRect.left + circle.x;
          const absY = stageRect.top + circle.y;
          let inPile = circle.y > stageRect.height;
          if (!inPile && pile) {
            // Inflate the pile rect so dropping "near" the stack returns the chip.
            const pad = 40;
            const pr = pile.getBoundingClientRect();
            inPile =
              absX >= pr.left - pad && absX <= pr.right + pad && absY >= pr.top - pad && absY <= pr.bottom + pad;
          }
          setCircles((prev) =>
            prev.map((c) => (c.id === prevDragging ? { ...c, placed: !inPile, dragging: false } : c)),
          );
        }
      }
      return null;
    });
  }, [circles]);

  useEffect(() => {
    if (dragging === null) return;
    const onUp = () => endDrag();
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragging, endDrag]);

  const resetCircles = () => {
    setCircles((prev) => prev.map((c) => ({ ...c, placed: false, dragging: false })));
  };

  const handleBack = () => {
    resetCircles();
    onBack();
  };

  const recordButton = () => {
    if (status === 'idle') {
      return (
        <button onClick={record} className="action-btn bg-blue-600 hover:bg-blue-700" title="Record">
          <Mic className="w-4 h-4" />
        </button>
      );
    }
    if (status === 'recording') {
      return (
        <button onClick={stopRecording} className="action-btn bg-red-600 hover:bg-red-700 animate-pulse" title="Stop">
          <Square className="w-4 h-4" />
        </button>
      );
    }
    return (
      <div className="flex gap-1">
        <button onClick={playback} className="action-btn bg-blue-600 hover:bg-blue-700" title="Play">
          <Play className="w-4 h-4" />
        </button>
        <button onClick={reset} className="px-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Record again">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const pile = circles.filter((c) => !c.placed && !c.dragging);
  const floating = circles.filter((c) => c.placed || c.dragging);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Stage: picture + draggable circles + chip pile */}
      <div ref={stageRef} onPointerMove={moveDrag} className="relative flex-1 min-h-0">
        {/* Back button: resets the chips and returns to the scene grid */}
        <button
          onClick={handleBack}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur transition-colors z-20"
          title="Back to scenes"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <img
            src={sceneImageUrl(title)}
            alt=""
            className="max-w-full max-h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Placed + currently-dragged circles, positioned in stage coordinates */}
        {floating.map((c) => (
          <div
            key={c.id}
            onPointerDown={(e) => startDrag(e, c.id)}
            className="absolute rounded-full border-4 border-red-500 bg-red-500/10 cursor-grab active:cursor-grabbing shadow-lg touch-none hover:border-red-600 hover:bg-red-500/20 transition-colors"
            style={{ left: c.x - CHIP / 2, top: c.y - CHIP / 2, width: CHIP, height: CHIP }}
            title={c.placed ? 'Drag back to the pile to remove' : undefined}
          />
        ))}

        {/* One stack of chips anchored above the bottom bar: all chips sit at
            the same spot, so it looks like a single chip — grab the top one
            and the next is right underneath. */}
        <div ref={pileRef} className="absolute left-4 bottom-2 pointer-events-none" style={{ width: CHIP, height: CHIP }}>
          {pile.map((c, i) => (
            <div
              key={c.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                startDrag(e, c.id);
              }}
              className="absolute inset-0 rounded-full border-4 border-red-500 bg-red-500/0 cursor-grab active:cursor-grabbing shadow-lg touch-none hover:border-red-600 hover:bg-red-500/20 transition-colors pointer-events-auto"
              style={{ bottom: 0, zIndex: pile.length - i }}
              title="Drag onto the picture"
            />
          ))}
        </div>
      </div>

      {/* Bottom action bar: Record | Check, Dash | Reset + Close */}
      <div className="shrink-0 bg-black/60 backdrop-blur px-3 py-2">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {recordButton()}

          <div className="flex items-center gap-2 mx-auto">
            <button onClick={onCorrect} className="action-btn bg-green-500 hover:bg-green-600 active:scale-95" title="Correct">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onTryAgain} className="action-btn bg-orange-500 hover:bg-orange-600 active:scale-95" title="Try again">
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetCircles}
              className="action-btn bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95"
              title="Return all chips to the pile"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="action-btn bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95"
              title="Close scene"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
