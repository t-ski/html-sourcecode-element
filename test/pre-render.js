const { join } = require("path");
const { readFileSync } = require("fs");


const { render } = require("../src/app");


render({
    sourcePath: join(__dirname, "./integration--static--in.html"),
    distPath: join(__dirname, "./integration--static--out.html"),

    styles: String(readFileSync(join(__dirname, "./custom.css")))
});