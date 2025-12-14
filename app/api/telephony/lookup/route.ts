import { NextRequest, NextResponse } from "next/server";
import { findSupplierByPhone } from "@/lib/suppliers/service";

// GET /api/telephony/lookup?phone=79991234567
// Поиск поставщика по номеру телефона (для всплывающей карточки)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "phone parameter is required" },
        { status: 400 }
      );
    }

    const result = await findSupplierByPhone(phone);

    if (result.supplier) {
      return NextResponse.json({
        found: true,
        supplier: {
          id: result.supplier.id,
          name: result.supplier.name,
          short_name: result.supplier.short_name,
          category: result.supplier.category,
        },
        contact: result.contact
          ? {
              id: result.contact.id,
              name: result.contact.name,
              position: result.contact.position,
            }
          : null,
      });
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
