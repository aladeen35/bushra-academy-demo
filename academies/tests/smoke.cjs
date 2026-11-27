// Mobile smoke test (390×844): every main screen of every academy renders with no page errors, and a practice
// round can be completed. Screenshots go to academies/tests/shots (uploaded as a CI artifact).
// Usage: node academies/tests/smoke.cjs [baseUrl]   (serve academies/ first, e.g. python3 -m http.server 8765)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const base = process.argv[2] || "http://localhost:8765";
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ["/", "/path", "/lesson/a-tones", "/m/pinyin/initials", "/m/hanzi/chars", "/vocab", "/vocab/cat/food", "/grammar/measure-words",
  "/dialogues/restaurant", "/studio/你好", "/tutor", "/tests", "/profile", "/search/茶", "/lesson/b-greetings", "/lesson/c-svo", "/lesson/d-hello"];
const ACADEMIES = fs.readdirSync(path.join(__dirname, "..")).filter((d) => fs.existsSync(path.join(__dirname, "..", d, "academy.js")));

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  let failed = 0;
  for (const a of ACADEMIES) {
    for (const lang of ["ar", "en"]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      await ctx.addInitScript((l) => localStorage.setItem("ac.prefs", JSON.stringify({ lang: l })), lang);
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      for (const r of ROUTES) {
        await p.goto(`${base}/${a}/#${r}`);
        await p.waitForSelector("main > :not(.spinner)", { timeout: 10000 }).catch(() => errs.push(`${r}: still loading`));
        await p.waitForTimeout(400);
        const empty = await p.evaluate(() => /Something went wrong|حدث خطأ/.test(document.querySelector("main").innerText));
        if (empty) errs.push(`${r}: error view`);
        if (lang === "ar") await p.screenshot({ path: path.join(OUT, `${a}${r.replace(/[^\w]+/g, "_")}.png`) });
      }
      // One full practice round.
      await p.goto(`${base}/${a}/#/lesson/b-greetings`);
      await p.click("#go-practice");
      for (let i = 0; i < 30 && !(await p.locator(".big-score").count()); i++) {
        if (await p.locator(".choice:not([disabled])").count()) await p.locator(".choice").first().click();
        else if (await p.locator("#din").count()) { await p.fill("#din", "x"); await p.click("#dchk"); }
        else if (await p.locator("#skp").count()) await p.click("#skp");
        else if (await p.locator(".match-grid").count()) { const ls = p.locator("[data-l]"); for (let j = 0; j < await ls.count(); j++) { const id = await ls.nth(j).getAttribute("data-l"); await ls.nth(j).click(); await p.locator(`[data-r="${id}"]`).click(); } }
        if (await p.locator("#qnext").count()) await p.click("#qnext");
      }
      if (!(await p.locator(".big-score").count())) errs.push("practice round did not finish");
      console.log(`${a} [${lang}]: ${errs.length ? "FAIL\n  " + errs.join("\n  ") : "ok"}`);
      failed += errs.length;
      await ctx.close();
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
