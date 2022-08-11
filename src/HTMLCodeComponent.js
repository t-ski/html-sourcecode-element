const devConfig = {
    genericLanguageKey: "*",
    tagName: "code-component"
};


/**
 * Dynamic element template for single DOM bind cloning.
 */
const template = document.createElement("template");
template.innerHTML = `
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


/**
 * Code component element class extending the native HTML element class.
 */
class HTMLCodeComponent extends HTMLElement {

    // STATIC

    // Private

    static get observedAttributes() {
        return [ "highlight", "language", "type-live" ];
    }

    /**
     * Optional copy handler callback to invoke upon each copy action.
     * The handler is passed the associated copy button element.
     */
    static #copyHandler;

    /**
     * User custom static element config. Can be used to set
     * default attributes and other globally effective parameters.
     */
    static #customConfig = {
        "tab-size": 4,
        "copyable": false,
        "editable": false,
        "language": null,
        "type-live": 1,
        "no-overflow": false
    };

    /**
     * Static reference to the template element.
     */
    static #template = template;
    
    /**
     * Language-associated code formatting handler callback to invoke
     * upon each code change. The handler is passed the code string
     * and the element's language. Generic (all-language effective)
     * handlers can be assigned using the wildcard * for the language.
     * 
     */
    static #formatHandlers = new Map();

    // Public
    
    /**
     * Provide the user custom config object. The object is merged onto
     * the initially stated definition in order to keep defaults.
     * @param {*} customConfigObj 
     */
    static config(customConfigObj) {
        HTMLCodeComponent.#customConfig = {
            ...HTMLCodeComponent.#customConfig,
            
            ...customConfigObj
        };
    }

    /**
     * Append styles to the code component shadow DOM. The styles are 
     * of lower priority than the required styles, but can override with
     * the !important property. Multiple styles can be provided.
     * @param {String} cssRulesOrHref CSS rules
     */
    static appendStyle(cssRulesOrHref) {
        let insertElement;

        if(/^(https?:\/\/)?(\.\.?\/)*([^\s{}/]*\/)*[^\s{}/]+$/i.test(cssRulesOrHref)) {
            insertElement = document.createElement("link");
            insertElement.setAttribute("rel", "stylesheet");
            insertElement.setAttribute("href", cssRulesOrHref);
        } else {
            insertElement = document.createElement("style");
            insertElement.textContent = cssRulesOrHref
            .replace(/\s*\n+\s*/g, "")
            .replace(/"/g, '\\"')
            .trim();
        }

        HTMLCodeComponent.#template.content
        .insertBefore(insertElement, HTMLCodeComponent.#template.content.querySelector("style"));
    }
    
    /**
     * Set the formatting handler for a certain language.
     * @param {String} languageName Language name (* wildcard for any)
     * @param {Function} handler Handler callback (=> code, actual language)
     */
    static setFormatHandler(languageName, handler) {
        languageName = !Array.isArray(languageName)
        ? [ languageName ] : languageName;

        languageName.forEach(language => {
            const list = HTMLCodeComponent.#formatHandlers.get(language, handler) || [];
            HTMLCodeComponent.#formatHandlers.set(language, list.concat([ handler ]));
        });
        
        Array.from(document.querySelectorAll(devConfig.tagName))
        .filter(element => {
            return languageName.includes(element.getAttribute("language"))
            || languageName.includes(devConfig.genericLanguageKey);
        })
        .forEach(element => element.update());
    }
    
    /**
     * Set the unique copy handler.
     * @param {Function} handler Handler callback (=> copy button element)
     */
    static setCopyHandler(handler) {
        HTMLCodeComponent.#copyHandler = handler;
    }

    // INDIVIDUAL
    
    // Individual shadow DOM host elment
    #initialized;
    #host;

    /**
     * Create a custom code component element instance.
     */
    constructor() {
        super();

        this.#host = this.attachShadow({
            mode: "closed"
        });

        this.#host.appendChild(HTMLCodeComponent.#template.content.cloneNode(true));

        this.#host.querySelector(".edit-in")
        .addEventListener("input", _ => {
            this.#applyFormatHandler();
        });

        this.#host.querySelector(".edit-in")
        .addEventListener("blur", _ => this.dispatchEvent(new Event("change")));

        this.#host.querySelector(".edit-in")
        .addEventListener("keydown", e => {
            let appendix;
            
            switch(e.keyCode) {
                case 9: // n-space tab (sub)
                    appendix = Array.from({ length: HTMLCodeComponent.#customConfig["tab-size"] }, _ => "&emsp;").join("");

                    break;
                case 32: // Space (sub)
                    appendix = "&emsp;";

                    break;
            }
            
            if(!appendix) {
                return;
            }
            
            e.preventDefault();

            document.execCommand("insertHTML", false, appendix);
        });
        
        this.#host.querySelector(".edit")
        .addEventListener("click", e => {
            if(e.target.className !== "edit") {
                return;
            }
            
            this.#host.querySelector(".edit-in").focus();
        });

        const copyButton = this.#host.querySelector(".copy");
        copyButton
        .addEventListener("click", _ => {
            try {
                const content = this.#readBareContent(".edit-in")
                .replace(/\u2003/g, " ");

                navigator.clipboard.writeText(content);

                HTMLCodeComponent.#copyHandler && HTMLCodeComponent.#copyHandler(copyButton);
            } catch(err) {
                HTMLCodeComponent.#copyHandler && HTMLCodeComponent.#copyHandler(copyButton);
            }
        });
    }

    // Lifecycle

    connectedCallback() {
        if(HTMLCodeComponent.#customConfig["no-overflow"]) {
            this.#deleteRequiredCssRule(2);
            this.#deleteRequiredCssRule(1);
        }

        !(navigator.clipboard || {}).writeText
        && this.#deleteRequiredCssRule(0);
        
        (this.typeLive && this.editable)
        && this.removeAttribute("type-live");

        setTimeout(_ => {
            const lines = this.innerHTML
            .replace(/^\s*\n|\n\s*$/g, "")
            .split(/\n/g);

            const minIndentation = lines
            .filter(line => (line.trim().length > 0))
            .map(line => line.match(/^\s*/)[0])
            .reduce((prev, cur) => Math.min(prev, cur.length), Infinity);
            
            const normalizedText = lines
            .map(line => line.slice(!isNaN(parseInt(minIndentation)) ? minIndentation : 0))
            .map(line => line.replace(/^ /g, "\u2003"))
            .map(line => line.replace(/ {2}/g, "\u2003\u2003"))
            .map(line => {
                return line
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&");
            });
            
            this.#host.querySelector(".edit-in").innerHTML = normalizedText
            .map(line => `<div>${line || ""}</div>`)
            .join("");

            const code = normalizedText.join("\n");
            
            ![undefined, null].includes(this.typeLive)
            ? this.#applyLiveTyping(code)
            : this.#applyFormatHandler(code);

            this.#initialized = true;
        }, 0);
    }

    attributeChangedCallback(attrName) {
        switch(attrName) {
            case "highlight":
                this.#applyHighlighting();
                return;
            case "language":
                this.#applyFormatHandler();
                return;
            case "type-live":
                this.#applyLiveTyping();
                return;
        }
    }

    // Private

    /**
     * Delete a specific CSS rule of the required styles sheet.
     * Utilize for element effective style adaptions (mind order!).
     * @param {Number} index Index position of rule
     */
    #deleteRequiredCssRule(index) {
        this.#host
        .styleSheets[this.#host.styleSheets.length - 1]
        .deleteRule(index);
    }

    /**
     * Read the bare code text from a given element. Code text is manipulated
     * in order to be processed as expected.
     * @param {string} query Element query selector
     * @returns {String} Code text
     */
    #readBareContent(query) {
        const parent = this.#host.querySelector(query);

        if(!parent) {
            return [];
        }

        const children = Array.from(parent.querySelectorAll("div"));
        return ((children.length > 0)
        ? children : [ parent ])
        .map(child => {
            const content = child.innerHTML;

            child.classList[(content.trim().length > 0) ? "add" : "remove"]("no-br"); // Keep empty line space

            return content.replace(/\n+\s*/g, "");
        })
        .join("\n");
    }

    /**
     * Apply the defined formatting handler to the current element
     * code text based on the related attribute.
     * @param {String} [input] Optional code text to use regardless of the actual contents
     */
    #applyFormatHandler(input) {
        const language = this.language || HTMLCodeComponent.#customConfig["language"];

        const handlers = (HTMLCodeComponent.#formatHandlers.get(devConfig.genericLanguageKey) || [])
        .concat(HTMLCodeComponent.#formatHandlers.get(language) || []);
        
        const tagRegex = /<( *(\/ *)?(?!br)[a-z][a-z0-9_-]*( +[a-z0-9_-]+ *(= *("|')((?!\\\5)(.| ))*\5)?)* *)>/gi;
        
        input = (input || this.#readBareContent(".edit-in"))
        .replace(tagRegex, "&lt;$1&gt;");
        
        let output = input;
        handlers.forEach(handler => {
            output = handler(output, language);
        });

        const openingTags = [];
        
        this.#host.querySelector(".edit-out").innerHTML = output
        .split(/\n/g)
        .map(line => {
            const prevOpeningTags = Object.assign([], openingTags);
            
            (line.match(tagRegex) || [])
            .forEach(tag => {
                const tagName = tag.match(/[a-z][a-z0-9_-]*/i)[0];
                
                if(/^< *\//.test(tag)) {
                    while(![tagName, undefined].includes(openingTags.pop()));

                    return;
                }
                
                openingTags.push({
                    name: tagName,
                    tag: tag
                });
            });

            return `<div>${
                prevOpeningTags
                .map(tag => {
                    return tag.tag
                })
                .join("")
            }${line}${
                openingTags
                .map(tag => {
                    return `</${tag.name}>`;
                })
                .join("")
            }</div>`;
        })
        .join("");
        
        const lineNumbers = [];
        let lineHeight;
        Array.from(this.#host.querySelector(".edit-out").querySelectorAll("div"))
        .forEach(div => {
            const computedStyle = window.getComputedStyle(div);

            lineHeight = lineHeight || parseInt(computedStyle.getPropertyValue("line-height"));

            const ratio = HTMLCodeComponent.#customConfig["no-overflow"]
            ? Math.round(parseInt(computedStyle.getPropertyValue("height")) / lineHeight)
            : 1;
            
            lineNumbers.push(`${lineNumbers.length + 1}${Array.from({ length: ratio }, _ => "<br>").join("")}`);
        });

        this.#host.querySelector(".lines").innerHTML = lineNumbers.join("");
        
        this.#applyHighlighting();
    }

    /**
     * Apply line highlighting based on the related attribute.
     */
    #applyHighlighting() {
        if(!this.highlight) {
            return;
        }
        
        const lineDivs = Array.from(this.#host.querySelectorAll(".edit-out > div"));
        
        lineDivs.forEach(div => div.classList.remove("highlighted"));
        
        this.highlight
        .split(/;/g)
        .map(instruction => instruction.trim())
        .forEach(instruction => {
            if(/^[0-9]+$/.test(instruction)) {
                lineDivs[parseInt(instruction) - 1]
                && lineDivs[parseInt(instruction) - 1].classList.add("highlighted");

                return;
            }

            if(!/^[0-9]+\s*,\s*[0-9]+$/.test(instruction)) {
                return;
            }

            const indices = instruction
            .split("-")
            .map(index => parseInt(index.trim()))
            .sort();

            for(let index = indices[0]; index <= indices[1]; index++) {
                if(!lineDivs[parseInt(index) - 1]) {
                    return;
                }

                lineDivs[parseInt(index) - 1].classList.add("highlighted");
            }
        });
    }
    
    /**
     * Apply (trigger) live typing behavior based on the related attribute.
     * @param {String} [input] Optional code text to use regardless of the actual contents
     */
    #applyLiveTyping(input) {
        const speed = parseInt(this.typeLive) || HTMLCodeComponent.#customConfig["type-live"];

        const remainingInput = (input || this.#readBareContent(".edit-out"))
        .split("");
        
        const writtenInput = [];

        const whitespaceRegex = /^(\s|\n)$/;
        let lastChar = " ";
        const type = fixedDelay => {
            const curChar = remainingInput.shift();
            writtenInput.push(curChar);

            const delayBounds = (whitespaceRegex.test(lastChar))
            ? (/\s|\n/.test(curChar)
                ? [ 50, 250 ] : [ 300, 750 ])
            : [25, 300];

            const delay = fixedDelay
            || Math.round(((Math.random()
            * (delayBounds[1] - delayBounds[0]))
            + delayBounds[0]) * (speed || 1));

            lastChar = curChar;

            setTimeout(_ => {
                this.#applyFormatHandler(writtenInput.join(""));

                (remainingInput.length > 0)
                && type();
            }, delay);
        };

        type(0);
    }

    /**
     * Attibute setter helper.
     * @param {String} attribute Attribute name
     * @param {*} value Attribute value
     */
    #getBinaryAttribute(attribute) {
        const value = this.getAttribute(attribute);

        return ![undefined, null, "false"].includes(value);
    }

    /**
     * Attribute setter helper.
     * @param {String} attribute Attribute name
     * @param {*} value Attribute value
     */
    #setAttribute(attribute, value) {
        this[`${!!value ? "set" : "remove"}Attribute`](attribute, value);
    }

    // Public

    /**
     * Manually update the state of the code component.
     */
    update() {
        this.#applyFormatHandler();
    }

    // Attribute getters / setters
    
    get editable() {
        return this.#getBinaryAttribute("editable");
    }
    
    set editable(value) {
        (this.typeLive && value !== "false")
        && this.removeAttribute("type-live");

        this.#setAttribute("editable", value);
    }

    get copyable() {
        return this.#getBinaryAttribute("copyable");
    }
    
    set copyable(value) {
        this.#setAttribute("copyable", value);
    }

    get highlight() {
        return this.getAttribute("highlight");
    }
    
    set highlight(value) {
        this.#setAttribute("highlight", value);
    }

    get typeLive() {
        return this.getAttribute("type-live");
    }
    
    set typeLive(value) {
        if(this.editable) {
            return;
        }

        this.#setAttribute("type-live", value);
    }

    get language() {
        return this.getAttribute("language");
    }
    
    set language(value) {
        this.#setAttribute("language", value);
    }

    get innerHTML() {
        return !this.#initialized
        ? super.innerHTML
        : this.#readBareContent(".edit-in");
    }

    set innerHTML(input) {
        this.#applyFormatHandler(input);
    }

    get textContent() {
        return this.innerHTML;
    }

    set textContent(input) {
        this.innerHTML = input;
    }

}


// Use style append routine to set required styles
HTMLCodeComponent.appendStyle("@CSS");

// Globally register element
window.customElements.define(devConfig.tagName, HTMLCodeComponent);


// Globally declare element
window.HTMLCodeComponent = HTMLCodeComponent;