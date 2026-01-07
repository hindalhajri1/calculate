import { json, readJson, safeParse, safeStringify } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const id = Number(body?.id);
  const updates = body?.updates;

  if (!Number.isFinite(id) || id < 1 || !updates) {
    return json({ ok: false, error: "BAD_REQUEST", hint: "id and updates required" }, 400);
  }

  const current = await env.DB
    .prepare(`SELECT id, options_json FROM form_fields WHERE id = ?`)
    .bind(id)
    .first();

  if (!current) return json({ ok: false, error: "NOT_FOUND" }, 404);

  const setParts = [];
  const params = [];

  // label
  if (updates.label != null) {
    const v = String(updates.label).trim();
    if (!v) return json({ ok: false, error: "BAD_REQUEST", hint: "label cannot be empty" }, 400);
    setParts.push("label = ?");
    params.push(v);
  }

  // type / field_type
  if (updates.type != null || updates.field_type != null) {
    const t = String(updates.type ?? updates.field_type).trim().toLowerCase();
    const allowed = ["text","textarea","tel","number","email","date","select"];
    if (!allowed.includes(t)) {
      return json({ ok: false, error: "BAD_REQUEST", hint: "invalid field_type" }, 400);
    }
    setParts.push("field_type = ?");
    params.push(t);
  }

  // required (يدعم 0/1 أو true/false)
  if (updates.required != null) {
    const r = (updates.required === 1 || updates.required === "1" || updates.required === true);
    setParts.push("required = ?");
    params.push(r ? 1 : 0);
  }

  // options_json merge (بدون key نهائياً)
  const opt = safeParse(current.options_json, {}) || {};
  if (updates.placeholder != null) opt.placeholder = String(updates.placeholder || "");
  if (updates.options != null) opt.options = Array.isArray(updates.options) ? updates.options.map(String) : [];
  if (updates.settings != null) opt.settings = (updates.settings && typeof updates.settings === "object") ? updates.settings : {};

  // ✅ أهم تنظيف: ممنوع تعديل key من الواجهة
  // (حتى لو أحد أرسل updates.key من Postman ما يتغير)
  setParts.push("options_json = ?");
  params.push(safeStringify(opt));

  if (setParts.length === 0) {
    return json({ ok: false, error: "BAD_REQUEST", hint: "no valid updates" }, 400);
  }

  try {
    await env.DB
      .prepare(`UPDATE form_fields SET ${setParts.join(", ")} WHERE id = ?`)
      .bind(...params, id)
      .run();

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "DB_ERROR", hint: String(e?.message || e) }, 400);
  }
}
