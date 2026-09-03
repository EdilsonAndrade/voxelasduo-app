import { NextResponse } from "next/server";
import getMongoClient from "@/lib/db/mongodb";

export async function GET() {
  try {
    const client = await getMongoClient();
    await client.db().command({ ping: 1 });

    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        message: "Não foi possível conectar ao MongoDB Atlas.",
      },
      { status: 503 }
    );
  }
}
