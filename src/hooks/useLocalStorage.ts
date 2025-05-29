
"use client";

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Type for the setter function, allowing a value or a function updater
type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Always initialize with initialValue to ensure server and initial client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Effect to read from localStorage after mount and update state.
  // This runs only on the client.
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
        // If item is null, storedValue remains initialValue, which is correct.
        // No need to explicitly set initialValue to localStorage if it's not there,
        // as the next effect will handle persisting storedValue.
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        // Keep initialValue if there's an error.
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Rerun if key changes. initialValue is not needed as a dependency here.

  // Effect to write to localStorage whenever storedValue changes.
  // This runs only on the client.
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
