const devConfig = {
    templateIdentifierAttribute: "code-component-template"
};


const { readFileSync, writeFileSync } = require("fs");


const templateMarkup = `
    <div class="lines"></div>
    <div class="edit">
        <div class="edit-in" contenteditable data-nosnippet></div>
        <code class="edit-out">
            <slot></slot>
        </code>
    </div>
    <span class="copy">Copy</span>
    <!-- © t-ski@GitHub -->
`.trim();


function render(markup, styles) {
    const insertIndex = markup.search(/\n?< *\/ *(head|body)([^<]|\s)*>/i);

    if(insertIndex < 0) return markup;

    return `${markup.slice(0, insertIndex)}${`
        <template>
            ${templateMarkup}
            ${styles
            ? `<style>${styles}</style>`
            : ""}
        </template>`
        .replace(/\n|\s{2,}/g, "")
    }${markup.slice(insertIndex)}`;
}


module.exports.render = function(config = {}) {
    if(!config.sourcePath && !config.sourceCode) throw new ReferenceError("Missing source path or code configuration");

    let markup = config.sourcePath
    ? String(readFileSync(config.sourcePath))
    : config.sourceCode;

    markup = render(markup, config.styles);
    
    (config.distCallback instanceof Function)
    && config.distCallback(markup);

    config.distPath
    && writeFileSync(config.distPath, markup);

    return markup;
}