import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";

/*
 * Shared antd pagination helpers + react-query powered pagination.
 * Default: 7 records per page across the app.
 */

export const DEFAULT_PAGE_SIZE = 7;

/**
 * Pagination props for tables where all data is already loaded client-side.
 * antd derives current/total automatically from `dataSource`.
 *
 * Usage: <Table pagination={clientPagination({ label: "expenses" })} ... />
 */
export function clientPagination({
  label = "records",
  showSizeChanger = false,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  return {
    pageSize,
    showSizeChanger,
    showTotal: (total) => `Total ${total} ${label}`,
  };
}

/**
 * Pagination props for server-side paginated tables.
 * Mirror a pagination state object (as synced from the API response).
 *
 * Usage: <Table pagination={serverPagination(pagination, { label: "sales" })} ... />
 */
export function serverPagination(
  paginationState,
  {
    label = "records",
    showSizeChanger = false,
    pageSize = DEFAULT_PAGE_SIZE,
    onChange,
  } = {}
) {
  return {
    current: paginationState?.current ?? 1,
    pageSize: paginationState?.pageSize || pageSize,
    total: paginationState?.total ?? 0,
    showSizeChanger,
    showTotal: (total) => `Total ${total} ${label}`,
    ...(onChange ? { onChange } : {}),
  };
}

/**
 * Server-side pagination backed by react-query.
 * Fetches `GET <url>` with `{ page, per_page }` (+ extra `params`) and keeps the
 * page state, then hands back antd-ready pagination props.
 *
 * Usage:
 *   const {
 *     data: expenses, total, isLoading, pagination, setCurrentPage,
 *   } = useServerPagination({
 *     queryKey: ["expenses", branchId],
 *     url: "/expenses",
 *     params: { branch_id: branchId }, // optional, included in the query key
 *     label: "expenses",
 *   });
 *
 *   <Table
 *     columns={...}
 *     dataSource={expenses}
 *     loading={isLoading}
 *     pagination={pagination}
 *     onChange={(p) => setCurrentPage(p)}
 *   />
 */
export function useServerPagination({
  queryKey = [],
  url,
  params,
  label = "records",
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
  ...queryOptions
} = {}) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const cleanParams = Object.fromEntries(
    Object.entries({ page: currentPage, per_page: pageSize, ...(params || {}) }).filter(
      ([, v]) => v !== undefined && v !== ""
    )
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [[].concat(queryKey), cleanParams],
    queryFn: () => api.get(url, { params: cleanParams }),
    enabled,
    ...queryOptions,
  });

  const responseData = data?.data ?? {};
  const items = responseData.data ?? responseData.items ?? (Array.isArray(responseData) ? responseData : []);
  const total =
    responseData.pagination?.total ??
    responseData.meta?.total ??
    responseData.total ??
    (Array.isArray(responseData) ? responseData.length : 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [].concat(queryKey) });

  return {
    data: items,
    raw: responseData,
    total,
    currentPage,
    pageSize,
    setCurrentPage,
    pagination: serverPagination(
      { current: currentPage, pageSize, total },
      { label, onChange: (page) => setCurrentPage(page) }
    ),
    invalidate,
    refetch,
    isLoading,
    isFetching,
    isError,
    error,
  };
}

/**
 * useMutation wrapper that auto-invalidates a query key on success:
 * a simple pattern for "mutate some rows, then refresh the paginated list".
 *
 * Usage:
 *   const deleteExpense = useInvalidatingMutation(
 *     (id) => api.delete(`/expenses/${id}`),
 *     ["expenses"],
 *   );
 *
 *   await deleteExpense.mutateAsync(expenseId); // list refreshes automatically
 */
export function useInvalidatingMutation(
  mutationFn,
  queryKey,
  { onSuccess, ...mutationOptions } = {}
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    ...mutationOptions,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [].concat(queryKey) });
      if (typeof onSuccess === "function") onSuccess(...args);
    },
  });
}