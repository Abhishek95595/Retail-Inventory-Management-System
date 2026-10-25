import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    // Requires both authentication and the specific CATALOG_READ permission
    const user = await requirePermission(PERMISSIONS.CATALOG_READ);

    return NextResponse.json({
      success: true,
      message: 'Access granted to catalog resource',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }
    if (error.message === 'ACCOUNT_DEACTIVATED') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Account is deactivated' },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
