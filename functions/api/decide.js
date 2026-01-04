export async function onRequestPost({ request, env }) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  
    try {
      const db = env.DB; // ✅ حسب كلامك binding اسمه DB
  
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || "").trim();
      const action = String(body.action || "").trim().toLowerCase(); // confirm | cancel
  
      if (!token || !["confirm", "cancel"].includes(action)) {
        return new Response(JSON.stringify({ ok: false, error: "BAD_REQUEST" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...cors, "Cache-Control": "no-store" },
        });
      }
  
      // القيم اللي بنحفظها
      const status = action === "confirm" ? "confirmed" : "canceled";
      const decision = action; // نخلي decision = confirm/cancel
  
      // ✅ تثبيت القرار مرة واحدة فقط:
      // الشرط: ما تم اتخاذ قرار سابق (decision/decided_at NULL)
      let updateSql = `
        UPDATE requests
        SET
          status = ?,
          decision = ?,
          decided_at = datetime('now')
          ${action === "confirm" ? ", confirmed_at = datetime('now')" : ""}
        WHERE token = ?
          AND (decision IS NULL OR decision = '')
          AND (decided_at IS NULL OR decided_at = '')
      `;
  
      const updateRes = await db.prepare(updateSql).bind(status, decision, token).run();
      const changes = updateRes?.meta?.changes || 0;
  
      // نجيب النتيجة النهائية دائمًا (سواء تم التحديث الآن أو كان سابق)
      const row = await db
        .prepare(`SELECT status, decision, decided_at, confirmed_at FROM requests WHERE token = ? LIMIT 1`)
        .bind(token)
        .first();
  
      if (!row) {
        return new Response(JSON.stringify({ ok: false, error: "NOT_FOUND" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...cors, "Cache-Control": "no-store" },
        });
      }
  
      return new Response(
        JSON.stringify({
          ok: true,
          changed: Number(changes), // 1 إذا تثبت الآن، 0 إذا كان مثبت مسبقًا
          status: row.status,
          decision: row.decision,
          decided_at: row.decided_at,
          confirmed_at: row.confirmed_at,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors, "Cache-Control": "no-store" },
        }
      );
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors, "Cache-Control": "no-store" },
      });
    }
  }
  
  export async function onRequestOptions() {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  