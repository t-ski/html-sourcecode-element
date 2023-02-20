const { mkdirSync, readdir, lstatSync, readFileSync, existsSync, writeFileSync } = require("fs");
const { join } = require("path");


const config = {
    cssRenderMark: "@CSS",
    detectionWindowSize: 2500,
    distFilePrefix: "codecomponent",
    reqScriptFilePath: "../HTMLCodeComponent.js",
    reqStyleFilePath: "../required.css"
};

const path = {
    src: join(__dirname, "src/packages"),
    dist: join(__dirname, "dist")
};

const copyrightNotice = `/**\n${
    String(readFileSync(join(__dirname, "./copyright.txt")))
    .split(/\n/g)
    .map(line => ` * ${line}`)
    .join("\n")
}\n */\n\n`;


try { mkdirSync(path.dist); } catch {}


let reqSource;


function workSource(force, noCompression) {
    readdir(path.src, {
        withFileTypes: true
    }, (_, dirents) => {
        dirents = dirents
        .filter(dirent => {
            return (dirent.name !== config.reqStyleFilePath)
                && (dirent.name !== config.reqScriptFilePath);
        });
        
        force = force ?? (hasBeenModified(config.reqStyleFilePath) ?? hasBeenModified(config.reqScriptFilePath));
        
        reqSource = force
        ? readSource(config.reqScriptFilePath, config.reqStyleFilePath)
        : reqSource;

        const processedFiles = [];

        dirents.forEach(dirent => {
            let fileName = dirent.name;

            const normalizedFileName = fileName.replace(/(\.[a-z0-9])?$/i, "");
            if(processedFiles.includes(normalizedFileName)) {
                return;
            }

            let updateCurrent = hasBeenModified(fileName);

            if(/\.css$/.test(fileName)) {
                if(!hasBeenModified(fileName)) {
                    return;
                }

                fileName = fileName.replace(/\.css$/, ".js");

                updateCurrent = true;
            }

            if(!/\.js$/.test(fileName)
            || (!force && !updateCurrent)
                && hasBeenModified) {
                return;
            }

            writeDist(fileName, !force, noCompression);

            processedFiles.push(normalizedFileName);
        });
    });
}

function hasBeenModified(fileName) {
    return lstatSync(join(path.src, fileName)).mtimeMs > (Date.now() - config.detectionWindowSize);
}

function readSource(fileName, styleFileName) {
    const cssFilePath = join(path.src, styleFileName || fileName)
    .replace(/\.js$/i, ".css");

    const cssSource = (existsSync(cssFilePath)
    ? String(readFileSync(cssFilePath))
    : "")
    .replace(/\s*\n+\s*/g, "")
    .replace(/"/g, '\\"')
    .trim();

    const jsSource = String(readFileSync(join(path.src, fileName)))
    .replace(config.cssRenderMark, cssSource);
    
    return jsSource;
}

function writeDist(srcFileName, isRefresh = true, noCompression = false) {
    const distFileName = `${config.distFilePrefix}.${srcFileName}`;

    let script = [
        '"use strict";',
        "(_ => {",
            reqSource,
            readSource(srcFileName),
        "})();"
    ]
    .join("\n");
    
    script = !noCompression
    ? script.replace(/\/\*((?!\*\/)(.|\s))*\*\//g, "")
        .replace(/([^\\])\/\/[^\n]*\n/g, "$1")
        .replace(/\s{2,}|\n/g, " ")
    : script;

    writeFileSync(join(path.dist, distFileName), `${copyrightNotice}${script}`);

    console.log(`\x1b[2m${
        isRefresh ? "↻" : "|"
    }\x1b[0m Built \x1b[32m${srcFileName}\x1b[2m → \x1b[0m\x1b[32m${distFileName}\x1b[0m`);
}


if(!/^-(-watch|W)$/.test(process.argv.slice(2)[0])) {
    workSource(true);

    console.log("\x1b[32mDistributable built successfully.\x1b[0m");
} else {
    setInterval(_ => workSource(false, true), config.detectionWindowSize);
    workSource(true, true);

    console.log("\x1b[32mWatching source for incremental builds.\x1b[0m");
}