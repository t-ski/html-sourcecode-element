const { writeFileSync, readFileSync } = require("fs");
const { join } = require("path");


compressCopy("app.js");
compressCopy("cli.js");


function compressCopy(fileName) {
    const code = String(readFileSync(join(__dirname, `../src/${fileName}`)))
    .replace(/\n|\s{2,}/g, "");


    writeFileSync(join(__dirname, `../dist/${fileName}`), code);

    console.log(`\x1b[2m|\x1b[0m Compressed \x1b[32msrc/${fileName}\x1b[2m → \x1b[0m\x1b[32mdist/${fileName}\x1b[0m`);
}