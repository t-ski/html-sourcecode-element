const package = require("../package.json");
const { execSync } = require("child_process");
const exec = (cmd) => console.log([
    cmd,
    execSync(cmd).toString(),
    "–".repeat(5)
].join("\n"));

process.on("uncaughtException",
    err => console.error(`\x1b[31m${err.message}\x1b[31m`));


// TYPE
const Type = {
    MAJOR: 0,
    MINOR: 1,
    PATCH: 2
};

let type;
switch(process.argv.slice(2)[0]) {
    case "-p":
    case "--patch":
        type = Type.PATCH;
        break;
    case "-m":
    case "--minor":
        type = Type.MINOR;
        break;
    case "-M":
    case "--major":
        type = Type.MAJOR;
        break;
}

if(!type) throw new SyntaxError("Unknown release type (-p | -m | -M)")


// BUMP
const semver = package.version
.split(/\./g)
.slice(0, 3)
.map(p => parseInt(p));
semver[type] += 1;
const version = semver.join(".");
const tag = `v${version}`;

exec(`npm version ${version}`);
exec("npm publish --access public");
exec("git push");

// GH RELEASE
exec([
    (process.platform == "darwin")
    ? "open"
    : ((process.platform == "win32")
        ? "start"
        : "xdg-open"),
    `'${
        package.repository.url
        .match(/https:\/\/github\.com\/.+/)[0]
        .replace(/\.git$/, "")
    }/releases/new?tag=${tag}&title=${tag}'`
].join(" "));


console.log(`\x1b[32m${tag} successfully released.\x1b[0m`);