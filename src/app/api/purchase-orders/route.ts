import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrders, createPurchaseOrder } from '@/backend/server/purchasing';
import { createPurchaseOrderSchema, queryPurchaseOrdersSchema } from '@/shared/validations/purchasing';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = queryPurchaseOrdersSchema.parse({
      status: searchParams.get('status') || undefined,
      supplierId: searchParams.get('supplierId') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const result = await getPurchaseOrders(filters);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.errors },
        { status: 400 }
      );
    }
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve purchase orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createPurchaseOrderSchema.parse(body);
    const result = await createPurchaseOrder(validated);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.errors },
        { status: 400 }
      );
    }
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to create purchase order' },
      { status: 400 }
    );
  }
}
