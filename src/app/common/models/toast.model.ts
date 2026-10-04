export type ToastType = 'success' | 'error' | 'info';

/**
 * Toast notification payload structure.
 */
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}
