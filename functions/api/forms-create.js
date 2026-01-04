export async function onRequestPost({ request, env }) {
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) return json({ ok: false, error: "Unauthorized" }, 401);

  let email = null;
  try {
    const parts = jwt.split(".");
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    email = claims.email || claims.upn || claims.sub || null;
  } catch {
    return json({ ok: false, error: "Bad token" }, 400);
  }

  if (!email) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const slugRaw = String(body.slug || "").trim();

    if (!name) return json({ ok: false, error: "NAME_REQUIRED" }, 400);

    // slug اختياري: لو ما انرسل نولده من الاسم
    const slug = slugRaw ? normalizeSlug(slugRaw) : normalizeSlug(name);

    if (!slug) return json({ ok: false, error: "SLUG_INVALID" }, 400);

    // تأكد عدم تكرار slug
    const exists = await env.DB
      .prepare(`SELECT id FROM forms WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first();

    if (exists?.id) {
      return json({ ok: false, error: "SLUG_EXISTS" }, 409);
    }

    // إنشاء الفورم
    const r = await env.DB
      .prepare(`
        INSERT INTO forms (owner_email, name, slug, is_active)
        VALUES (?, ?, ?, 1)
      `)
      .bind(email, name, slug)
      .run();

    // جلب الفورم الذي تم إنشاؤه
    const created = await env.DB
      .prepare(`SELECT id, owner_email, name, slug, is_active, created_at FROM forms WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first();

    // إنشاء حقول افتراضية (اختياري - أسرع تجربة)
    const formId = created?.id;
    if (formId) {
      await seedDefaultFields(env.DB, formId);
    }

    return json({ ok: true, form: created });
  } catch (e) {
    return json({ ok: false, error: e.message || "SERVER_ERROR" }, 500);
  }
}

function normalizeSlug(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F]/g, "") // حركات عربية
    .replace(/[^\p{L}\p{N}]+/gu, "-") // أي شيء غير حرف/رقم -> -
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// يضيف نفس الحقول الأساسية (مثل اللي عندك) ويخزن key داخل options_json
async function seedDefaultFields(db, formId) {
  // لا تكرر إذا موجودة
  const any = await db
    .prepare(`SELECT id FROM form_fields WHERE form_id = ? LIMIT 1`)
    .bind(formId)
    .first();
  if (any?.id) return;

  await db.prepare(`
    INSERT INTO form_fields (form_id, label, field_type, required, options_json, sort_order, is_active)
    VALUES
    (?, 'الاسم',   'text',   1, '{"key":"name"}',   1, 1),
    (?, 'الجوال',  'tel',    1, '{"key":"mobile"}', 2, 1),
    (?, 'المدينة', 'text',   1, '{"key":"city"}',   3, 1),
    (?, 'العدد',   'number', 1, '{"key":"count"}',  4, 1)
  `).bind(formId, formId, formId, formId).run();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
