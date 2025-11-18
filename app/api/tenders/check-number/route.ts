import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/check-number - проверка существования номера тендера
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const searchParams = request.nextUrl.searchParams;
    const purchaseNumber = searchParams.get('purchase_number');

    if (!purchaseNumber) {
      return NextResponse.json(
        { error: 'Purchase number is required' },
        { status: 400 }
      );
    }

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем существование тендера с таким номером
    const { data: existingTender, error } = await supabase
      .from('tenders')
      .select('id, purchase_number, subject')
      .eq('purchase_number', purchaseNumber)
      .maybeSingle();

    if (error) {
      console.error('Error checking tender number:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      exists: !!existingTender,
      tender: existingTender || null,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/check-number:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
