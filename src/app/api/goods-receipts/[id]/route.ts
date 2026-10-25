import { NextRequest, NextResponse } from 'next/server';
import { getGoodsReceiptById } from '@/server/purchasing';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const receipt = await getGoodsReceiptById(params.id);
    if (!receipt) {
      return NextResponse.json({ message: 'Goods receipt not found' }, { status: 404 });
    }
    return NextResponse.json(receipt);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve goods receipt' },
      { status: 500 }
    );
  }
}
