import { NextRequest, NextResponse } from 'next/server';
import { getSummaryReportData } from '@/lib/tenders/summary-report-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;
    const managerId = searchParams.get('manager_id') || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    const data = await getSummaryReportData({
      companyId,
      dateFrom,
      dateTo,
      managerId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in summary-report API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
