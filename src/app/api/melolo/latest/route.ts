
import { type NextRequest } from "next/server";
import { encryptedResponse, safeJson } from "@/lib/api-utils";
import { extractMeloloBooks } from "../utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";
    const response = await fetch(`${baseUrl}/melolo/get-latest`, { cache: "no-store" });

    if (!response.ok) {
      return encryptedResponse({ books: [], code: response.status });
    }

    const json = await safeJson<any>(response);
    const books = extractMeloloBooks(json?.data);

    return encryptedResponse({
      books,
      code: json?.code ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Melolo Latest Error:", message);
    return encryptedResponse({ books: [], error: message }, 500);
  }
}
