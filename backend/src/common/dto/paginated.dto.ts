export class PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}
