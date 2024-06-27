/*
 * (c) Thassilo Martin Schiepanski
 */

(_ => {    
    const _config = require("_config.json");
    const template = require("template.html");
    const minCss = require("min.css");
    
    class HTMLSourceCodeElement extends HTMLElement {
        static #config = {};
        static #stylesheets = [];
        static #instances = [];
        
        static #highlightCallback = (code) => code;
        static #copyCallback = (dom) => {
            const fallbackText = dom.copy.textContent;
            dom.copy.style.pointerEvents = "none";
            dom.copy.classList.add("active");
            dom.copy.textContent = "Copied";
            setTimeout(() => {
                dom.copy.style.pointerEvents = "auto";
                dom.copy.classList.remove("active");
                dom.copy.textContent = fallbackText;
            }, 1000);
        };

        static #renderAll() {
            HTMLSourceCodeElement.#instances
            .forEach((instance) => instance.#render());
        }

        static #decodeEntities(html) {
            const sanitizer = document.createElement("textarea");
            sanitizer.innerHTML = html;
            return sanitizer.value;
        }
        
        static on(event, callback) {
            switch(event) {
                case "copy":
                    HTMLSourceCodeElement.#copyCallback = callback;
                    break;
                case "highlight":
                    HTMLSourceCodeElement.#highlightCallback = callback;
                    HTMLSourceCodeElement.#renderAll();
                    break;
            }
        }

        static config(overrideConfig = {}) {
            HTMLSourceCodeElement.#config = {
                ...HTMLSourceCodeElement.#config,
                ...overrideConfig
            };
            HTMLSourceCodeElement.#renderAll();
        }

        static addStylesheet(stylesheet) {
            if(!(stylesheet instanceof HTMLElement)) {
                const link = document.createElement("link");
                link.setAttribute("rel", "stylesheet");
                link.setAttribute("href", stylesheet);
                stylesheet = link;
            }
            HTMLSourceCodeElement.#stylesheets.push(stylesheet);
            HTMLSourceCodeElement.#instances
            .forEach((instance) => instance.addStylesheet(stylesheet));
        }
        
        #shadowRoot;
        #dom = {};
        #styleRecovery = {};
        #code;

        constructor() {
            super();

            this.#style("visibility", "hidden");
            this.#style("userSelect", "none");

            this.#shadowRoot = this.attachShadow({ mode: "open" });
            this.#shadowRoot.innerHTML = template;

            const addStyle = (css) => {
                const style = document.createElement("style");
                style.innerHTML = css;
                this.#shadowRoot.appendChild(style);
            };
            addStyle(minCss);
            addStyle(`@STYLE@`);

            HTMLSourceCodeElement.#instances.push(this);

            HTMLSourceCodeElement.#stylesheets
            .forEach((stylesheet) => {
                this.addStylesheet(stylesheet);
            });
        }
        
        connectedCallback() {
            setTimeout(() => {
                const lines = this.innerHTML
                .replace(/^( *\n)*/, "")
                .replace(/(\n *)*$/, "")
                .split(/\n/g);
                const minIndentation = Math.min(
                    ...lines
                    .filter((line) => line.trim().length)
                    .map((line) => line.match(/^ */)[0].length)
                );

                this.innerHTML = "";
                this.#type(HTMLSourceCodeElement.#decodeEntities(lines
                        .map((line) => line.slice(minIndentation))
                        .join("\n")),
                    this.#readAttribute("type") ? 0 : Infinity);

                this.#recoverStyle("visibility");
            });

            this.#dom.edit = this.#shadowRoot.querySelector("div[edit]");
            this.#dom.table = this.#shadowRoot.querySelector("table");
            this.#dom.copy = this.#shadowRoot.querySelector("button");

            const maxHeight = Math.max(0, parseInt(this.#readAttribute("maxheight") ?? -1));
            maxHeight && (this.style.maxHeight
                = `calc(${maxHeight - 0.25} * (1rem + var(--line-spacing))`);

            this.#dom.edit.addEventListener("input", () => {
                const code = HTMLSourceCodeElement.#decodeEntities(
                    this.#dom.edit.innerHTML
                    .replace(/< *div *>/gi, "")
                    .replace(/(< *br *\/? *>)?< *\/div *>/gi, "<br>")
                    .replace(/< *br *\/? *>/gi, "\n")
                    .replace(/\n$/, "")
                );
                console.log(code)
                
                this.#render(code);
                this.#dispatchEvent("input", code);
            });
            this.#dom.edit.addEventListener("keydown", (e) => {
                if(e.keyCode !== 9) return;
                e.preventDefault();
                document.execCommand("insertText", false, " ".repeat(_config.tabSize));
            });
            
            this.#dom.copy.addEventListener("click", () => this.#copy());
        }

        #readAttribute(name) {
            if([ true, false ].includes(HTMLSourceCodeElement.#config[name])) {
                return HTMLSourceCodeElement.#config[name];
            }
            if(!this.getAttribute(name)) return false;
            return this.getAttribute(name) || true;
        }

        #style(property, value) {
            this.#styleRecovery[property] = this.style[property];
            this.style[property] = value;
        }

        #recoverStyle(property) {
            this.style[property] = this.#styleRecovery[property];
            !this.style.length && this.removeAttribute("style");
        }

        #dispatchEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail }));
        }

        #render(code = this.#code) {
            if(code === undefined) return;
            
            this.#code = code;
            this.#dom.table.innerHTML = "";

            const tagStack = [];
            (HTMLSourceCodeElement.#highlightCallback.bind(this)(
                this.#code,
                this.#readAttribute("language")) ?? "")
            .split(/\n/g)
            .forEach((line, i) => {
                const taggedLine = [ ...tagStack.map((tag) => tag.outerHTML), line ].join("");
                (line.match(
                    /<([a-z][a-z0-9-]*)(?: +([a-z][a-z0-9-]*) *(?:= *(["'])(((?!\3).|\\\3)*(?<=[^\\]))\3)?)* *(?:\/ *)?>|<\/([a-z][a-z0-9-]*) *>/gi
                ) ?? [])
                .forEach((tag) => {
                    const name = tag.match(/[a-z][a-z0-9-]*/i)[0];
                    const isClosing = /^<\//.test(tag);
                    !isClosing
                    ? tagStack.unshift({
                        name,
                        outerHTML: tag
                    })
                    : ((tagStack[0] ?? {}).name === name) && tagStack.shift();
                });

                const row = this.#shadowRoot.querySelector("template").content.cloneNode(true);
                row.querySelector(".line-number span").textContent = i + 1;
                row.querySelector(".line-code pre").innerHTML = taggedLine;
                this.#dom.table.appendChild(row);
            });

            this.#dom.edit.style.setProperty("--line-number-offset", `${
                this.#dom.table.querySelector("tr:last-of-type td:first-child").offsetWidth
            }px`);

            const updateConfigAttribute = (name) => {
                this.#readAttribute(name)
                ? this.setAttribute(name, "")
                : this.removeAttribute(name);
            };
            updateConfigAttribute("copy");
            updateConfigAttribute("scroll");
        }

        #type(code, i = 0) {
            const partialCode = code.slice(0, i);
            const partialLines = partialCode.split(/\n/g);
            this.#dom.edit.innerHTML = partialLines
            .map((line) => line
                .replace(/[\u00A0-\u9999<>\&]/g, (c) => `&#${c.charCodeAt(0)};`))
            .map((line) => `<div>${line || "&emsp;"}</div>`)
            .join("");
            
            this.#render(
                partialCode
                + "\n ".repeat(
                    Math.min(
                        Math.max(
                            _config.onTypeMinLines - partialLines.length,
                            0
                        ),
                        code.split(/\n/g).length - partialLines.length
                    )
                )
            );
            
            if(i >= code.length) {
                this.#readAttribute("edit")
                && this.#dom.edit.setAttribute("contenteditable", "");

                this.#recoverStyle("userSelect");

                return;
            }

            i++;
            const skip = (pattern) => {
                i += (code.slice(i).match(pattern) ?? [ "" ])[0].length;
            };
            skip(new RegExp(`^ {_config.tabSize}`));
            skip(/^&[a-z]+;/);
            
            setTimeout(() => {
                this.#type(HTMLSourceCodeElement.#decodeEntities(code), i);
            }, 50 + (!/\n/.test(code.charAt(i)) ? (Math.random() * 150) : 0));
        }

        #copy() {
            try {
                navigator.clipboard.writeText(this.#code);
            } catch(err) {} finally {
                HTMLSourceCodeElement.#copyCallback(this.#dom);
            }
        }

        addStylesheet(stylesheet) {
            this.#shadowRoot.appendChild(stylesheet.cloneNode(true));
        }
    }
    
    window.customElements.define(_config.tagName, HTMLSourceCodeElement);

    window.HTMLSourceCodeElement = HTMLSourceCodeElement;
})();