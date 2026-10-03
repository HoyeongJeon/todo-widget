import { Timestamp } from '../../domain/timestamp.ts';
import { stripBom } from '../storage/bom.ts';

export interface WidgetSettings {
  readonly left: number | null;
  readonly top: number | null;
  readonly width: number | null;
  readonly maxHeight: number | null;
  readonly opacity: number | null;
  readonly pinned: boolean;
  readonly doneExpanded: boolean;
  readonly todoExpanded: boolean;
  readonly lastUpdateCheck: Timestamp | null;
}

/** storage.md `settings.json` 항목 표의 기본값. */
export const DEFAULT_SETTINGS: WidgetSettings = {
  left: null,
  top: null,
  width: null,
  maxHeight: null,
  opacity: null,
  pinned: true,
  doneExpanded: false,
  todoExpanded: true,
  lastUpdateCheck: null,
};

const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.keys(DEFAULT_SETTINGS));

export interface DecodedSettings {
  settings: WidgetSettings;
  /** 표에 없는 항목. 다음 저장 때 그대로 남긴다 (STORE-15). */
  unknown: Readonly<Record<string, unknown>>;
}

/** 없거나 깨지면 기본값, 객체면 항목마다 따로 판단한다. 안내는 없다 (STORE-15, STORE-19). */
export function decodeSettings(text: string | null): DecodedSettings {
  if (text === null)
    return defaults();
  let data: unknown;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    return defaults();
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    return defaults();

  const record = data as Record<string, unknown>;
  const number = (key: string): number | null => {
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const boolean = (key: string, fallback: boolean): boolean => {
    const value = record[key];
    return typeof value === 'boolean' ? value : fallback;
  };
  const lastUpdateCheck = record['lastUpdateCheck'];

  return {
    settings: {
      left: number('left'),
      top: number('top'),
      width: number('width'),
      maxHeight: number('maxHeight'),
      opacity: number('opacity'),
      pinned: boolean('pinned', DEFAULT_SETTINGS.pinned),
      doneExpanded: boolean('doneExpanded', DEFAULT_SETTINGS.doneExpanded),
      todoExpanded: boolean('todoExpanded', DEFAULT_SETTINGS.todoExpanded),
      lastUpdateCheck: typeof lastUpdateCheck === 'string' ? Timestamp.parse(lastUpdateCheck) : null,
    },
    unknown: Object.fromEntries(Object.entries(record).filter(([key]) => !KNOWN_KEYS.has(key))),
  };
}

/** 표의 항목 다음에 모르는 항목을 그대로 붙인다. NaN·무한대는 null (STORE-03, STORE-15, STORE-16). */
export function encodeSettings(settings: WidgetSettings, unknown: Readonly<Record<string, unknown>>): string {
  const finite = (value: number | null): number | null => (value !== null && Number.isFinite(value) ? value : null);
  const body = {
    left: finite(settings.left),
    top: finite(settings.top),
    width: finite(settings.width),
    maxHeight: finite(settings.maxHeight),
    opacity: finite(settings.opacity),
    pinned: settings.pinned,
    doneExpanded: settings.doneExpanded,
    todoExpanded: settings.todoExpanded,
    lastUpdateCheck: settings.lastUpdateCheck ? settings.lastUpdateCheck.format() : null,
    ...unknown,
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

function defaults(): DecodedSettings {
  return { settings: DEFAULT_SETTINGS, unknown: {} };
}
