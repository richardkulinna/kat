import test from "node:test";
import assert from "node:assert/strict";
import { serve } from "./handler.mjs";

const origin = "https://tools.kulinna.art";
const password = "test-ä & +:=";
const files = {"/index.html":"home", "/colors/index.html":"colors", "/colors/free.mjs":"module"};
function request(path, options = {}, env = {KAT_PASSWORD: password}) {
  return serve(new Request(origin + path, options), env, files);
}
function login(next = "/", secret = password) {
  return request("/login", {method: "POST", headers: {Origin: origin}, body: new URLSearchParams({password: secret, next})});
}

test("protected documents lead to an accessible, script-free form and private assets stay private", async () => {
  const response = await request("/colors/?hue=22");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/login?next=%2Fcolors%2F%3Fhue%3D22");
  assert.equal(response.headers.get("WWW-Authenticate"), null);
  const form = await request(response.headers.get("Location"));
  assert.equal(form.status, 200);
  const html = await form.text();
  assert.match(html, /<label for="password">Passwort/);
  assert.match(html, /method="post" action="\/login"/);
  assert.match(html, /name="next" value="\/colors\/\?hue=22"/);
  assert.doesNotMatch(html, /<script/i);
  const privateFile = await request("/colors/free.mjs");
  assert.equal(privateFile.status, 401);
  assert.equal(await privateFile.text(), "");
  assert.match(privateFile.headers.get("Cache-Control"), /no-store/);
  assert.equal((await request("/", {}, {})).status, 503);
});

test("correct password starts a unique signed session and preserves deep links", async () => {
  const signed = await login("/colors/?selection=green");
  assert.equal(signed.status, 303);
  assert.equal(signed.headers.get("Location"), "/colors/?selection=green");
  const setCookie = signed.headers.get("Set-Cookie");
  for (const flag of ["__Host-", "Path=/", "Max-Age=43200", "Secure", "HttpOnly", "SameSite=Strict"]) assert.ok(setCookie.includes(flag));
  const Cookie = setCookie.split(";")[0];
  assert.notEqual(Cookie, (await login()).headers.get("Set-Cookie").split(";")[0]);
  const options = {headers: {Cookie}};
  assert.equal(await (await request("/colors/", options)).text(), "colors");
  assert.equal(await (await request("/colors/", {...options, method:"HEAD"})).text(), "");
  assert.match((await request("/colors/free.mjs", options)).headers.get("Content-Type"), /javascript/);
  assert.equal((await request("/missing", options)).status, 404);
  assert.equal((await request("/colors/free.mjs", options, {KAT_PASSWORD:"rotated"})).status, 401);
  const tampered = Cookie.slice(0, -1) + (Cookie.endsWith("0") ? "1" : "0");
  assert.equal((await request("/colors/free.mjs", {headers:{Cookie:tampered}})).status, 401);
  const now = Date.now;
  try {
    Date.now = () => now() + 43201000;
    assert.equal((await request("/colors/free.mjs", options)).status, 401);
  } finally { Date.now = now; }
});

test("mistyped passwords, form methods, unsafe return paths and foreign POSTs", async () => {
  const wrong = await login("/colors/", "wrong");
  assert.equal(wrong.status, 401);
  assert.match(await wrong.text(), /role="alert"/);
  assert.equal(wrong.headers.get("Set-Cookie"), null);
  for (const path of ["https://example.org", "//other.test", "/x/..//other.test", "/login", "/logout"]) {
    assert.equal((await login(path)).headers.get("Location"), "/");
  }
  for (const path of ["/login", "/logout"]) {
    for (const headers of [{}, {Origin:"https://example.org"}]) assert.equal((await request(path, {method:"POST", headers})).status, 403);
  }
  assert.equal((await request("/logout")).status, 405);
  assert.equal((await request("/", {method:"POST"})).status, 405);
  assert.equal((await request("/login", {method:"POST", headers:{Origin:origin}, body:"plain"})).status, 415);
  assert.equal((await login("/", "a".repeat(66000))).status, 413);
  const out = await request("/logout", {method:"POST", headers:{Origin:origin}});
  assert.equal(out.status, 303);
  assert.match(out.headers.get("Set-Cookie"), /Max-Age=0/);
});
