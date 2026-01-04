export async function onRequestGet({ env }) {
  try {
    // ✅ مهم: اسم الـ binding هنا لازم يطابق اللي حطيتيه في D1 binding داخل Cloudflare Pages
    // إذا اسم البايندنق عندك "talab_db" خليه env.talab_db
    // إذا اسم البايندنق عندك "DB" خليه env.DB
    const db = env.DB;

    const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM requests`).first();
    
    const confirmedRow = await db.prepare(`
      SELECT COUNT(*) AS n FROM requests
      WHERE lower(status) IN ('confirmed','received')
    `).first();
    
    const canceledRow = await db.prepare(`
      SELECT COUNT(*) AS n FROM requests
      WHERE lower(status) IN ('canceled','cancelled')
    `).first();
    
    const pendingRow = await db.prepare(`
      SELECT COUNT(*) AS n FROM requests
      WHERE lower(status) NOT IN ('confirmed','received','canceled','cancelled')
    `).first();
    

    const byCity = await db.prepare(`
      SELECT
        city,
        COUNT(*) AS total,
        SUM(CASE WHEN lower(status) IN ('confirmed','received controversies') OR lower(status) IN ('confirmed','received') THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN lower(status) IN ('canceled','cancelled') THEN 1 ELSE 0 END) AS canceled,
        SUM(CASE WHEN lower(status) NOT IN ('confirmed','received','canceled','cancelled') THEN 1 ELSE 0 END) AS pending
      FROM requests
      GROUP BY city
      ORDER BY total DESC
    `).all();
    

    const latest = await db.prepare(`
      SELECT id, name, mobile, city, status, decision, token, created_at, decided_at
      FROM requests
      ORDER BY datetime(created_at) DESC
      LIMIT 20
    `).all();
    

    return new Response(JSON.stringify({
      cards: {
        total: totalRow?.n ?? 0,
        confirmed: confirmedRow?.n ?? 0,
        pending: pendingRow?.n ?? 0
      },
      byCity: byCity.results || [],
      latest: latest.results || []
    }), {
      headers: { "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0",}
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0", }
    });
  }
}
