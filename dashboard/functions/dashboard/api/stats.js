export async function onRequestGet({ request, env }) {
  // Cloudflare Access عادة يمنع قبل يوصل هنا، بس نخلي تحقق إضافي
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // لاحقًا نربطها بـ D1
  return new Response(JSON.stringify({ ok: true, total: 1 }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
export async function onRequest(context) {
  const { env } = context;
  const db = env.talab_db; // اسم D1 binding

  // 1️⃣ إجمالي الطلبات
  const totalRes = await db.prepare(
    `SELECT COUNT(*) as total FROM requests`
  ).first();

  // 2️⃣ المؤكدة
  const confirmedRes = await db.prepare(
    `SELECT COUNT(*) as confirmed FROM requests WHERE confirmed_at IS NOT NULL`
  ).first();

  // 3️⃣ غير المؤكدة
  const pendingRes = await db.prepare(
    `SELECT COUNT(*) as pending FROM requests WHERE confirmed_at IS NULL`
  ).first();

  // 4️⃣ حسب المدينة
  const byCityRes = await db.prepare(`
    SELECT
      city,
      COUNT(*) as total,
      SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN confirmed_at IS NULL THEN 1 ELSE 0 END) as pending
    FROM requests
    GROUP BY city
  `).all();

  // 5️⃣ آخر 10 طلبات
  const latestRes = await db.prepare(`
    SELECT id, name, city, status, created_at
    FROM requests
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return new Response(
    JSON.stringify({
      cards: {
        total: totalRes.total,
        confirmed: confirmedRes.confirmed,
        pending: pendingRes.pending,
      },
      byCity: byCityRes.results,
      latest: latestRes.results,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
