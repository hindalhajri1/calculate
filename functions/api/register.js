export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const name = (body.name || "").trim();
    const mobile = (body.mobile || "").trim();
    const city = (body.city || "").trim();
    const count = Number(body.count || 1);

    if (!name || !mobile || !city || !Number.isFinite(count) || count < 1) {
      return json({ ok: false, error: "بيانات غير مكتملة" }, 400);
    }

    const token = crypto.randomUUID();
    const now = new Date().toISOString();

    // ✅ فورم افتراضي مؤقت (حالياً فورم واحد)
    const FORM_ID = 1;

    await env.DB
      .prepare(
        `INSERT INTO requests
         (form_id, created_at, name, mobile, city, count, status, token)
         VALUES (?, ?, ?, ?, ?, ?, 'Registered', ?)`
      )
      .bind(FORM_ID, now, name, mobile, city, count, token)
      .run();

    // رابط التأكيد (واتس)
    const confirmUrl = new URL("/confirm", request.url);
    confirmUrl.searchParams.set("token", token);

    return json({
      ok: true,
      token,
      confirmUrl: confirmUrl.toString(),
      message: "تم تسجيل طلبك بنجاح",
    });

  } catch (e) {
    return json({ ok: false, error: e?.message || "خطأ غير متوقع" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      // لو احتجتي CORS للـ preflight مستقبلاً
      // "Access-Control-Allow-Methods": "POST, OPTIONS",
      // "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
