import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock backend server reporting service functions
const mockGetInventoryReport = vi.fn();
const mockExportInventoryReportCsv = vi.fn();
const mockGetAuditLogs = vi.fn();

vi.mock('@/backend/server/reporting', () => ({
  getInventoryReport: (...args: unknown[]) => mockGetInventoryReport(...args),
  exportInventoryReportCsv: (...args: unknown[]) => mockExportInventoryReportCsv(...args),
  getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
}));

describe('API Authentication & Authorization Error Mapping Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/reports/inventory', () => {
    it('returns HTTP 401 when requireAuth throws UNAUTHORIZED', async () => {
      const { GET } = await import('@/app/api/reports/inventory/route');
      mockGetInventoryReport.mockRejectedValueOnce(new Error('UNAUTHORIZED'));

      const req = new NextRequest('http://localhost:3000/api/reports/inventory');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ message: 'Unauthorized' });
    });

    it('returns HTTP 401 when account is deactivated', async () => {
      const { GET } = await import('@/app/api/reports/inventory/route');
      mockGetInventoryReport.mockRejectedValueOnce(new Error('ACCOUNT_DEACTIVATED'));

      const req = new NextRequest('http://localhost:3000/api/reports/inventory');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ message: 'Unauthorized' });
    });

    it('returns HTTP 403 when user lacks required permission (FORBIDDEN)', async () => {
      const { GET } = await import('@/app/api/reports/inventory/route');
      mockGetInventoryReport.mockRejectedValueOnce(new Error('FORBIDDEN'));

      const req = new NextRequest('http://localhost:3000/api/reports/inventory');
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ message: 'Forbidden' });
    });

    it('returns HTTP 500 when an unexpected internal error occurs', async () => {
      const { GET } = await import('@/app/api/reports/inventory/route');
      mockGetInventoryReport.mockRejectedValueOnce(new Error('Database disk error'));

      const req = new NextRequest('http://localhost:3000/api/reports/inventory');
      const res = await GET(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ message: 'Database disk error' });
    });

    it('returns HTTP 200 with report data for successful authorized request', async () => {
      const { GET } = await import('@/app/api/reports/inventory/route');
      const mockResult = {
        summary: { totalItems: 1, totalValue: 100 },
        items: [],
        page: 1,
        limit: 50,
        totalPages: 1,
      };
      mockGetInventoryReport.mockResolvedValueOnce(mockResult);

      const req = new NextRequest('http://localhost:3000/api/reports/inventory');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResult);
    });
  });

  describe('GET /api/audit-logs', () => {
    it('returns HTTP 401 when requireAuth throws UNAUTHORIZED', async () => {
      const { GET } = await import('@/app/api/audit-logs/route');
      mockGetAuditLogs.mockRejectedValueOnce(new Error('UNAUTHORIZED'));

      const req = new NextRequest('http://localhost:3000/api/audit-logs');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ message: 'Unauthorized' });
    });

    it('returns HTTP 401 when account is deactivated', async () => {
      const { GET } = await import('@/app/api/audit-logs/route');
      mockGetAuditLogs.mockRejectedValueOnce(new Error('ACCOUNT_DEACTIVATED'));

      const req = new NextRequest('http://localhost:3000/api/audit-logs');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ message: 'Unauthorized' });
    });

    it('returns HTTP 403 when user lacks required permission (FORBIDDEN)', async () => {
      const { GET } = await import('@/app/api/audit-logs/route');
      mockGetAuditLogs.mockRejectedValueOnce(new Error('FORBIDDEN'));

      const req = new NextRequest('http://localhost:3000/api/audit-logs');
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ message: 'Forbidden' });
    });

    it('returns HTTP 500 when an unexpected internal error occurs', async () => {
      const { GET } = await import('@/app/api/audit-logs/route');
      mockGetAuditLogs.mockRejectedValueOnce(new Error('Connection terminated'));

      const req = new NextRequest('http://localhost:3000/api/audit-logs');
      const res = await GET(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ message: 'Connection terminated' });
    });

    it('returns HTTP 200 with audit logs for successful authorized request', async () => {
      const { GET } = await import('@/app/api/audit-logs/route');
      const mockResult = {
        items: [],
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      };
      mockGetAuditLogs.mockResolvedValueOnce(mockResult);

      const req = new NextRequest('http://localhost:3000/api/audit-logs');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResult);
    });
  });
});
