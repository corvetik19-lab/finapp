import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    
    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const { name, category_id, default_unit, is_active } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Название товара обязательно" },
        { status: 400 }
      );
    }

    // Проверяем на дубликаты (без учёта регистра)
    const { data: existingProducts } = await supabase
      .from("product_items")
      .select("name")
      .eq("user_id", user.id)
      .ilike("name", name.trim());

    if (existingProducts && existingProducts.length > 0) {
      return NextResponse.json(
        { success: false, error: `Товар с названием "${name.trim()}" уже существует` },
        { status: 409 }
      );
    }

    // Создаём товар
    const { data: product, error: productError } = await supabase
      .from("product_items")
      .insert({
        user_id: user.id,
        name: name.trim(),
        category_id: category_id || null,
        default_unit: default_unit || "шт",
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (productError || !product) {
      console.error("Product creation error:", productError);
      return NextResponse.json(
        { success: false, message: "Ошибка создания товара: " + productError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Товар "${product.name}" успешно создан`,
      product: {
        id: product.id,
        name: product.name,
        category_id: product.category_id,
        default_unit: product.default_unit,
        is_active: product.is_active
      }
    });

  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка создания товара: " + (error as Error).message },
      { status: 500 }
    );
  }
}
