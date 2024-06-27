const fs = require("fs");
const path = require("path");


function scan(dirname) {
    const extensionRegex = /\.css$/;
    return fs.readdirSync(path.resolve(require("../_path.json").src, dirname), { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .filter((dirent) => extensionRegex.test(dirent.name))
    .map((dirent) => dirent.name.replace(extensionRegex, ""))
    .concat([ null ]);
}


module.exports.matrix = function(cb) {
    const themeAmount = new Set();
    const syntaxAmount = new Set();
    return new Promise(async (resolve) => {
        for(const theme of scan("themes")) {
            themeAmount.add(theme);
            for(const syntax of scan("syntax")) {
                syntaxAmount.add(syntax);
                await cb(theme, syntax);
            }
        }
        resolve({
            theme: themeAmount.size,
            syntax: syntaxAmount.size
        });
    });
}

module.exports.id = function(theme, syntax = "") {
    return `${theme || "min"}${syntax ? `.${syntax}` : ""}`;
}