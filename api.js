const { resolve, join } = require("path");

const _config = require("./_config.json");


function load(theme = "min", syntax = null) {
    const path = join(resolve("./dist/"), `${_config.className}.${theme}${syntax ? "." : ""}${syntax ?? ""}`);
    require(path);
}
module.exports.load = load;