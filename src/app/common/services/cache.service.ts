import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type StorageType = 'local' | 'session';

interface CacheEntry<T> {
  value: T;
}

/**
 * Common storage and in-memory caching service with SSR/browser safety guards.
 * Implements persistent and session storage management per the developer guide.
 */
@Injectable({
  providedIn: 'root',
})
export class CacheService {
  public inAppCache: Record<string, { value: unknown }> = {};
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Resolves window.localStorage or window.sessionStorage in browser environments.
   */
  private getStorage(storageType: StorageType): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return storageType === 'local' ? localStorage : sessionStorage;
  }

  /**
   * Retrieves a typed value from browser storage.
   *
   * @template T Target value type
   * @param key Cache key string
   * @param storageType Target storage type ('local' or 'session')
   * @returns Deserialized value or null if not found/invalid
   */
  public get<T>(key: string, storageType: StorageType = 'local'): T | null {
    const storage = this.getStorage(storageType);
    if (!storage) {
      return null;
    }

    const cachedRaw = storage.getItem(key);
    if (cachedRaw) {
      try {
        const cached: CacheEntry<T> = JSON.parse(cachedRaw);
        return cached.value;
      } catch {
        this.remove(key, storageType);
      }
    }
    return null;
  }

  /**
   * Serializes and writes a typed value to browser storage.
   *
   * @template T Target value type
   * @param key Cache key string
   * @param value Value to store
   * @param storageType Target storage type ('local' or 'session')
   */
  public set<T>(key: string, value: T, storageType: StorageType = 'local'): void {
    const storage = this.getStorage(storageType);
    if (!storage) {
      return;
    }

    const entry: CacheEntry<T> = { value };
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // Gracefully handle storage quota or private browsing exceptions
    }
  }

  /**
   * Removes a cached key from browser storage.
   *
   * @param key Cache key string
   * @param storageType Target storage type ('local' or 'session')
   */
  public remove(key: string, storageType: StorageType = 'local'): void {
    const storage = this.getStorage(storageType);
    if (!storage) {
      return;
    }
    storage.removeItem(key);
  }

  /**
   * Retrieves a typed value from in-app memory cache.
   *
   * @template T Target value type
   * @param key Cache key string
   * @returns Cached value or null
   */
  public getInApp<T>(key: string): T | null {
    const entry = this.inAppCache[key];
    if (!entry) {
      return null;
    }
    return entry.value as T;
  }

  /**
   * Stores a typed value in in-app memory cache.
   *
   * @template T Target value type
   * @param key Cache key string
   * @param value Value to store
   */
  public setInApp<T>(key: string, value: T): void {
    this.inAppCache[key] = { value };
  }

  /**
   * Deletes a key from in-app memory cache.
   *
   * @param key Cache key string
   */
  public removeInApp(key: string): void {
    delete this.inAppCache[key];
  }
}
