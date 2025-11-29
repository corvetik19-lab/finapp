import { NextRequest, NextResponse } from 'next/server';
import { getRealizationReportData } from '@/lib/tenders/realization-report-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;
    const executorId = searchParams.get('executor_id') || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    const data = await getRealizationReportData({
      companyId,
      dateFrom,
      dateTo,
      executorId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in realization-report API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
