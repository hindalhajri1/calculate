// functions/api/forms-create.js

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function slugify(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")      // remove symbols
    .replace(/\s+/g, "-")          // spaces -> -
    .replace(/-+/g, "-")           // collapse
    .replace(/^-|-$/g, "");        // trim -
}

function pickHeader(headers, names) {
  for (const n of names) {
    const v = headers.get(n);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

// Cloudflare Access may inject any of these (depends on config / product)
// We'll try multiple variants (case-insensitive is handled by Headers.get internally)
function getAccessEmail(request) {
  const h = request.headers;

  // Most common for CF Access:
  const email = pickHeader(h, [
    "cf-access-authenticated-user-email",
    "Cf-Access-Authenticated-User-Email",
    "x-forwarded-email",
    "X-Forwarded-Email",
    "x-authenticated-user-email",
    "X-Authenticated-User-Email",
  ]);

  return email;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Accept only JSON
    const ct = (request.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "BAD_CONTENT_TYPE" }, 415);
    }

    // ✅ Get user email from Cloudflare Access headers
    const ownerEmail = getAccessEmail(request);

    // If missing, return UNAUTHORIZED + debug (very helpful)
    if (!ownerEmail) {
      const debug = {
        hasAccessJwt: Boolean(
          request.headers.get("cf-access-jwt-assertion") ||
          request.headers.get("Cf-Access-Jwt-Assertion")
        ),
        seenEmailHeaders: {
          "cf-access-authenticated-user-email": request.headers.get("cf-access-authenticated-user-email") || null,
          "x-forwarded-email": request.headers.get("x-forwarded-email") || null,
          "x-authenticated-user-email": request.headers.get("x-authenticated-user-email") || null,
        },
        note:
          "Cloudflare Access is not injecting email header to this POST request. Check Access Application path + policy, and ensure the request is going through Access.",
      };

      return json({ ok: false, error: "UNAUTHORIZED", debug }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    let slug = String(body.slug || "").trim();

    if (!name) return json({ ok: false, error: "NAME_REQUIRED" }, 400);

    if (!slug) slug = slugify(name);
    slug = slugify(slug);

    if (!slug) return json({ ok: false, error: "SLUG_REQUIRED" }, 400);

    // Check slug unique per owner (or globally if you prefer)
    const exists = await env.DB.prepare(
      "SELECT id FROM forms WHERE owner_email = ? AND slug = ? LIMIT 1"
    ).bind(ownerEmail, slug).first();

    if (exists) return json({ ok: false, error: "SLUG_EXISTS" }, 409);

    // Insert
    const nowIso = new Date().toISOString();
    const res = await env.DB.prepare(
      `INSERT INTO forms (name, slug, is_active, owner_email, created_at)
       VALUES (?, ?, 1, ?, ?)`
    ).bind(name, slug, ownerEmail, nowIso).run();

    // D1 returns lastRowId on res.meta
    const id = res?.meta?.last_row_id || res?.meta?.lastRowId || null;

    return json({
      ok: true,
      form: { id, name, slug, is_active: 1, owner_email: ownerEmail, created_at: nowIso }
    });

  } catch (e) {
    return json({ ok: false, error: "SERVER_ERROR", details: String(e?.message || e) }, 500);
  }
}
