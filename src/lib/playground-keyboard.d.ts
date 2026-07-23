export interface PlaygroundSubmitKeyEvent {
  key?: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}

export function isPlaygroundSubmitKey(event: PlaygroundSubmitKeyEvent): boolean;
