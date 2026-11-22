const types = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  mjs: "text/javascript; charset=utf-8"
};

async function authorized(request, password) {
  if (!password) return false;
  const header = request.headers.get("Authorization") || "";
  if (!/^Basic [A-Za-z0-9+/]+=*$/i.test(header) || header.length > 2048) return false;
  const expected = "Basic " + btoa("kat:" + password);
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all(
    ["Basic " + header.slice(6), expected].map(value => crypto.subtle.digest("SHA-256", encoder.encode(value)))
  );
  const actual = new Uint8Array(actualHash);
  const target = new Uint8Array(expectedHash);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ target[i];
  return difference === 0;
}

export async function serve(request, env, files) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Vary": "Authorization",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  });
  if (!(await authorized(request, env.KAT_PASSWORD))) {
    headers.set("WWW-Authenticate", 'Basic realm="Kulinna Artistic Tools", charset="UTF-8"');
    return new Response(null, { status: 401, headers });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    headers.set("Allow", "GET, HEAD");
    return new Response(null, { status: 405, headers });
  }
  let path = new URL(request.url).pathname;
  if (path === "/colors") {
    headers.set("Location", "/colors/");
    return new Response(null, { status: 308, headers });
  }
  if (path.endsWith("/")) path += "index.html";
  if (!Object.hasOwn(files, path)) return new Response(null, { status: 404, headers });
  headers.set("Content-Type", types[path.split(".").pop()]);
  return new Response(request.method === "HEAD" ? null : files[path], { headers });
}
