/**
 * Which top-level window has the keyboard, and how to take it and give it back.
 *
 * Windows only lets the process that received the last input event steal the
 * foreground. RegisterHotKey delivers that permission with WM_HOTKEY; a
 * low-level keyboard hook does not, so a capture box opened from the hook
 * would appear behind the game with the keyboard still in the game. The
 * classic remedy is to attach this thread's input queue to the foreground
 * window's thread for the duration of the activation (`activate`).
 *
 * On the way back, closing the capture box would hand focus to another window
 * of this process (the journal) rather than to the game; `restore` gives it to
 * the window that had it (`current`) before the box opened.
 *
 * All of it goes through koffi, so nothing has to be compiled; on any failure
 * — another platform, a load error — the functions degrade to no-ops.
 */

/** An HWND as a pointer-sized integer. */
export type WindowHandle = number;

export interface Foreground {
  /** The window that currently has the keyboard, or 0. */
  current(): WindowHandle;
  /** Bring one of this process's windows to the front even while another program is in the foreground. */
  activate(handle: WindowHandle): boolean;
  /** Bring `handle` to the front. Succeeds while this process owns the foreground, which it does when closing its own focused window. */
  restore(handle: WindowHandle): boolean;
}

export async function loadForeground(): Promise<{ foreground: Foreground | null; note?: string }> {
  if (process.platform !== 'win32') return { foreground: null, note: 'Focus hand-back is only implemented on Windows.' };
  try {
    const koffi = await import('koffi');
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const getForegroundWindow = user32.func('intptr_t __stdcall GetForegroundWindow()');
    const setForegroundWindow = user32.func('bool __stdcall SetForegroundWindow(intptr_t hwnd)');
    const bringWindowToTop = user32.func('bool __stdcall BringWindowToTop(intptr_t hwnd)');
    const setFocus = user32.func('intptr_t __stdcall SetFocus(intptr_t hwnd)');
    const getWindowThreadProcessId = user32.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t hwnd, intptr_t pid)');
    const attachThreadInput = user32.func('bool __stdcall AttachThreadInput(uint32_t attach, uint32_t to, bool flag)');
    const getCurrentThreadId = kernel32.func('uint32_t __stdcall GetCurrentThreadId()');

    const current = (): WindowHandle => Number(getForegroundWindow());
    return {
      foreground: {
        current,
        activate(handle) {
          const owner = current();
          if (!handle) return false;
          if (owner === handle) return true;
          const foregroundThread = owner ? Number(getWindowThreadProcessId(owner, 0)) : 0;
          const ourThread = Number(getCurrentThreadId());
          const attached = foregroundThread !== 0 && foregroundThread !== ourThread && Boolean(attachThreadInput(foregroundThread, ourThread, true));
          try {
            bringWindowToTop(handle);
            const ok = Boolean(setForegroundWindow(handle));
            setFocus(handle);
            return ok;
          } finally {
            if (attached) attachThreadInput(foregroundThread, ourThread, false);
          }
        },
        restore: (handle) => Boolean(handle) && Boolean(setForegroundWindow(handle)),
      },
    };
  } catch (caught) {
    return { foreground: null, note: `Focus hand-back is off: ${caught instanceof Error ? caught.message : String(caught)}` };
  }
}
