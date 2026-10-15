import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { RegistrarService } from "@/core/domains/registrar-service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("domain") || "";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'query' or 'domain' is required." },
        { status: 400 }
      );
    }

    const result = await RegistrarService.search(query);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to search domain availability" },
      { status: err.statusCode || 400 }
    );
  }
}
