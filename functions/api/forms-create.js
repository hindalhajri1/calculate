export async function onRequestPost({ request, env }) {
  try {
    // 1) Auth from Cloudflare Access JWT (مثل me.js)
    const jwt = request.headers.get("cf-access-jwt-assertion");
    if (!jwt) {
      return json(
        { ok: false, error: "UNAUTHORIZED", hint: "Missing cf-access-jwt-assertion" },
        401
      );
    }

    const claims = decodeJwt(jwt);
    const owner_email = (claims.email || claims.upn || claims.sub || "").trim().toLowerCase();

    if (!owner_email) {
      return json(
        { ok: false, error: "UNAUTHORIZED", hint: "No email in JWT claims" },
        401
      );
    }

    // 2) Body
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    let slug = String(body.slug || "").trim();

    if (!name) return json({ ok: false, error: "NAME_REQUIRED" }, 400);

    if (!slug) slug = slugify(name);
    slug = slugify(slug);

    // 3) Insert
    const now = new Date().toISOString();

    // تأكد جدول forms عندك يحتوي owner_email NOT NULL
    // id, name, slug, is_active, created_at, owner_email ...
    const exist = await env.DB.prepare(`SELECT id FROM forms WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first();

    if (exist?.id) return json({ ok: false, error: "SLUG_EXISTS" }, 409);

    const ins = await env.DB.prepare(
      `INSERT INTO forms (name, slug, is_active, created_at, owner_email)
       VALUES (?, ?, 1, ?, ?)`
    )
      .bind(name, slug, now, owner_email)
      .run();

    const id = ins?.meta?.last_row_id;

    return json({
      ok: true,
      form: { id, name, slug, is_active: 1, created_at: now, owner_email }
    });

  } catch (e) {
    return json({ ok: false, error: e?.message || "SERVER_ERROR" }, 500);
  }
}

// ---------- helpers ----------
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function decodeJwt(jwt) {
  const parts = String(jwt).split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const jsonStr = atob(padded);
  return JSON.parse(jsonStr);
}

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")   // remove special
    .replace(/\s+/g, "-")       // spaces to -
    .replace(/-+/g, "-")        // collapse ---
    .replace(/^-|-$/g, "");     // trim -
}
