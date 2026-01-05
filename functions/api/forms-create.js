function getAccessEmail(request) {
  // Cloudflare Access identity headers (قد تختلgف حسب البيئة/الإعداد)
  const candidates = [
    "cf-access-authenticated-user-email",
    "Cf-Access-Authenticated-User-Email",
    "CF-Access-Authenticated-User-Email",
    "x-forwarded-email",
    "X-Forwarded-Email",
  ];

  for (const k of candidates) {
    const v = request.headers.get(k);
    if (v && String(v).trim()) return String(v).trim();
  }

  return "";
}
const email = getAccessEmail(request);

if (!email) {
  return new Response(
    JSON.stringify({ ok: false, error: "UNAUTHORIZED", hint: "Missing Access email header" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
const email = getAccessEmail(request);
return new Response(JSON.stringify({ ok: true, email }), {
  headers: { "Content-Type": "application/json" }
});
