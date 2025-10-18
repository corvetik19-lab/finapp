/**
 * API endpoint для выполнения AI tool calls
 */

import { NextRequest, NextResponse } from "next/server";
import { toolHandlers } from "@/lib/ai/tool-handlers";
import type { ToolName } from "@/lib/ai/tools";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { toolName, parameters } = await req.json();

    if (!toolName || !toolHandlers[toolName as ToolName]) {
      return NextResponse.json(
        { error: "Invalid tool name" },
        { status: 400 }
      );
    }

    // Выполнить tool handler
    const handler = toolHandlers[toolName as ToolName];
    const result = await handler(parameters);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to execute tool";
    console.error("Tool execution error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
