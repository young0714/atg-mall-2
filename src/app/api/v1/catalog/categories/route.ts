import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    data: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl })),
  });
}
