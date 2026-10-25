import { NextRequest, NextResponse } from 'next/server';
import { getInventoryBalances, InventoryBalanceFilters } from '@/server/inventory';
import { queryInventoryBalanceSchema } from '@/lib/validations/warehouse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawParams = {
      warehouseId: url.searchParams.get('warehouseId') || undefined,
      productId: url.searchParams.get('productId') || undefined,
      categoryId: url.searchParams.get('categoryId') || undefined,
      search: url.searchParams.get('search') || undefined,
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      sortBy: url.searchParams.get('sortBy') || undefined,
      sortOrder: url.searchParams.get('sortOrder') || undefined,
    };

    const parsed = queryInventoryBalanceSchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await getInventoryBalances(parsed.data as InventoryBalanceFilters);
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
