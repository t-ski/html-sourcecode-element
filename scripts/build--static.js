const { writeFileSync, readFileSync } = require("fs");
const { join } = require("path");


const appFileName = "app.js";


const code = String(readFileSync(join(__dirname, `../src/${appFileName}`)))
.replace(/\n|\s{2,}/, "");


writeFileSync(join(__dirname, `../dist/${appFileName}`), code);

console.log(`\x1b[2m|\x1b[0m Compressed \x1b[32msrc/${appFileName}\x1b[2m → \x1b[0m\x1b[32mdist/${appFileName}\x1b[0m`);