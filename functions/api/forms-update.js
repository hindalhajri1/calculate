import { json, readJson } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const id = Number(body?.id);
  const updates = body?.updates || {};

  if (!id) {
    return json({ ok: false, error: "BAD_REQUEST", hint: "id required" }, 400);
  }

  // نسمح حالياً بتعديل الاسم فقط (وبسهولة نوسعها لاحقاً)
  const name = (updates.name ?? updates.form_name ?? "").toString().trim();

  if (!name) {
    return json({ ok: false, error: "BAD_REQUEST", hint: "updates.name required" }, 400);
  }

  // تأكد أن النموذج موجود
  const current = await env.DB.prepare(`SELECT id, name FROM forms WHERE id = ?`)
    .bind(id)
    .first();

  if (!current) {
    return json({ ok: false, error: "NOT_FOUND" }, 404);
  }

  try {
    await env.DB.prepare(`UPDATE forms SET name = ? WHERE id = ?`)
      .bind(name, id)
      .run();

    // نرجّع الاسم الجديد مباشرة (يساعد التحديث الفوري في الواجهة)
    return json({ ok: true, form: { id, name } });
  } catch (e) {
    return json({ ok: false, error: "DB_ERROR", hint: String(e?.message || e) }, 400);
  }
}
