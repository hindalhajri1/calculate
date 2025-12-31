export async function onRequestGet({ request }) {
    const jwt = request.headers.get("cf-access-jwt-assertion");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT");
  
      // Base64URL decode
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const json = atob(padded);
  
      const claims = JSON.parse(json);
  
      const email = claims.email || claims.upn || claims.sub || null;
      const name =
        claims.name ||
        claims.nickname ||
        (email ? email.split("@")[0] : "مستخدم");
  
      return new Response(JSON.stringify({ email, name, claims }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Bad token" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }
  