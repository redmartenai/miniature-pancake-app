import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Tabs stay mounted, so data would otherwise go stale while another tab is open.
 * Refetch whenever the screen comes back into view (not on its first appearance,
 * when the queries are already fetching).
 *
 * The latest `refetch` is read from a ref: useFocusEffect re-runs whenever its callback
 * changes, and a combined refresh function changes on every render, which would turn
 * each refetch into another refetch.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const latest = useRef(refetch);
  const firstFocus = useRef(true);
  useEffect(() => {
    latest.current = refetch;
  });
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void latest.current();
    }, []),
  );
}
