import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, Circle, Move, MoveDiagonal2, PanelLeft, PanelRight, Settings, X } from 'lucide-react';
import './counter.css';

export type CounterMode = 'floating' | 'split-left' | 'split-right';

type CounterMessage = {
  source: 'counter-app';
  type: 'counter-selected' | 'counter-dashboard' | 'counter-deleted' | 'counter-settings-open' | 'counter-settings-closed' | 'counter-interaction';
  id?: string;
  openSettings?: boolean;
};

type CounterLauncherProps = {
  onLayoutChange: (active: boolean, mode: CounterMode) => void;
};

const FLOATING_WIDGET_OVERHANG = 36;
const FLOATING_CONTROL_INSET = 12;
const FLOATING_CONTROL_SIZE = 36;

function clampFloatingCoordinate(value: number, viewportSize: number, widgetSize: number) {
  const firstPosition = Math.min(-FLOATING_WIDGET_OVERHANG, viewportSize - widgetSize + FLOATING_WIDGET_OVERHANG);
  const lastPosition = Math.max(-FLOATING_WIDGET_OVERHANG, viewportSize - widgetSize + FLOATING_WIDGET_OVERHANG);
  return Math.max(firstPosition, Math.min(lastPosition, value));
}

function getFloatingControlsStyle(
  position: { left: number; top: number },
  size: number,
  viewportWidth: number,
  viewportHeight: number,
): { style: CSSProperties; horizontal: 'left' | 'right'; vertical: 'top' | 'bottom' } {
  const inset = FLOATING_CONTROL_INSET;
  const control = FLOATING_CONTROL_SIZE;
  const corners = [
    { horizontal: 'right', vertical: 'top', x: position.left + size - inset - control, y: position.top + inset },
    { horizontal: 'left', vertical: 'top', x: position.left + inset, y: position.top + inset },
    { horizontal: 'right', vertical: 'bottom', x: position.left + size - inset - control, y: position.top + size - inset - control },
    { horizontal: 'left', vertical: 'bottom', x: position.left + inset, y: position.top + size - inset - control },
  ] as const;
  const overflow = (start: number, viewport: number) => Math.max(0, -start) + Math.max(0, start + control - viewport);
  const corner = corners.reduce((best, candidate) => {
    const candidateOverflow = overflow(candidate.x, viewportWidth) + overflow(candidate.y, viewportHeight);
    const bestOverflow = overflow(best.x, viewportWidth) + overflow(best.y, viewportHeight);
    return candidateOverflow < bestOverflow ? candidate : best;
  });

  return {
    horizontal: corner.horizontal,
    vertical: corner.vertical,
    style: {
      top: corner.vertical === 'top' ? inset : 'auto',
      bottom: corner.vertical === 'bottom' ? inset : 'auto',
      left: corner.horizontal === 'left' ? inset : 'auto',
      right: corner.horizontal === 'right' ? inset : 'auto',
    },
  };
}

