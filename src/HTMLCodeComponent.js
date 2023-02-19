window.HTMLCodeComponent = (_ => {

    const devConfig = {
        observedAttributes: [ "copyable", "editable", "highlight", "language", "type-live" ],
        languageWildcard: "*",
        tagName: "code-component"
    };


    const objPrivatesMap = new WeakMap();


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
     * ...
     */
    const formatHandlers = new Map();

    let copyHandler;

    /**
     * User custom static element config. Can be used to set
     * default attributes and other globally effective parameters.
     */
    let customConfig = {
         "tab-size": 4,
         "copyable": false,
         "editable": false,
         "language": null,
         "type-live": 1,
         "no-overflow": false
    };


    function setObjPrivate(objRef, key, value) {
        const map = objPrivatesMap.get(objRef) ?? new Map();

        map.set(key, value);

        objPrivatesMap.set(objRef, map);
    }

    function getObjPrivate(objRef, key) {
        const map = objPrivatesMap.get(objRef);
        
        return map ? map.get(key) : undefined;
    }

    function createTab(character) {
        return Array.from({ length: customConfig["tab-size"] }, _ => character).join("");
    }
    

    function _update(objRef, code) {
        ![undefined, null].includes(objRef.typeLive)
        ? _applyLiveTyping(objRef, code)
        : _applyFormatHandler(objRef, code);
    }

    /**
     * Delete a specific CSS rule of the required styles sheet.
     * Utilize for element effective style adaptions (mind order!).
     * @param {Number} index Index position of rule
     */
    function _deleteRequiredCssRule(objRef, index) {
        const host = getObjPrivate(objRef, "host");

        host
        .styleSheets[host.styleSheets.length - 1]
        .deleteRule(index);
    }

    /**
     * Read the bare code text from a given element. Code text is manipulated
     * in order to be processed as expected.
     * @param {String} query Element query selector
     * @param {Boolean} noHTML Whether to noit receive any HTML entities (text only)
     * @returns {String} Code text
     */
    function _readBareContent(objRef, noUnicode = false) {
        const host = getObjPrivate(objRef, "host");

        if(!host) return "";
        
        const bare = host.querySelector(".edit-in").textContent;

        return noUnicode
        ? bare.replace(/\u2003|\u200b/g, " ")
        : bare;
    }

    /**
     * Apply the defined formatting handler to the current element
     * code text based on the related attribute.
     * @param {String} [input] Optional code text to use regardless of the actual contents
     */
    function _applyFormatHandler(objRef, input) {
        const language = objRef.language || customConfig["language"];

        const handlers = (formatHandlers.get(devConfig.languageWildcard) || [])
        .concat(formatHandlers.get(language) || []);
        
        const tagRegex = /<( *(\/ *)?(?!br)[a-z][a-z0-9_-]*( +[a-z0-9_-]+ *(= *("|')((?!\\\6)(.| ))*\6)?)* *)>/gi;
        
        input = input ?? _readBareContent(objRef);
         
        let output = input;
        if(handlers.length) {
            handlers.forEach(handler => {
                output = handler(output, language);
            });
        } else {
            output = output.replace(tagRegex, "&lt;$1&gt;")
        }

        const openingTags = [];
        const host = getObjPrivate(objRef, "host");
        host.querySelector(".edit-out").innerHTML = output
        .split(/\n/g)
        .map(line => {
            const prevOpeningTags = Object.assign([], openingTags);
            
            let index = 0;
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

                const prevIndex = index;
                index = index + tag.length;

                line = `${line.slice(0, prevIndex)}${
                    line.slice(prevIndex, index)
                    .replace(/(^| )([^ ]+)/g, `${"$1".replace(/ /, "\u2003")}<span>$2</span>`)
                }${line.slice(index)}`;
            });

            // Wrap all words by SPAN tags in order to enable one-word double click selection
            
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
        Array.from(host.querySelector(".edit-out").querySelectorAll("div"))
        .forEach(div => {
            const computedStyle = window.getComputedStyle(div);
            
            lineHeight = lineHeight || parseInt(computedStyle.getPropertyValue("line-height"));

            const ratio = customConfig["no-overflow"]
            ? Math.round(parseInt(computedStyle.getPropertyValue("height")) / lineHeight)
            : 1;
            
            lineNumbers.push(`${lineNumbers.length + 1}${Array.from({ length: ratio }, _ => "<br>").join("")}`);
        });
        
        host.querySelector(".lines").innerHTML = lineNumbers.join("");
        
        _applyHighlighting(this);
    }

    function _applyCopyHandler(objRef) {
        const host = getObjPrivate(objRef, "host");

        const copyButton = host.querySelector(".copy");
        
        try {
            navigator.clipboard.writeText(objRef.textContent);

            copyHandler && copyHandler(copyButton);
        } catch(err) {
            copyHandler && copyHandler(copyButton);
        }
    }

    /**
     * Apply line highlighting based on the related attribute.
     */
    function _applyHighlighting(objRef) {
        const host = getObjPrivate(objRef, "host");
        
        if(!host) return;

        const lineDivs = Array.from(host.querySelectorAll(".edit-out > div"));
        
        lineDivs.forEach(div => div.classList.remove("highlighted"));
        
        if(!objRef.highlight) return;

        objRef.highlight
        .split(/[;,]/g)
        .map(instruction => instruction.trim())
        .forEach(instruction => {
            if(/^[0-9]+$/.test(instruction)) {
                lineDivs[parseInt(instruction) - 1]
                && lineDivs[parseInt(instruction) - 1].classList.add("highlighted");

                return;
            }

            if(!/^[0-9]+ *- *[0-9]+$/.test(instruction)) {
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
    function _applyLiveTyping(objRef, input) {
        if(getObjPrivate(objRef, "isLiveTyping")) return;
        setObjPrivate(objRef, "isLiveTyping", true);

        const speed = parseFloat(objRef.typeLive) || customConfig["type-live"];

        const remainingInput = Array.from({ length: 5 }, _ => "")  // Defer live typing start using initial empty word offset
        .concat((input || _readBareContent(objRef)).split(""));

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
            || Math.round(((Math.random() * (delayBounds[1] - delayBounds[0])) + delayBounds[0]) * (speed || 1));

            lastChar = curChar;

            const curCode = writtenInput.join("");

            _applyFormatHandler(objRef, `${
                curCode
            }${
                (remainingInput.join("").match(/\n/g) ?? [])
                .join("")
            }`);

            setTimeout(_ => {
                (remainingInput.length > 0)
                ? type()
                : setObjPrivate(objRef, "isLiveTyping", false);
            }, delay);
        };

        type(0);
    }

    /**
     * Attibute setter helper.
     * @param {String} attribute Attribute name
     * @param {*} value Attribute value
     */
    function _getBinaryAttribute(objRef, attribute) {
        const value = objRef.getAttribute(attribute);

        return ![undefined, null, "false"].includes(value);
    }

    /**
     * Attribute setter helper.
     * @param {String} attribute Attribute name
     * @param {*} value Attribute value
     */
    function _setAttribute(objRef, attribute, value) {
        objRef[`${!!value ? "set" : "remove"}Attribute`](attribute, value);
    }

    
    /**
     * Code component element class extending the native HTML element class.
     */
    class HTMLCodeComponent extends HTMLElement {

        /* static get observedAttributes() {
            return this.config.observedAttributes;
        } */

        /**
         * Create a custom code component element instance.
         */
        constructor() {
            super();

            const host = this.attachShadow({
                mode: "closed"
            });

            setObjPrivate(this, "host", host);
            
            host.appendChild(template.content.cloneNode(true));

            const editInElement = host.querySelector(".edit-in");
            editInElement
            .addEventListener("input", _ => {
                const isBR = node => {
                    return (node.nodeType === 1)
                        && (node.tagName.toUpperCase() === "BR");
                };

                editInElement.childNodes
                .forEach(node => {
                    if(!node.nextSibling
                    || !isBR(node) || !isBR(node.nextSibling)) return;
                    
                    editInElement.removeChild(node);
                });

                _applyFormatHandler(this);
            });
            
            host.querySelector(".edit-in")
            .addEventListener("blur", _ => this.dispatchEvent(new Event("change")));

            document
            .addEventListener("copy", e => {
                let copyedText = (document.selection && document.selection.type != "Control")
                ? document.selection.createRange().text
                : (window.getSelection ?? (_ => ""))().toString();
                
                copyedText = copyedText
                .replace(/\u2003/g, " ");
                
                navigator.clipboard.writeText(copyedText);
            });
            
            host.querySelector(".edit-in")
            .addEventListener("keydown", e => {
                let appendix;
                
                switch(e.keyCode) {
                    case 9: // n-space tab (sub)
                        appendix = createTab("\u2003");

                        break;
                    case 13:
                        appendix = "<br>\n\u200b";

                        break;
                    case 32: // Space (sub)
                        appendix = "\u2003";

                        break;
                }
                
                if(!appendix) {
                    return;
                }
                
                e.preventDefault();
                
                document.execCommand("insertHTML", false, appendix);
            });
            
            host.querySelector(".edit-in")
            .addEventListener("paste", e => {
                e.preventDefault();
                
                const pastedText = (window.clipboardData && window.clipboardData.getData)
                ? window.clipboardData.getData("Text")
                : e.clipboardData.getData("text/plain");

                if(!pastedText) return;

                document.execCommand("insertHTML", false, pastedText
                .replace(/\n/g, "<br>\n"));
            });
            
            host.querySelector(".edit")
            .addEventListener("click", e => {
                if(e.target.className !== "edit") {
                    return;
                }
                
                host.querySelector(".edit-in").focus();
            });

            host.querySelector(".copy")
            .addEventListener("click", _ => _applyCopyHandler(this));
        }

        // Lifecycle

        connectedCallback() {
            !(navigator.clipboard || {}).writeText
            && _deleteRequiredCssRule(this, 0);
            
            if(customConfig["no-overflow"]) {
                _deleteRequiredCssRule(this, 1);
                _deleteRequiredCssRule(this, 2);
            }
            
            setTimeout(_ => {
                const lines = this.textContent
                .replace(/^([\t ]*\n)*/, "")
                .replace(/(\n[\t ]*)*$/, "")
                .split(/\n/g);

                const minIndent = lines
                .filter(line => (line.trim().length > 0))
                .map(line => line.match(/^[\t ]*/)[0].length)
                .reduce((prev, cur) => Math.min(prev, cur), Infinity);
                
                const host = getObjPrivate(this, "host");

                host.querySelector(".edit-in").innerHTML = lines
                .map(line => {
                    if(line.trim().length === 0) {
                        return line.trim();
                    }
                    
                    return line
                    .replace(/\t/g, createTab(" "))
                    .replace(new RegExp(`^ {${minIndent}}`, "g"), "")
                    .replace(/^ /g, "\u2003")
                    .replace(/ {2}/g, "\u2003\u2003")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                })
                .join("<br>\n");
                
                _applyFormatHandler(this);

                ![undefined, null].includes(this.typeLive)
                && _applyLiveTyping(this);
                
                setObjPrivate(this, "initialized", true);
            }, 0);
        }

        attributeChangedCallback(attrName) {
            switch(attrName) {
                case "highlight":
                    _applyHighlighting(this);
                    return;
                case "language":
                    _applyFormatHandler(this);
                    return;
                case "type-live":
                    _applyLiveTyping(this);
                    return;
            }
        }
        
        // Attribute getters / setters
        
        get editable() {
            return _getBinaryAttribute(this, "editable");
        }
        
        set editable(value) {
            this.setAttribute("editable", value);
        }

        get copyable() {
            return _getBinaryAttribute(this, "copyable");
        }
        
        set copyable(value) {
            this.setAttribute("copyable", value);
        }

        get highlight() {
            return this.getAttribute("highlight");
        }
        
        set highlight(value) {
            _setAttribute(this, "highlight", value);
        }

        get typeLive() {
            return this.getAttribute( "type-live");
        }
        
        set typeLive(value) {
            this.setAttribute("type-live", value);
        }

        get language() {
            return this.getAttribute("language");
        }
        
        set language(value) {
            this.setAttribute("language", value);
        }

        get innerHTML() {
            return !getObjPrivate(this, "initialized")
            ? super.innerHTML
            : _readBareContent(this, true);
        }

        set innerHTML(input) {
            _applyFormatHandler(this, input);
        }

        get textContent() {
            return this.innerHTML;
        }

        set textContent(input) {
            this.innerHTML = input;
        }

    }
    
        
    /**
     * Provide the user custom config object. The object is merged onto
     * the initially stated definition in order to keep defaults.
     * @param {*} customConfigObj 
     */
    HTMLCodeComponent.config = function(customConfigObj) {
        customConfig = {
            ...customConfig,
            
            ...customConfigObj
        };

        Array.from(document.querySelectorAll(devConfig.tagName))
        .forEach(element => {
            console.log(element);
            devConfig.observedAttributes
            .filter(attr => customConfigObj[attr] != undefined)
            .forEach(attr => {
                element[attr] = customConfigObj;
            });
        });
    };

    /**
     * Append styles to the code component shadow DOM. The styles are 
     * of lower priority than the required styles, but can override with
     * the !important property. Multiple styles can be provided.
     * @param {String} cssRulesOrHref CSS rules
     */
    HTMLCodeComponent.appendStyle = function(cssRulesOrHref) {
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

        template.content
        .appendChild(insertElement);
        
        Array.from(document.querySelectorAll(devConfig.tagName))
        .filter(element => (element instanceof HTMLCodeComponent))
        .forEach(element => {
            getObjPrivate(element, "host").appendChild(insertElement.cloneNode(true));
        });
    };
    
    /**
     * Set the formatting handler for a certain language.
     * @param {String} languageName Language name (* wildcard for any)
     * @param {Function} handler Handler callback (=> code, actual language)
     */
    HTMLCodeComponent.setFormatHandler = function(languageName, handler) {
        languageName = !Array.isArray(languageName)
        ? [ languageName ] : languageName;

        languageName.forEach(language => {
            const list = formatHandlers.get(language, handler) || [];
            formatHandlers.set(language, list.concat([ handler ]));
        });
        
        Array.from(document.querySelectorAll(devConfig.tagName))
        .filter(element => (element instanceof HTMLCodeComponent))
        .filter(element => {
            return languageName.includes(element.getAttribute("language"))
            || languageName.includes(devConfig.languageWildcard);
        })
        .forEach(element => update(element));
    };
    
    /**
     * Set the unique copy handler.
     * @param {Function} handler Handler callback (=> copy button element)
     */
    HTMLCodeComponent.setCopyHandler = function(handler) {
        copyHandler = handler;
    };


    // Use style append routine to set required styles
    HTMLCodeComponent.appendStyle("@CSS");


    // Globally register element
    window.customElements.define(devConfig.tagName, HTMLCodeComponent);


    // Globally declare element
   return HTMLCodeComponent;

})();