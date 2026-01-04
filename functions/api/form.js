export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  // نجيب الفورم إما بالـ slug أو بالـ id (افتراضي 1)
  const slug = (url.searchParams.get("slug") || "").trim();
  const formIdParam = (url.searchParams.get("form_id") || "").trim();

  let formRow = null;

  if (slug) {
    formRow = await env.DB
      .prepare(`SELECT id, name, slug, is_active FROM forms WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first();
  } else {
    const formId = Number(formIdParam || 1);
    formRow = await env.DB
      .prepare(`SELECT id, name, slug, is_active FROM forms WHERE id = ? LIMIT 1`)
      .bind(formId)
      .first();
  }

  if (!formRow) {
    return json({ ok: false, error: "FORM_NOT_FOUND" }, 404);
  }

  if (Number(formRow.is_active) !== 1) {
    return json({ ok: false, error: "FORM_INACTIVE" }, 403);
  }

  const fields = await env.DB
    .prepare(`
      SELECT id, form_id, label, field_type, required, options_json, sort_order, is_active
      FROM form_fields
      WHERE form_id = ? AND is_active = 1
      ORDER BY sort_order ASC
    `)
    .bind(formRow.id)
    .all();

  // نحول options_json إلى object (إن وجد)
  const cleanFields = (fields.results || []).map(f => {
    let options = null;
    try { options = f.options_json ? JSON.parse(f.options_json) : null; } catch {}
    return { ...f, options };
  });

  return json({
    ok: true,
    form: formRow,
    fields: cleanFields
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
