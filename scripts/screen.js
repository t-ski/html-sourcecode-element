const path = require("path");
const puppeteer = require("puppeteer");


setTimeout(() => {
    console.error(new RangeError("Virtual browser timeout."));
    
    process.exit(2);
}, 10000);


let browser;

process.on("exit", async () => {
    browser && (await browser.close());
});

module.exports.screen = async function(theme, syntax = "") {
    browser = browser ?? await puppeteer.launch({ headless: "shell" });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 800, deviceScaleFactor: 1.0 });
    await page.goto(`${"file://"}${path.resolve(`./examples/example.html?theme=${theme}&syntax=${syntax}`)}`);
    
    return await (await page.screenshot()).toString("hex");
}