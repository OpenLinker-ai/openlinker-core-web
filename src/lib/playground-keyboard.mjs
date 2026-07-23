export function isPlaygroundSubmitKey(event) {
  return event?.key === "Enter"
    && event?.shiftKey !== true
    && event?.isComposing !== true
    && event?.keyCode !== 229;
}
