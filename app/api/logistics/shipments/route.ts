import { NextRequest, NextResponse } from "next/server";
import { getShipments, createShipment, shipmentFormSchema } from "@/lib/logistics/service";
import { ZodError } from "zod";

export async function GET() {
  try {
    const shipments = await getShipments();
    return NextResponse.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении отправок' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидируем данные
    const validatedData = shipmentFormSchema.parse(body);
    
    const shipment = await createShipment(validatedData);
    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    console.error('Error creating shipment:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка при создании отправки' },
      { status: 500 }
    );
  }
}
