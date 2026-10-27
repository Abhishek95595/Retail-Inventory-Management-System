import { NextRequest, NextResponse } from 'next/server';
import { getInventoryReport, exportInventoryReportCsv } from '@/backend/server/reporting';
import { queryInventoryReportSchema } from '@/shared/validations/reporting';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isCsv = searchParams.get('format') === 'csv';

    const filters = queryInventoryReportSchema.parse({
      warehouseId: searchParams.get('warehouseId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      search: searchParams.get('search') || undefined,
      lowStockOnly: searchParams.get('lowStockOnly') || undefined,
      outOfStockOnly: searchParams.get('outOfStockOnly') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (isCsv) {
      const csv = await exportInventoryReportCsv(filters);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventory-report-${Date.now()}.csv"`,
        },
      });
    }

    const report = await getInventoryReport(filters);
    return NextResponse.json(report);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.errors },
        { status: 400 }
      );
    }
    if (
      error.message === 'UNAUTHORIZED' ||
      error.message === 'ACCOUNT_DEACTIVATED' ||
      error.message?.includes('Unauthorized')
    ) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve inventory report' },
      { status: 500 }
    );
  }
}
