import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/server/reporting';

export async function GET(_req: NextRequest) {
  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve dashboard metrics' },
      { status: 500 }
    );
  }
}
