export async function onRequestGet({ request, env }) {
    const db = env.DB;
    const url = new URL(request.url);
    const token = (url.searchParams.get("token") || "").trim();
  
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "BAD_REQUEST" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
  
    const row = await db
      .prepare(`SELECT status, decision, decided_at, confirmed_at FROM requests WHERE token = ? LIMIT 1`)
      .bind(token)
      .first();
  
    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: "NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
  
    return new Response(JSON.stringify({ ok: true, ...row }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  