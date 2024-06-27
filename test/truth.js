const path = require("path");
const fs = require("fs");

const themes = require("../scripts/themes");
const { screen } = require("../scripts/screen");


const TRUTH_DIR = path.resolve(require("../_path.json").truth);

fs.rmSync(TRUTH_DIR, { recursive: true, force: true });
fs.mkdirSync(TRUTH_DIR, { recursive: true });

themes.matrix(async (theme, syntax) => {
    fs.writeFileSync(path.join(TRUTH_DIR, `${themes.id(theme, syntax)}.txt`), await screen(theme, syntax));
})
.then((amount) => {
    console.log(`\x1b[34mGenerated truth snapshots (${amount.theme}×${amount.syntax}).\x1b[0m`);
    process.exit(0);
});