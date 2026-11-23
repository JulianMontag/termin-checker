const { chromium } = require("playwright");

(async () => {
  const url = process.env.TEMPUS_URL;

  if (!url) {
    throw new Error("TEMPUS_URL fehlt.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Öffne Tempus...");
  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 60000
  });

  // Warten, bis der Kalender sichtbar ist
  await page.waitForSelector("table.cal", { timeout: 30000 });

  const calendars = await page.locator("table.cal").count();
  console.log(`Gefundene Kalender: ${calendars}`);

  // Informationen über alle Kalenderzellen einsammeln
  const cells = await page.locator("table.cal td").evaluateAll(elements =>
    elements.map(el => ({
      text: el.innerText.trim(),
      className: el.className,
      decoration: window.getComputedStyle(el).textDecorationLine,
      html: el.outerHTML
    }))
  );

  console.log("Kalendertage:");
  for (const cell of cells) {
    if (/^\d{1,2}$/.test(cell.text)) {
      console.log(
        `${cell.text} | class=${cell.className} | decoration=${cell.decoration}`
      );
    }
  }

  await page.screenshot({
    path: "tempus-calendar.png",
    fullPage: true
  });

  console.log("Prüfung abgeschlossen.");
  await browser.close();
})();
