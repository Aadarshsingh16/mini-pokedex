import { Injectable, signal } from '@angular/core';
import { ToastItem, ToastType } from '../models/toast.model';

/**
 * Service managing global non-blocking toast notifications.
 * Uses Angular Signals to expose active notifications reactively.
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastsSignal = signal<ToastItem[]>([]);
  private counter = 0;

  /** Read-only signal of currently displayed toasts */
  public readonly toasts = this.toastsSignal.asReadonly();

  /**
   * Displays a toast notification with the specified message, type, and auto-dismiss duration.
   *
   * @param message Text message to display
   * @param type Notification severity ('success' | 'error' | 'info')
   * @param durationMs Milliseconds before automatically dismissing (default: 4000)
   */
  public show(message: string, type: ToastType = 'info', durationMs = 4000): void {
    const id = `toast-${++this.counter}-${Date.now()}`;
    const toast: ToastItem = { id, message, type, durationMs };

    this.toastsSignal.update((current) => [...current, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }
  }

  /**
   * Convenience method to trigger a success toast.
   *
   * @param message Success text to display
   * @param durationMs Milliseconds before dismissal
   */
  public success(message: string, durationMs = 4000): void {
    this.show(message, 'success', durationMs);
  }

  /**
   * Convenience method to trigger an error toast.
   *
   * @param message Error text to display
   * @param durationMs Milliseconds before dismissal
   */
  public error(message: string, durationMs = 5000): void {
    this.show(message, 'error', durationMs);
  }

  /**
   * Dismisses a specific toast notification by its unique ID.
   *
   * @param id Toast ID to dismiss
   */
  public dismiss(id: string): void {
    this.toastsSignal.update((current) => current.filter((t) => t.id !== id));
  }
}
