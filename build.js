const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");


const SOURCE_PATH = path.resolve("./src/");
const DIST_PATH = path.resolve("./dist/");
const DIST_FILENAME = "HTMLCodeElement";
const MIN_THEME = "min";


class Watch extends EventEmitter {
    #targetDirPath;
    #optionsWithDefaults;
    #iteration;

    constructor(targetPath, options) {
        super();
        
        const absTargetPath = path.resolve(targetPath);
        this.#targetDirPath = fs.statSync(absTargetPath).isFile()
        ? fs.dirname(absTargetPath)
        : absTargetPath;
        
        this.#optionsWithDefaults = {
            filenamePattern: options.filenamePattern ?? /.*/,
            interval: options.interval ?? 1000,
            runOnce: options.runOnce ?? false,
        };

        this.#iteration = 0;
                
        setImmediate(() => this.#scan());
    }

    #scan(timeTolerance = Infinity) {
        const modifiedFiles = fs.readdirSync(this.#targetDirPath, {
            recursive: true,
            withFileTypes: true,
        })
        .filter((dirent) => dirent.isFile())
        .filter((dirent) => this.#optionsWithDefaults.filenamePattern.test(dirent.name))
        .filter((dirent) => (Date.now() - fs.statSync(path.join(dirent.path, dirent.name)).mtimeMs) < timeTolerance)
        .map((dirent) => path.join(dirent.path, dirent.name));
        
        modifiedFiles.length
        && this.emit("build", modifiedFiles, this.#iteration++);

        !this.#optionsWithDefaults.runOnce
        && setTimeout(() => this.#scan(this.#optionsWithDefaults.interval), this.#optionsWithDefaults.interval);
    }
}


function scanThemes(dirname) {
    const extensionRegex = /\.css$/;
    return fs.readdirSync(path.join(SOURCE_PATH, dirname), { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .filter((dirent) => extensionRegex.test(dirent.name))
    .map((dirent) => dirent.name.replace(extensionRegex, ""))
    .concat([ null ]);
}

function buildTheme(theme, syntax) {
    const minify = (code) => code.replace(/\n| +( )/g, "$1");
    
    const code = fs.readFileSync(path.join(SOURCE_PATH, "HTMLCodeElement.js")).toString()
    .replace(/require\((["'`])[^"'`]+\1\)/g, (match) => {
        const partialPath = path.join(SOURCE_PATH, match.slice(match.indexOf("(") + 2, -2).trim());
        const affix = ![ ".js", ".json" ].includes(path.extname(partialPath)) ? "`" : "";
        return [
            affix,
            minify(fs.readFileSync(partialPath).toString()),
            affix
        ].join("");
    })
    .replace(
        /@STYLE@/,
        minify([
            theme ? fs.readFileSync(path.join(SOURCE_PATH, "./themes/", `${theme}.css`)).toString() : "",
            syntax ? fs.readFileSync(path.join(SOURCE_PATH, "./syntax/", `${syntax}.css`)).toString() : ""  // TODO: Auto integrate hljs?
        ].join("\n"))
    );
    
    fs.writeFileSync(
        path.join(DIST_PATH, `${DIST_FILENAME}.${theme ?? MIN_THEME}${syntax ? `.${syntax}` : ""}.js`),
        code
    );
}


fs.mkdirSync(path.join(DIST_PATH), { recursive: true});

new Watch(SOURCE_PATH, {
    runOnce: !process.argv.slice(2).includes("--watch")
})
.on("build", (_, i) => {
    const themes = scanThemes("themes");
    const syntaxThemes = scanThemes("syntax");
    
    themes.forEach((theme) => {
        syntaxThemes.forEach((syntax) => {
            buildTheme(theme, syntax);
        });
    });

    const date = new Date();
    console.log(`${!i ? "\n" : ""}\x1b[2K\r\x1b[1A\x1b[2K\r\x1b[2m[${
        [ date.getHours(), date.getMinutes(), date.getSeconds() ]
        .map((segment) => segment.toString().padStart(2, "0"))
        .join(":")
    }]\x1b[22m \x1b[34mBuilt ${themes.length}×${syntaxThemes.length} theme${(themes.length >> 1) ? "s" : ""} with success.\x1b[0m`);
});