import { Injectable } from '@angular/core';

/**
 * Centralized application logger providing structured console logging with ISO timestamps.
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  /**
   * Logs an error message with contextual metadata and optional details.
   *
   * @param context The module or operation context originating the log (e.g. 'GraphqlClientService')
   * @param details Additional payload, error object, or context details
   */
  public error(context: string, details?: unknown): void {
    const timestamp = new Date().toISOString();
    if (details !== undefined) {
      console.error(`[${timestamp}] [ERROR] [${context}]`, details);
    } else {
      console.error(`[${timestamp}] [ERROR] [${context}]`);
    }
  }

  /**
   * Logs a warning message with contextual metadata and optional details.
   *
   * @param context The module or operation context originating the log
   * @param details Additional payload or context details
   */
  public warn(context: string, details?: unknown): void {
    const timestamp = new Date().toISOString();
    if (details !== undefined) {
      console.warn(`[${timestamp}] [WARN] [${context}]`, details);
    } else {
      console.warn(`[${timestamp}] [WARN] [${context}]`);
    }
  }

  /**
   * Logs an informational message with contextual metadata and optional details.
   *
   * @param context The module or operation context originating the log
   * @param details Additional payload or context details
   */
  public info(context: string, details?: unknown): void {
    const timestamp = new Date().toISOString();
    if (details !== undefined) {
      console.info(`[${timestamp}] [INFO] [${context}]`, details);
    } else {
      console.info(`[${timestamp}] [INFO] [${context}]`);
    }
  }
}
