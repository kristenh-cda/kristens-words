import { Settings, X } from 'lucide-react';

export type FlashcardSettings = {
  feedbackButtons: 'hidden' | 'left' | 'center' | 'right';
  showRecordButton: boolean;
  showSwapButton: boolean;
  showCardCount: boolean;
  showText: boolean;
  showDataPill: boolean;
};

export const defaultFlashcardSettings: FlashcardSettings = {
  feedbackButtons: 'center',
  showRecordButton: true,
  showSwapButton: true,
  showCardCount: true,
  showText: true,
  showDataPill: true,
};

const STORAGE_KEY = 'rps-flashcard-settings-v1';

export function loadFlashcardSettings(): FlashcardSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFlashcardSettings;
    return { ...defaultFlashcardSettings, ...JSON.parse(raw) };
  } catch {
    return defaultFlashcardSettings;
  }
}

export function saveFlashcardSettings(settings: FlashcardSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode) — settings just won't persist.
  }
}

export function SettingsIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Flashcard viewing settings"
      title="Flashcard viewing settings"
      className="w-7 h-7 rounded-full bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center shadow-sm transition-all active:scale-95"
    >
      <Settings className="w-3.5 h-3.5" />
    </button>
  );
}

const feedbackOptions: { value: FlashcardSettings['feedbackButtons']; label: string }[] = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingsRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm font-medium text-gray-700">{title}</span>
      {children}
    </div>
  );
}

type OverlayProps = {
  open: boolean;
  settings: FlashcardSettings;
  onChange: (patch: Partial<FlashcardSettings>) => void;
  onClose: () => void;
};

export function FlashcardSettingsOverlay({ open, settings, onChange, onClose }: OverlayProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">Flashcard settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SettingsRow title="Check & try-again buttons">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {feedbackOptions.map((o) => (
              <button
                key={o.value}
                onClick={() => onChange({ feedbackButtons: o.value })}
                className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  settings.feedbackButtons === o.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow title="Microphone button">
          <ToggleSwitch
            checked={settings.showRecordButton}
            onChange={(v) => onChange({ showRecordButton: v })}
            label="Show microphone button"
          />
        </SettingsRow>
        <SettingsRow title="Swap button on cards">
          <ToggleSwitch
            checked={settings.showSwapButton}
            onChange={(v) => onChange({ showSwapButton: v })}
            label="Show swap button on cards"
          />
        </SettingsRow>
        <SettingsRow title="Card number badge">
          <ToggleSwitch
            checked={settings.showCardCount}
            onChange={(v) => onChange({ showCardCount: v })}
            label="Show card number badge"
          />
        </SettingsRow>
        <SettingsRow title="Show text on cards">
          <ToggleSwitch
            checked={settings.showText}
            onChange={(v) => onChange({ showText: v })}
            label="Show text labels on flashcards"
          />
        </SettingsRow>
        <SettingsRow title="Data collection pill">
          <ToggleSwitch
            checked={settings.showDataPill}
            onChange={(v) => onChange({ showDataPill: v })}
            label="Show data collection pill box"
          />
        </SettingsRow>
      </div>
    </div>
  );
}
