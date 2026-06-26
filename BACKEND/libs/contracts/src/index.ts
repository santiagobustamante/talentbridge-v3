export interface ServiceHealth {
  service: string;
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  statusCode: number;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
