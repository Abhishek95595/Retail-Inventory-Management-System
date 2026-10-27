import { NextRequest, NextResponse } from 'next/server';
import { getWarehouses, createWarehouse, WarehouseFilters } from '@/backend/server/warehouses';
import { createWarehouseSchema } from '@/shared/validations/warehouse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const isActiveParam = url.searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const sortBy = (url.searchParams.get('sortBy') as WarehouseFilters['sortBy']) || 'name';
    const sortOrder = (url.searchParams.get('sortOrder') as WarehouseFilters['sortOrder']) || 'asc';

    const items = await getWarehouses({
      search,
      isActive,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, data: items });
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createWarehouseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const created = await createWarehouse(parsed.data);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