export function CounterLauncher({ onLayoutChange }: CounterLauncherProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const floatingControlsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { kind: 'move'; pointerId: number; pointerX: number; pointerY: number; left: number; top: number }
    | { kind: 'resize'; pointerId: number; centerX: number; centerY: number; startRadius: number; size: number }
    | { kind: 'sidebar'; pointerId: number; pointerX: number; width: number; edge: 'left' | 'right' }
    | null
  >(null);
  const [hasOpened, setHasOpened] = useState(false);
  const [active, setActive] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [mode, setMode] = useState<CounterMode>('floating');
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [floatingOptionsOpen, setFloatingOptionsOpen] = useState(false);
  const [pointerDragActive, setPointerDragActive] = useState(false);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  const [size, setSize] = useState(280);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const postToCounter = useCallback((message: Record<string, string>) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<CounterMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.source !== 'counter-app') return;

      if (event.data.type === 'counter-selected' && event.data.id) {
        setSelectedCounterId(event.data.id);
        setSelectionOpen(false);
        setActive(true);
        setSettingsEditing(Boolean(event.data.openSettings));
        if (event.data.openSettings) setFullScreenOpen(true);
        const nextMode = active ? mode : 'floating';
        setMode(nextMode);
        onLayoutChange(true, nextMode);
      } else if (event.data.type === 'counter-dashboard') {
        setSelectionOpen(true);
      } else if (event.data.type === 'counter-deleted') {
        setSelectedCounterId(null);
        setActive(false);
        setFullScreenOpen(false);
        setSettingsEditing(false);
        setSelectionOpen(true);
        onLayoutChange(false, mode);
      } else if (event.data.type === 'counter-settings-open') {
        setSettingsEditing(true);
      } else if (event.data.type === 'counter-settings-closed') {
        setSettingsEditing(false);
      } else if (event.data.type === 'counter-interaction') {
        setFloatingOptionsOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [active, mode, onLayoutChange]);

  useEffect(() => {
    if (hasOpened) {
      postToCounter({ source: 'kristens-words', type: 'counter-set-mode', mode: fullScreenOpen ? 'popup' : mode });
    }
  }, [hasOpened, mode, fullScreenOpen, postToCounter]);

  useEffect(() => {
    if (!floatingOptionsOpen) return;
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!floatingControlsRef.current?.contains(event.target as Node)) {
        setFloatingOptionsOpen(false);
      }
    };
    window.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [floatingOptionsOpen]);

  useEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.kind === 'move') {
        setPosition({
          left: clampFloatingCoordinate(drag.left + event.clientX - drag.pointerX, window.innerWidth, size),
          top: clampFloatingCoordinate(drag.top + event.clientY - drag.pointerY, window.innerHeight, size),
        });
      } else {
        if (drag.kind === 'resize') {
          const currentRadius = Math.hypot(event.clientX - drag.centerX, event.clientY - drag.centerY);
          const nextSize = Math.max(160, Math.min(520, drag.size + currentRadius - drag.startRadius));
          setSize(nextSize);
          setPosition((previous) => previous
            ? {
                left: clampFloatingCoordinate(previous.left, window.innerWidth, nextSize),
                top: clampFloatingCoordinate(previous.top, window.innerHeight, nextSize),
              }
            : previous);
        } else {
          const delta = event.clientX - drag.pointerX;
          const nextWidth = Math.max(220, Math.min(Math.floor(window.innerWidth * 0.62), drag.width + (drag.edge === 'left' ? delta : -delta)));
          document.documentElement.style.setProperty('--counter-split-width', `${nextWidth}px`);
        }
      }
    };
    const end = (event: globalThis.PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setPointerDragActive(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [size]);

  const openSelection = () => {
    setHasOpened(true);
    setSelectionOpen(true);
    setSettingsEditing(false);
    if (active) postToCounter({ source: 'kristens-words', type: 'counter-show-dashboard' });
  };

  const dismissSelection = () => {
    setSelectionOpen(false);
    if (active && selectedCounterId) {
      postToCounter({ source: 'kristens-words', type: 'counter-open', id: selectedCounterId });
    }
  };

  const chooseMode = (nextMode: CounterMode) => {
    setMode(nextMode);
    setFullScreenOpen(false);
    setSettingsEditing(false);
    setFloatingOptionsOpen(false);
    onLayoutChange(true, nextMode);
  };

  const openSettingsFullScreen = () => {
    setFullScreenOpen(true);
    setSettingsEditing(true);
    postToCounter({ source: 'kristens-words', type: 'counter-open-settings' });
  };

  const closeCounter = () => {
    setActive(false);
    setSelectionOpen(false);
    setFullScreenOpen(false);
    setSettingsEditing(false);
    setFloatingOptionsOpen(false);
    onLayoutChange(false, mode);
    postToCounter({ source: 'kristens-words', type: 'counter-show-dashboard' });
  };

  const startMove = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPointerDragActive(true);
    setPosition({ left: bounds.left, top: bounds.top });
    dragRef.current = {
      kind: 'move',
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
    };
  };

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPointerDragActive(true);
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    dragRef.current = {
      kind: 'resize',
      pointerId: event.pointerId,
      centerX,
      centerY,
      startRadius: Math.hypot(event.clientX - centerX, event.clientY - centerY),
      size,
    };
  };

  const startSidebarResize = (edge: 'left' | 'right') => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const width = frameRef.current?.getBoundingClientRect().width ?? Math.min(window.innerWidth * 0.36, 420);
    setPointerDragActive(true);
    dragRef.current = {
      kind: 'sidebar',
      pointerId: event.pointerId,
      pointerX: event.clientX,
      width,
      edge,
    };
  };

  const floatingPosition: CSSProperties = position
    ? { left: position.left, top: position.top }
    : { right: 4, bottom: 4 };
  const frameStyle: CSSProperties = !hasOpened
    ? { display: 'none' }
    : selectionOpen
      ? {
          position: 'fixed',
        zIndex: 10000,
          left: '50%',
          top: '50%',
          width: 'min(960px, 92vw)',
          height: 'min(760px, 84vh)',
          transform: 'translate(-50%, -50%)',
        }
      : fullScreenOpen
        ? {
            position: 'fixed',
            zIndex: 10000,
            inset: 0,
            width: '100vw',
            height: '100dvh',
          }
      : active && mode === 'split-left'
        ? { position: 'fixed', zIndex: 9999, top: 0, bottom: 0, left: 0, width: 'var(--counter-split-width)' }
        : active && mode === 'split-right'
          ? { position: 'fixed', zIndex: 9999, top: 0, bottom: 0, right: 0, width: 'var(--counter-split-width)' }
          : active
            ? {
                position: 'fixed',
                zIndex: 9999,
                width: size,
                height: size,
                ...floatingPosition,
                pointerEvents: 'none',
              }
            : { display: 'none' };
  const floating = active && !selectionOpen && !fullScreenOpen && mode === 'floating';
  const split = active && !selectionOpen && !fullScreenOpen && mode !== 'floating';
  const showOptions = active && !selectionOpen && !settingsEditing;
  const floatingControlsPlacement = position
    ? getFloatingControlsStyle(position, size, window.innerWidth, window.innerHeight)
    : {
        horizontal: 'right' as const,
        vertical: 'top' as const,
        style: { top: FLOATING_CONTROL_INSET, right: FLOATING_CONTROL_INSET },
      };
  const floatingOptionsOnRight = position !== null
    && floatingControlsPlacement.horizontal === 'right'
    && position.left < 360;

  return (
    <>
      <button
        onClick={openSelection}
        aria-label="Open counter selection"
        title="Open counters"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-transparent p-0 transition-transform hover:scale-105 active:scale-95"
      >
        <img src="/counter/icon.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
      </button>

      {hasOpened && createPortal(
        <>
          {selectionOpen && (
            <div
              className="counter-selection-backdrop fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) dismissSelection();
              }}
            >
            </div>
          )}
          {selectionOpen && (
            <button onClick={dismissSelection} aria-label="Close counter selection" className="counter-selection-close">
              <X className="h-5 w-5" />
            </button>
          )}

          <div
            className={`counter-frame-shell ${floating ? 'counter-frame-floating' : ''} ${split ? 'counter-frame-split' : ''} ${fullScreenOpen ? 'counter-frame-fullscreen' : ''} ${selectionOpen ? 'counter-frame-selection' : ''}`}
            style={frameStyle}
          >
            <iframe
              ref={frameRef}
              src="/counter/index.html"
              title="Speech counter"
              scrolling="yes"
              className={`counter-frame ${floating ? 'counter-frame-circle' : ''}`}
              style={floating && pointerDragActive ? { pointerEvents: 'none' } : undefined}
              onLoad={() => postToCounter({ source: 'kristens-words', type: 'counter-set-mode', mode: fullScreenOpen ? 'popup' : mode })}
            />
            {active && !selectionOpen && (
              <>
                {floating ? (
                  <div ref={floatingControlsRef} className="counter-floating-controls" style={floatingControlsPlacement.style}>
                    <button onPointerDown={startMove} onClick={() => setFloatingOptionsOpen((open) => !open)} aria-label="Move counter" title="Drag to move" className="counter-move-trigger">
                      <Move className="h-5 w-5" />
                    </button>
                    {showOptions && (
                      <div className={`counter-options-bar counter-options-floating ${floatingOptionsOpen ? 'counter-options-open' : ''} ${floatingOptionsOnRight ? 'counter-options-open-right' : ''} ${floatingControlsPlacement.vertical === 'bottom' ? 'counter-options-open-above' : ''}`}>
                        <button onPointerDown={startResize} aria-label="Resize counter" title="Drag to resize" className="counter-control counter-resize-control"><MoveDiagonal2 className="h-4 w-4" /></button>
                        <button onClick={() => chooseMode('floating')} aria-label="Floating mode" title="Floating" className={`counter-control ${mode === 'floating' ? 'counter-control-selected' : ''}`}><Circle className="h-4 w-4" /></button>
                        <button onClick={() => chooseMode('split-left')} aria-label="Split screen left" title="Left sidebar" className="counter-control"><PanelLeft className="h-4 w-4" /></button>
                        <button onClick={() => chooseMode('split-right')} aria-label="Split screen right" title="Right sidebar" className="counter-control"><PanelRight className="h-4 w-4" /></button>
                        <button onClick={() => postToCounter({ source: 'kristens-words', type: 'counter-decrease' })} aria-label="Decrease count" title="Decrease count" className="counter-control"><ArrowDown className="h-4 w-4" /></button>
                        <button onClick={openSettingsFullScreen} aria-label="Counter settings" title="Settings" className="counter-control"><Settings className="h-4 w-4" /></button>
                        <button onClick={closeCounter} aria-label="Close counter" title="Close counter" className="counter-control"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                ) : fullScreenOpen ? (
                  showOptions && (
                    <div className="counter-options-bar counter-options-fullscreen">
                      <button onClick={() => chooseMode('floating')} aria-label="Floating mode" title="Floating" className="counter-control"><Circle className="h-4 w-4" /></button>
                      <button onClick={() => chooseMode('split-left')} aria-label="Split screen left" title="Left sidebar" className="counter-control"><PanelLeft className="h-4 w-4" /></button>
                      <button onClick={() => chooseMode('split-right')} aria-label="Split screen right" title="Right sidebar" className="counter-control"><PanelRight className="h-4 w-4" /></button>
                      <button onClick={() => postToCounter({ source: 'kristens-words', type: 'counter-decrease' })} aria-label="Decrease count" title="Decrease count" className="counter-control"><ArrowDown className="h-4 w-4" /></button>
                      <button onClick={openSettingsFullScreen} aria-label="Counter settings" title="Settings" className="counter-control"><Settings className="h-4 w-4" /></button>
                      <button onClick={closeCounter} aria-label="Close counter" title="Close counter" className="counter-control"><X className="h-4 w-4" /></button>
                    </div>
                  )
                ) : (
                  <div className="counter-options-bar counter-options-docked">
                    <button onClick={() => chooseMode('floating')} aria-label="Floating mode" title="Floating" className="counter-control"><Circle className="h-4 w-4" /></button>
                    <button onClick={() => chooseMode('split-left')} aria-label="Split screen left" title="Left sidebar" className="counter-control"><PanelLeft className="h-4 w-4" /></button>
                    <button onClick={() => chooseMode('split-right')} aria-label="Split screen right" title="Right sidebar" className="counter-control"><PanelRight className="h-4 w-4" /></button>
                    <button onClick={() => postToCounter({ source: 'kristens-words', type: 'counter-decrease' })} aria-label="Decrease count" title="Decrease count" className="counter-control"><ArrowDown className="h-4 w-4" /></button>
                    <button onClick={openSettingsFullScreen} aria-label="Counter settings" title="Settings" className="counter-control"><Settings className="h-4 w-4" /></button>
                    <button onClick={closeCounter} aria-label="Close counter" title="Close counter" className="counter-control"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </>
            )}
            {split && (
              <button
                onPointerDown={startSidebarResize(mode === 'split-left' ? 'left' : 'right')}
                aria-label="Resize counter sidebar"
                title="Drag to resize sidebar"
                className={`counter-sidebar-resize ${mode === 'split-left' ? 'counter-sidebar-resize-left' : 'counter-sidebar-resize-right'}`}
              />
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
