export async function onRequestPost({ request, env }) {
  try {
    const email =
      request.headers.get("Cf-Access-Authenticated-User-Email") ||
      request.headers.get("cf-access-authenticated-user-email") ||
      "";

    if (!email) {
      return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    let slug = String(body.slug || "").trim();

    if (!name) return json({ ok: false, error: "NAME_REQUIRED" }, 400);

    // لو slug فاضي: توليد تلقائي
    if (!slug) slug = slugify(name);

    // تأكد slug فريد لهذا المستخدم (أو بشكل عام حسب تصميمك)
    const exists = await env.DB
      .prepare(`SELECT id FROM forms WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first();

    if (exists) return json({ ok: false, error: "SLUG_EXISTS" }, 409);

    const now = new Date().toISOString();

    const result = await env.DB
      .prepare(
        `INSERT INTO forms (name, slug, is_active, owner_email, created_at)
         VALUES (?, ?, 1, ?, ?)`
      )
      .bind(name, slug, email, now)
      .run();

    const id = result?.meta?.last_row_id;

    return json({
      ok: true,
      form: { id, name, slug, is_active: 1, owner_email: email, created_at: now },
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "SERVER_ERROR" }, 500);
  }
}

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\u0600-\u06FF]/g, "")          // يشيل العربي (اختياري)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || ("form-" + crypto.randomUUID().slice(0, 8));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
