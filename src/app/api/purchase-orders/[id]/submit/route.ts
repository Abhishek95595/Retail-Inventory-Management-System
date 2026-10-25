import { NextRequest, NextResponse } from 'next/server';
import { submitPurchaseOrder } from '@/server/purchasing';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const updated = await submitPurchaseOrder(params.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to submit purchase order' },
      { status: 400 }
    );
  }
}
