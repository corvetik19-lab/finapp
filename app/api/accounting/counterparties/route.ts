import { NextRequest, NextResponse } from "next/server";
import {
  getCounterpartiesList,
  createCounterparty,
  importCounterpartiesFromTenders,
  searchByInn,
  CounterpartyFilters,
  CreateCounterpartyInput,
} from "@/lib/accounting/counterparty-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "list";

  try {
    switch (action) {
      case "list": {
        const search = searchParams.get("search") || undefined;
        const isCustomer = searchParams.get("isCustomer");
        const isSupplier = searchParams.get("isSupplier");

        const filters: CounterpartyFilters = {
          search,
          isCustomer: isCustomer ? isCustomer === "true" : undefined,
          isSupplier: isSupplier ? isSupplier === "true" : undefined,
        };

        const counterparties = await getCounterpartiesList(filters);
        return NextResponse.json({ counterparties });
      }

      case "searchInn": {
        const inn = searchParams.get("inn");
        if (!inn) {
          return NextResponse.json({ error: "inn is required" }, { status: 400 });
        }

        const result = await searchByInn(inn);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result.data);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in counterparties API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const input: CreateCounterpartyInput = {
          name: body.name,
          shortName: body.shortName,
          inn: body.inn,
          kpp: body.kpp,
          ogrn: body.ogrn,
          legalAddress: body.legalAddress,
          actualAddress: body.actualAddress,
          phone: body.phone,
          email: body.email,
          website: body.website,
          bankName: body.bankName,
          bik: body.bik,
          checkingAccount: body.checkingAccount,
          correspondentAccount: body.correspondentAccount,
          contactPerson: body.contactPerson,
          notes: body.notes,
          isCustomer: body.isCustomer,
          isSupplier: body.isSupplier,
          tenderId: body.tenderId,
        };

        if (!input.name || !input.inn) {
          return NextResponse.json(
            { error: "name and inn are required" },
            { status: 400 }
          );
        }

        const result = await createCounterparty(input);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ counterpartyId: result.counterpartyId });
      }

      case "import": {
        const result = await importCounterpartiesFromTenders();

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ imported: result.imported });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in counterparties API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
