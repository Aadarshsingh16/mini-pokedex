/**
 * Status values stored directly in BehaviorSubject stores.
 */
export type StoredAsyncStatus = 'idle' | 'loading' | 'error' | 'success';

/**
 * Status values exposed to the UI, including derived 'empty' state.
 */
export type DerivedAsyncStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

/**
 * Generic state envelope wrapping asynchronous view data.
 */
export interface AsyncState<T> {
  status: DerivedAsyncStatus;
  data: T | null;
  error: string | null;
}
