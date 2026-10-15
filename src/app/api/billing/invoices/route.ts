import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { invoiceRepository } from "@/db/invoice-repository";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const invoices = invoiceRepository.listInvoicesForUser(user.id);

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to retrieve invoices" },
      { status: 500 }
    );
  }
}
