import { useCallback, useMemo, useState } from "react";

type UsePaginationOptions = {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

type PaginationState = {
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
};

export const usePagination = (options: UsePaginationOptions = {}): PaginationState => {
  const {
    initialPage = 0,
    initialPageSize = 20,
    pageSizeOptions = [5, 10, 15, 20],
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((value: number) => {
    setPageState(Math.max(0, value));
  }, []);

  const setPageSize = useCallback((value: number) => {
    setPageSizeState(value);
    setPageState(0);
  }, []);

  return useMemo(
    () => ({
      page,
      pageSize,
      pageSizeOptions,
      setPage,
      setPageSize,
    }),
    [page, pageSize, pageSizeOptions, setPage, setPageSize],
  );
};
