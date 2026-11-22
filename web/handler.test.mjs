import test from "node:test";
import assert from "node:assert/strict";
import { serve } from "./handler.mjs";

test("every static resource requires the shared login", async () => {
  const files = {"/index.html":"home", "/colors/index.html":"colors", "/colors/free.mjs":"module"};
  const request = (path, credential, method="GET", env={KAT_PASSWORD:"test-value"}) => serve(
    new Request("https://tools.kulinna.art" + path, {method, headers: credential ? {Authorization:"Basic " + btoa(credential)} : {}}), env, files);
  for (const path of ["/", "/colors/", "/colors/free.mjs", "/missing"]) {
    for (const credential of [null, "kat:wrong", "someone:test-value"]) {
      const response = await request(path, credential);
      assert.equal(response.status, 401);
      assert.match(response.headers.get("WWW-Authenticate"), /Basic/);
      assert.equal(await response.text(), "");
    }
  }
  assert.equal((await request("/", "kat:test-value", "GET", {})).status, 401);
  assert.equal(await (await request("/colors/", "kat:test-value")).text(), "colors");
  assert.equal((await request("/colors/free.mjs", "kat:test-value")).headers.get("Content-Type"), "text/javascript; charset=utf-8");
  assert.equal(await (await request("/", "kat:test-value", "HEAD")).text(), "");
  assert.equal((await request("/missing", "kat:test-value")).status, 404);
  assert.equal((await request("/", "kat:test-value", "POST")).status, 405);
});
