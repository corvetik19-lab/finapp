import { NextRequest, NextResponse } from "next/server";
import { getShipment, updateShipmentStatus, deleteShipment } from "@/lib/logistics/service";
import { ShipmentStatus } from "@/types/logistics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const shipment = await getShipment(id);
    
    if (!shipment) {
      return NextResponse.json(
        { error: 'Отправка не найдена' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(shipment);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении отправки' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.status) {
      return NextResponse.json(
        { error: 'Статус обязателен' },
        { status: 400 }
      );
    }
    
    const shipment = await updateShipmentStatus(
      id, 
      body.status as ShipmentStatus, 
      body.notes
    );
    
    return NextResponse.json(shipment);
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении отправки' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteShipment(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении отправки' },
      { status: 500 }
    );
  }
}
