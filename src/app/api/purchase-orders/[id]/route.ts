import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrderById, updateDraftPurchaseOrder } from '@/backend/server/purchasing';
import { updateDraftPurchaseOrderSchema } from '@/shared/validations/purchasing';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const po = await getPurchaseOrderById(params.id);
    if (!po) {
      return NextResponse.json({ message: 'Purchase order not found' }, { status: 404 });
    }
    return NextResponse.json(po);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve purchase order' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const body = await req.json();
    const validated = updateDraftPurchaseOrderSchema.parse(body);
    const updated = await updateDraftPurchaseOrder(params.id, validated);
    return NextResponse.json(updated);
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
      { message: error.message || 'Failed to update purchase order' },
      { status: 400 }
    );
  }
}
