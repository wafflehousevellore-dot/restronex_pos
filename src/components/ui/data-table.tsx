"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  accessor?: (item: T) => any;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor?: (item: T, index: number) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  actions?: React.ReactNode;
  exportFileName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  dense?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor = (item, index) => item.id ?? index,
  searchable = true,
  searchPlaceholder = "Search records...",
  searchFilter,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  showPagination = true,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  actions,
  exportFileName,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries matching your current view or filter criteria.",
  loading = false,
  dense = false,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(initialPageSize);
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Filtered records
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    if (searchFilter) {
      return data.filter((item) => searchFilter(item, q));
    }

    return data.filter((item) => {
      return columns.some((col) => {
        let val: any;
        if (col.accessor) val = col.accessor(item);
        else val = item[col.key];

        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, searchQuery, searchFilter, columns]);

  // Sorted records
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA: any = col.accessor ? col.accessor(a) : a[sortKey];
      const valB: any = col.accessor ? col.accessor(b) : b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortOrder, columns]);

  // Paginated records
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedData = React.useMemo(() => {
    if (!showPagination) return sortedData;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const allIds = paginatedData.map((item, idx) => keyExtractor(item, idx));
      onSelectionChange(Array.from(new Set([...selectedIds, ...allIds])));
    } else {
      const pageIds = new Set(paginatedData.map((item, idx) => keyExtractor(item, idx)));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleExportCSV = () => {
    if (!sortedData.length) return;
    const headers = columns.map((c) => (typeof c.header === "string" ? c.header : c.key));
    const rows = sortedData.map((item) =>
      columns.map((c) => {
        const val = c.accessor ? c.accessor(item) : item[c.key];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exportFileName || "restronex-export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allOnPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item, idx) => selectedIds.includes(keyExtractor(item, idx)));

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Table Toolbar */}
      {(searchable || actions || exportFileName) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {searchable ? (
            <div className="w-full sm:w-72">
              <SearchInput
                value={searchQuery}
                onChange={(q) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
              />
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {exportFileName && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] hover:border-[#16845B]/40 px-3.5 py-2 text-xs font-semibold text-[#172B25] shadow-2xs transition"
              >
                <Download className="h-3.5 w-3.5 text-[#718078]" />
                <span>Export CSV</span>
              </button>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="w-full overflow-hidden rounded-2xl border border-[#E5EBE7] bg-white shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full caption-bottom text-left border-collapse">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7]">
              <tr>
                {selectable && (
                  <th className="w-10 px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-[#E5EBE7] text-[#16845B] focus:ring-[#16845B]/30 h-4 w-4"
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left";

                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn(
                        "px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#718078] whitespace-nowrap",
                        alignClass,
                        col.sortable && "cursor-pointer select-none hover:text-[#172B25]",
                        col.className
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.align === "right" && "justify-end",
                          col.align === "center" && "justify-center"
                        )}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-[#A0ACA5]">
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-[#16845B]" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-[#16845B]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5EBE7]">
              {loading ? (
                Array.from({ length: pageSize }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    {selectable && (
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-4 bg-[#F0F4F2] rounded" />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-4 py-3.5">
                        <div className="h-4 bg-[#F0F4F2] rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="p-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/15 flex items-center justify-center text-[#16845B] mb-2.5">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-bold text-[#172B25]">{emptyTitle}</div>
                      <div className="text-xs text-[#718078] max-w-sm mt-0.5">
                        {emptyDescription}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const rowId = keyExtractor(item, index);
                  const isSelected = selectedIds.includes(rowId);

                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        "transition-colors hover:bg-[#F8FAF9]/80",
                        dense ? "py-2" : "py-3",
                        onRowClick && "cursor-pointer",
                        isSelected && "bg-[#E8F5EE]/40"
                      )}
                    >
                      {selectable && (
                        <td
                          className="px-4 py-3 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(rowId)}
                            className="rounded border-[#E5EBE7] text-[#16845B] focus:ring-[#16845B]/30 h-4 w-4"
                          />
                        </td>
                      )}

                      {columns.map((col) => {
                        const alignClass =
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left";

                        const cellContent = col.render
                          ? col.render(item, index)
                          : col.accessor
                          ? col.accessor(item)
                          : item[col.key];

                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-4 align-middle text-sm text-[#172B25]",
                              dense ? "py-2 text-[13px]" : "py-3",
                              alignClass,
                              col.className
                            )}
                          >
                            {cellContent !== null && cellContent !== undefined ? (
                              cellContent
                            ) : (
                              <span className="text-[#A0ACA5]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {showPagination && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-[#E5EBE7] bg-[#F8FAF9]/60 text-xs text-[#718078]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[#E5EBE7] bg-white px-2 py-1 text-xs text-[#172B25] font-semibold focus:outline-none focus:border-[#16845B]"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="hidden sm:inline">
                Showing {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1 rounded-lg border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-semibold text-[#172B25]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1 rounded-lg border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
