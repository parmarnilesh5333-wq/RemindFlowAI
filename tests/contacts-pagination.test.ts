import { describe, it, expect } from "vitest";

describe("Contacts Pagination and Count Consistency", () => {
  const calculatePagination = (
    total: number,
    unfilteredTotal: number,
    page: number,
    limit: number
  ) => {
    const validLimit = Math.max(1, limit);
    const totalPages = Math.max(1, Math.ceil(total / validLimit));
    const validPage = Math.min(Math.max(1, page), totalPages);
    const skip = (validPage - 1) * validLimit;
    const startItem = total === 0 ? 0 : skip + 1;
    const endItem = Math.min(skip + validLimit, total);

    return {
      total,
      unfilteredTotal,
      page: validPage,
      limit: validLimit,
      totalPages,
      startItem,
      endItem,
    };
  };

  it("calculates pagination correctly when all 11 contacts fit on a single page (limit=25)", () => {
    const p = calculatePagination(11, 11, 1, 25);
    expect(p.total).toBe(11);
    expect(p.unfilteredTotal).toBe(11);
    expect(p.totalPages).toBe(1);
    expect(p.startItem).toBe(1);
    expect(p.endItem).toBe(11);
  });

  it("calculates 2 pages when limit is 10 for 11 contacts", () => {
    const page1 = calculatePagination(11, 11, 1, 10);
    expect(page1.total).toBe(11);
    expect(page1.unfilteredTotal).toBe(11);
    expect(page1.totalPages).toBe(2);
    expect(page1.startItem).toBe(1);
    expect(page1.endItem).toBe(10);

    const page2 = calculatePagination(11, 11, 2, 10);
    expect(page2.page).toBe(2);
    expect(page2.totalPages).toBe(2);
    expect(page2.startItem).toBe(11);
    expect(page2.endItem).toBe(11);
  });

  it("preserves unfilteredTotal when filters reduce the matched count", () => {
    // e.g. Filtering by 'Class 10 CBSE Maths' matches 4 contacts out of 11 total
    const filtered = calculatePagination(4, 11, 1, 25);
    expect(filtered.total).toBe(4);
    expect(filtered.unfilteredTotal).toBe(11);
    expect(filtered.totalPages).toBe(1);
    expect(filtered.startItem).toBe(1);
    expect(filtered.endItem).toBe(4);
  });

  it("handles empty results gracefully without negative indexes", () => {
    const empty = calculatePagination(0, 11, 1, 25);
    expect(empty.total).toBe(0);
    expect(empty.unfilteredTotal).toBe(11);
    expect(empty.startItem).toBe(0);
    expect(empty.endItem).toBe(0);
    expect(empty.totalPages).toBe(1);
  });
});
