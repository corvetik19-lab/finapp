import { NextRequest, NextResponse } from 'next/server';
import { getDebtsReportData } from '@/lib/tenders/debts-report-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    const data = await getDebtsReportData({
      companyId,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in debts-report API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
