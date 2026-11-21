import { useEffect, useState } from 'react';
import { sceneImageUrl, sceneLabel, customSceneImageUrl, CUSTOM_SCENE_TITLES, PLACEHOLDER_DATA_URI } from '@/lib/images';
import { SCENE_TITLES } from '@/data/words';
import { X, Search, MessageCircle } from 'lucide-react';

export type GridMode = 'scenes' | 'hide' | 'custom';

type Props = {
  mode: GridMode;
  onModeChange: (mode: GridMode) => void;
  onPickScene: (title: string, mode: GridMode) => void;
  onClose: () => void;
};

const TABS: { id: GridMode; label: string }[] = [
  { id: 'scenes', label: 'Picture Scenes' },
  { id: 'hide', label: 'Hide & Describe' },
  { id: 'custom', label: 'Custom Scenes' },
];

function titlesFor(mode: GridMode): string[] {
  if (mode === 'custom') return CUSTOM_SCENE_TITLES;
  return SCENE_TITLES;
}

function urlFor(title: string, mode: GridMode): string {
  return mode === 'custom' ? customSceneImageUrl(title) : sceneImageUrl(title);
}

/**
 * Grid of all picture scenes available in the Cloudflare R2 bucket, rendered
 * under Chrome-style tabs (Picture Scenes / Hide & Describe / Custom Scenes).
 * The tab row and header are fixed; only the grid contents swap on tab change,
 * so switching tabs never shifts the layout.
 */
export function SceneGrid({ mode, onModeChange, onPickScene, onClose }: Props) {
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleError = (title: string) => {
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(title);
      return next;
    });
  };

  const accentText = mode === 'hide' ? 'text-emerald-700' : mode === 'custom' ? 'text-sky-700' : 'text-gray-800';
  const accentRing =
    mode === 'hide'
      ? 'ring-2 ring-emerald-300 shadow-emerald-200/60 hover:ring-4 hover:ring-emerald-400'
      : mode === 'custom'
      ? 'ring-1 ring-gray-200 hover:ring-2 hover:ring-sky-400'
      : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-orange-400';

  // Hide & Describe is visually distinct: emerald tinted chrome, speech-bubble
  // icon, banner-style title above the grid. Picture Scenes keeps neutral
  // chrome with an orange magnifier accent.
  const isHide = mode === 'hide';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isHide ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/70' : 'bg-gradient-to-b from-gray-50 to-gray-100'} backdrop-blur-sm`}>
      {/* Tab strip doubles as the top bar: close button sits beside the tabs */}
      <div className="shrink-0 bg-gray-200/70 px-4 pt-2 flex items-end gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = tab.id === mode;
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              role="tab"
              aria-selected={active}
              className={`px-4 sm:px-5 py-2 text-sm font-semibold rounded-t-xl border border-b-0 transition-colors duration-150 whitespace-nowrap ${
                active
                  ? isHide && tab.id === 'hide'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-gray-50 text-gray-900 border-gray-300'
                  : 'bg-gray-300/60 text-gray-600 border-transparent hover:bg-gray-300/90 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={onClose}
          className="ml-auto mb-1.5 w-8 h-8 rounded-full flex items-center justify-center bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab panel: only this region changes when tabs switch */}
      <div className={`flex-1 min-h-0 overflow-y-auto border-t border-gray-300 p-4 sm:p-6 ${isHide ? 'bg-emerald-50' : 'bg-gray-50'}`}>
        {isHide && (
          <div className="max-w-6xl mx-auto mb-4 flex items-center justify-center gap-2 text-emerald-800">
            <MessageCircle className="w-5 h-5" />
            <span className="font-bold text-lg">Hide a character, then describe it</span>
          </div>
        )}
        {!isHide && mode === 'scenes' && (
          <div className="max-w-6xl mx-auto mb-4 flex items-center justify-center gap-2 text-orange-700">
            <Search className="w-5 h-5" />
            <span className="font-bold text-lg">Find the hidden objects</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {titlesFor(mode).map((title) => {
            const url = urlFor(title, mode);
            const isFailed = failed.has(title);
            const unavailable = isFailed;
            return (
              <button
                key={title}
                onClick={() => onPickScene(title, mode)}
                className={`group bg-white rounded-2xl overflow-hidden shadow-lg ring-1 transition-all duration-200 active:scale-95 ${accentRing}`}
              >
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={isFailed ? PLACEHOLDER_DATA_URI : url}
                    alt={sceneLabel(title)}
                    loading="lazy"
                    decoding="async"
                    onError={() => handleError(title)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {unavailable && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gray-900/60 text-white text-[10px] font-medium uppercase tracking-wide">
                      Not uploaded yet
                    </span>
                  )}
                </div>
                <div className="px-3 py-2.5 text-center">
                  <h3 className={`text-sm font-semibold truncate ${accentText}`}>{sceneLabel(title)}</h3>
                </div>
              </button>
            );
          })}
        </div>
        {mode === 'custom' && (
          <p className="max-w-6xl mx-auto mt-4 text-xs text-gray-400 text-center">
            Custom scenes appear here once uploaded to the app's custom scenes folder, using the scene's name (e.g. Ocean.png).
          </p>
        )}
      </div>
    </div>
  );
}
