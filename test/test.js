const fs = require("fs");
const path = require("path");

const themes = require("../scripts/themes");
const { screen } = require("../scripts/screen");


const SNAP_DIFFERENCE_TOLERANCE = 0.05;
const TRUTH_DIR = path.resolve(require("../_path.json").truth);

themes.matrix(async (theme, syntax) => {
    const id = themes.id(theme, syntax);
    const truthPath = path.join(TRUTH_DIR, `${id}.txt`);
    if(!fs.existsSync(TRUTH_DIR)) {
        throw new ReferenceError(`Truth snapshot '${id}' not found. Capture truthful state first.`);
    }

    const pixelate = (hex) => hex.match(/.{6}/g);
    const screenActual = pixelate(await screen(theme, syntax));
    const screenExpected = pixelate(fs.readFileSync(truthPath).toString());
    let differences = 0;
    for(let i = 0; i < screenActual.length; i++) {
        differences += +(screenActual[i] != screenExpected[i]);
    }
    console.log(differences)
    console.log(screenActual.length)
    console.log((differences / screenActual.length))
    
    if((differences / screenActual.length) <= SNAP_DIFFERENCE_TOLERANCE) return;
    
    console.error(`\x1b[31mRender mismatch at '${id}'\x1b[0m`);
    process.exit(1);
})
.then((amount) => {
    console.log(`\x1b[32mTest successful: (${amount.theme}×${amount.syntax}).\x1b[0m`);
    process.exit(0);
});