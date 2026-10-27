import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Lightweight database connectivity probe using canonical client
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: 'healthy',
      system: 'Retail Inventory Management System (RIMS)',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch {
    // Return sanitized 503 response without exposing connection strings, credentials, or SQL details
    return NextResponse.json(
      {
        status: 'unhealthy',
        system: 'Retail Inventory Management System (RIMS)',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
