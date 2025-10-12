import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ModelEndpoint {
  provider_name: string;
  name: string;
  context_length: number;
  max_completion_tokens: number;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  status: string;
  uptime_last_30m: number;
  quantization: string;
  supported_parameters: string[];
}

/**
 * GET - получить детальную информацию о модели, включая эндпоинты
 * Query params: modelId (например: "openai/gpt-4o")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json(
        { error: "modelId parameter is required" },
        { status: 400 }
      );
    }

    // Преобразуем modelId в формат author/slug для API
    // Например: "openai/gpt-4o" -> "openai/gpt-4o"
    const response = await fetch(
      `https://openrouter.ai/api/v1/models/${modelId}/endpoints`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // Форматируем данные для удобства
    const formatted = {
      id: data.data.id,
      name: data.data.name,
      description: data.data.description,
      created: data.data.created,
      architecture: data.data.architecture,
      endpoints: data.data.endpoints.map((endpoint: ModelEndpoint) => ({
        provider: endpoint.provider_name,
        name: endpoint.name,
        context_length: endpoint.context_length,
        max_completion_tokens: endpoint.max_completion_tokens,
        pricing: {
          prompt: endpoint.pricing.prompt,
          completion: endpoint.pricing.completion,
          request: endpoint.pricing.request,
          image: endpoint.pricing.image,
        },
        status: endpoint.status,
        uptime_last_30m: endpoint.uptime_last_30m,
        quantization: endpoint.quantization,
        supported_parameters: endpoint.supported_parameters,
      })),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Model details API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch model details" },
      { status: 500 }
    );
  }
}
