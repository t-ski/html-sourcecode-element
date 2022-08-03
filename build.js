const { mkdirSync, readdir, lstatSync, readFileSync, existsSync, writeFileSync } = require("fs");
const { join } = require("path");


const config = {
    cssRenderMark: "@CSS",
    detectionWindowSize: 1000,
    distFilePrefix: "codecomponent",
    reqScriptFileName: "HTMLCodeComponent.js",
    reqStyleFileName: "required.css"
};

const path = {
    src: join(__dirname, "src"),
    dist: join(__dirname, "dist")
};


try { mkdirSync(path.dist); } catch {}


let reqSource;


function workSource(force = false) {
    readdir(path.src, {
        withFileTypes: true
    }, (_, dirents) => {
        dirents = dirents
        .filter(dirent => {
            return (dirent.name !== config.reqStyleFileName)
                && (dirent.name !== config.reqScriptFileName);
        });

        const updateAll = hasBeenModified(config.reqStyleFileName)
                       || hasBeenModified(config.reqScriptFileName);

        reqSource = (force || updateAll)
        ? readSource(config.reqScriptFileName, config.reqStyleFileName)
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
            || (!force && !updateAll && !updateCurrent)
                && hasBeenModified) {
                return;
            }

            writeDist(fileName, !force);

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

function writeDist(srcFileName, isRefresh = true) {
    const distFileName = `${config.distFilePrefix}.${srcFileName}`;

    writeFileSync(join(path.dist, distFileName), [
        "(_ => {",
            reqSource,
            readSource(srcFileName),
        "})();"
    ].join("\n"));

    console.log(`\x1b[2m${
        isRefresh ? "↻" : "|"
    }\x1b[0m Built \x1b[32m${srcFileName}\x1b[2m → \x1b[0m\x1b[32m${distFileName}\x1b[0m`);
}


if(/^-(-watch|W)$/.test(process.argv.slice(2)[0])) {
    console.log("\x1b[32mWatching source for incremental builds.\x1b[0m");

    setInterval(workSource, config.detectionWindowSize);
}

workSource(true);