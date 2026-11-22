const types = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  mjs: "text/javascript; charset=utf-8"
};

const cookieName = "__Host-kat-session";
const lifetime = 60 * 60 * 12;
const cookieFlags = "; Path=/; Secure; HttpOnly; SameSite=Strict";
const encoder = new TextEncoder();

async function passwordMatches(actual, expected) {
  const [left, right] = await Promise.all([actual, expected].map(async value =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))
  ));
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

function sessionKey(password) {
  return crypto.subtle.importKey("raw", encoder.encode("kat/session/v1:" + password),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function makeSession(password) {
  const expires = Math.floor(Date.now() / 1000) + lifetime;
  const payload = expires + "." + crypto.randomUUID();
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", await sessionKey(password), encoder.encode(payload)));
  return payload + "." + Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hasSession(request, password) {
  const cookie = (request.headers.get("Cookie") || "").split(/;\s*/).find(part => part.startsWith(cookieName + "="));
  if (!cookie) return false;
  const match = /^(\d{10})\.([\da-f-]{36})\.([\da-f]{64})$/.exec(cookie.slice(cookieName.length + 1));
  if (!match || Number(match[1]) <= Date.now() / 1000) return false;
  const signature = Uint8Array.from(match[3].match(/../g), byte => parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", await sessionKey(password), signature, encoder.encode(match[1] + "." + match[2]));
}

function destination(value, origin) {
  if (!value || !value.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value) || value.startsWith("//")) return "/";
  const target = new URL(value, origin);
  if (target.origin !== origin || target.pathname.startsWith("//") || ["/login", "/logout"].includes(target.pathname)) return "/";
  return target.pathname + target.search + target.hash;
}

function loginPage(next, error) {
  const target = next.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anmelden · Kulinna Artistic Tools</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Montserrat:wght@700;800;900&amp;display=swap">
<style>
*{box-sizing:border-box}html{font-family:Inter,Arial,sans-serif;color:#0F1728;background:#F8FAFB}
body{margin:0;min-height:100vh;min-height:100svh;display:flex;flex-direction:column}
header,footer{padding:1.1rem clamp(1.2rem,6vw,6rem);display:flex;align-items:center;justify-content:space-between;gap:1rem}
header{color:#F8FAFB;background:#0F1728}header b{font:900 1.55rem Montserrat,Arial,sans-serif;letter-spacing:-.08em}
header b::after{content:"";display:inline-block;width:.33em;height:.33em;background:#FB0C7F;margin-left:.15em}
header span,footer{font-size:.85rem}main{width:min(90%,74rem);margin:auto;padding:clamp(3rem,10vh,8rem) 0;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(15rem,.8fr);align-items:center;gap:clamp(2rem,8vw,8rem)}
h1,h2{font-family:Montserrat,Arial,sans-serif}h1{font-size:clamp(3.3rem,7.8vw,7.7rem);font-weight:900;letter-spacing:-.075em;line-height:.95;margin:0}
h1 span{display:block;color:#FB0C7F}h2{font-size:clamp(1.6rem,3vw,2.3rem);margin:0 0 1.8rem;letter-spacing:-.055em}
form{border-top:3px solid #0F1728;padding-top:1.6rem}label{font-weight:600}input,button{width:100%;font:inherit;border-radius:0;min-height:3.2rem}
input{margin:.6rem 0 1rem;padding:.7rem;border:1px solid #0F1728;background:#F8FAFB;color:#0F1728}
button{border:0;background:#0F1728;color:#F8FAFB;font-weight:700;cursor:pointer;text-align:left;padding:.8rem 1rem}
button::after{content:"→";float:right}button:hover{box-shadow:inset 0 -4px #0C7FFB}:focus-visible{outline:3px solid #0C7FFB;outline-offset:3px}
[role=alert]{border-left:3px solid #FB0C7F;padding-left:.7rem;line-height:1.5}footer{border-top:1px solid #0F1728}
@media(max-width:44rem){main{grid-template-columns:1fr;gap:3rem;width:calc(100% - 2.4rem)}h1{font-size:clamp(3.1rem,11vw,5rem)}}
</style></head><body><header><b>KAT</b><span>Geschützter Bereich</span></header>
<main><h1>Kulinna<span>Artistic</span>Tools</h1><form method="post" action="/login">
<h2>Studio öffnen</h2><input type="hidden" name="next" value="${target}"><label for="password">Passwort</label>
<input id="password" name="password" type="password" required autocomplete="current-password"${error ? ' aria-invalid="true" aria-describedby="error"' : ""}>
${error ? '<p id="error" role="alert">Das Passwort stimmt nicht. Versuche es erneut.</p>' : ""}
<button type="submit">Anmelden</button></form></main><footer>kulinna.art</footer></body></html>`;
}

export async function serve(request, env, files) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Vary": "Cookie",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  });
  const url = new URL(request.url);
  const read = request.method === "GET" || request.method === "HEAD";
  const reply = (status, body = null) => new Response(request.method === "HEAD" ? null : body, { status, headers });
  function redirect(path, status = 303) {
    headers.set("Location", path);
    return reply(status);
  }
  function form(next, error = false) {
    headers.set("Content-Type", types.html);
    return reply(error ? 401 : 200, loginPage(next, error));
  }
  const login = url.pathname === "/login";
  const logout = url.pathname === "/logout";
  if (request.method === "POST" ? !login && !logout : !read || logout) {
    headers.set("Allow", logout ? "POST" : login ? "GET, HEAD, POST" : "GET, HEAD");
    return reply(405);
  }
  if (!env.KAT_PASSWORD) return reply(503);
  if (request.method === "POST") {
    if (request.headers.get("Origin") !== url.origin) return reply(403);
    if (logout) {
      headers.set("Set-Cookie", cookieName + "=; Max-Age=0" + cookieFlags);
      return redirect("/login");
    }
    const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/x-www-form-urlencoded") return reply(415);
    // Limit the streamed form body even when Content-Length is absent.
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const decoder = new TextDecoder();
    let size = 0;
    let body = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        return reply(413);
      }
      body += decoder.decode(value, { stream: true });
    }
    const data = new URLSearchParams(body + decoder.decode());
    const next = destination(data.get("next"), url.origin);
    if (!(await passwordMatches(data.get("password") || "", env.KAT_PASSWORD))) return form(next, true);
    headers.set("Set-Cookie", cookieName + "=" + await makeSession(env.KAT_PASSWORD) + "; Max-Age=" + lifetime + cookieFlags);
    return redirect(next);
  }
  const authenticated = await hasSession(request, env.KAT_PASSWORD);
  if (login) {
    const next = destination(url.searchParams.get("next"), url.origin);
    return authenticated ? redirect(next) : form(next);
  }
  let path = url.pathname;
  if (!authenticated) {
    if (/\.[^/]+$/.test(path) && !path.endsWith(".html")) return reply(401);
    return redirect("/login?next=" + encodeURIComponent(destination(path + url.search, url.origin)), 302);
  }
  if (path === "/colors") return redirect("/colors/" + url.search, 308);
  if (path.endsWith("/")) path += "index.html";
  if (!Object.hasOwn(files, path)) return reply(404);
  headers.set("Content-Type", types[path.split(".").pop()] || "application/octet-stream");
  return reply(200, files[path]);
}
