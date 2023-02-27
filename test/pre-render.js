const { join } = require("path");


const { render } = require("../src/render");


render({
    sourcePath: join(__dirname, "./integration--static--in.html"),
    distPath: join(__dirname, "./integration--static--out.html")
});