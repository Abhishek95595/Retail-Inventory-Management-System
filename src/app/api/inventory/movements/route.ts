import { NextRequest, NextResponse } from 'next/server';
import { getMovementHistory } from '@/server/movements';
import { queryMovementsSchema } from '@/lib/validations/movement';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawParams = {
      warehouseId: url.searchParams.get('warehouseId') || undefined,
      productId: url.searchParams.get('productId') || undefined,
      movementType: url.searchParams.get('movementType') || undefined,
      actorId: url.searchParams.get('actorId') || undefined,
      referenceType: url.searchParams.get('referenceType') || undefined,
      search: url.searchParams.get('search') || undefined,
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    };

    const parsed = queryMovementsSchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await getMovementHistory(parsed.data);
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
