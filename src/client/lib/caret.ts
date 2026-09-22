/**
 * Where is the caret, in pixels, inside a textarea? Browsers do not say, so the
 * classic answer is a hidden mirror: a div styled like the textarea, filled with
 * the text up to the caret, with a marker span at the end. The marker's offset is
 * the caret's offset. One mirror is reused for every measurement.
 */

const MIRRORED_PROPERTIES = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontFeatureSettings',
  'letterSpacing',
  'lineHeight',
  'tabSize',
  'textIndent',
  'textTransform',
  'wordSpacing',
] as const;

let mirror: HTMLDivElement | null = null;

export interface CaretPosition {
  top: number;
  left: number;
  height: number;
}

export function caretPosition(textarea: HTMLTextAreaElement, index: number): CaretPosition {
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    Object.assign(mirror.style, {
      position: 'absolute',
      top: '0',
      left: '-9999px',
      visibility: 'hidden',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflow: 'hidden',
      pointerEvents: 'none',
    });
    document.body.appendChild(mirror);
  }

  const computed = window.getComputedStyle(textarea);
  for (const property of MIRRORED_PROPERTIES) mirror.style[property] = computed[property];
  mirror.style.width = `${textarea.clientWidth + parseFloat(computed.borderLeftWidth) + parseFloat(computed.borderRightWidth)}px`;

  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement('span');
  // A marker with content measures where the *next* character would sit.
  marker.textContent = textarea.value.slice(index, index + 1) || '.';
  mirror.appendChild(marker);

  const lineHeight = parseFloat(computed.lineHeight);
  return {
    top: marker.offsetTop - textarea.scrollTop,
    left: marker.offsetLeft - textarea.scrollLeft,
    height: Number.isNaN(lineHeight) ? parseFloat(computed.fontSize) * 1.5 : lineHeight,
  };
}
