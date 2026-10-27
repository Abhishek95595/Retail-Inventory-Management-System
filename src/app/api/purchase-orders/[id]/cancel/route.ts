import { NextRequest, NextResponse } from 'next/server';
import { cancelPurchaseOrder } from '@/backend/server/purchasing';
import { cancelPurchaseOrderSchema } from '@/shared/validations/purchasing';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }
    const validated = cancelPurchaseOrderSchema.parse(body);
    const updated = await cancelPurchaseOrder(params.id, validated);
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
      { message: error.message || 'Failed to cancel purchase order' },
      { status: 400 }
    );
  }
}
