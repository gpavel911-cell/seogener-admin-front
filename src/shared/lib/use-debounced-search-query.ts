import { useMemo, useState } from "react";
import { useDebouncedValue } from "./use-debounced-value";

const DEFAULT_SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedSearchQuery(debounceMs = DEFAULT_SEARCH_DEBOUNCE_MS) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, debounceMs);
  const query = useMemo(() => {
    const value = debouncedSearch.trim();
    return value ? value : undefined;
  }, [debouncedSearch]);

  return { search, setSearch, query };
}
