export const APP_HOTKEY_OPTIONS = {
  preventDefault: true,
  enableOnFormTags: false,
  enableOnContentEditable: false,
} as const;

export const LEADER_SEQUENCE_HOTKEY_OPTIONS = {
  ...APP_HOTKEY_OPTIONS,
  sequenceTimeoutMs: 800,
} as const;
