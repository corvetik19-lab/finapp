import { NextRequest, NextResponse } from 'next/server';
import { searchTenderInEIS, getTenderDocuments } from '@/lib/tenders/eis-mock-data';

/**
 * API endpoint для поиска тендера в ЕИС по номеру
 * GET /api/tenders/search-eis?purchase_number=32515383401
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseNumber = searchParams.get('purchase_number');

    if (!purchaseNumber) {
      return NextResponse.json(
        { error: 'Параметр purchase_number обязателен' },
        { status: 400 }
      );
    }

    // Поиск тендера в ЕИС (мок)
    const tenderData = await searchTenderInEIS(purchaseNumber);

    if (!tenderData) {
      return NextResponse.json(
        { error: 'Тендер не найден в ЕИС', purchase_number: purchaseNumber },
        { status: 404 }
      );
    }

    // Получение документов (опционально)
    const includeDocuments = searchParams.get('include_documents') === 'true';
    let documents: Array<{ name: string; url: string }> = [];

    if (includeDocuments) {
      documents = await getTenderDocuments(purchaseNumber);
    }

    return NextResponse.json({
      success: true,
      data: tenderData,
      documents: includeDocuments ? documents : undefined,
    });
  } catch (error) {
    console.error('Error searching tender in EIS:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске тендера в ЕИС' },
      { status: 500 }
    );
  }
}
