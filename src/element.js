/*
 * (c) Thassilo Martin Schiepanski
 */

(_ => {    
    const _config = require("../_config.json");
    const template = require("template.html");
    const minCss = require("min.css");
    
    class HTMLSourceCodeElement extends HTMLElement {
        static #config = {
            tabSize: _config.defaultTabSize
        };
        static #globalAttrs = {};
        static #stylesheets = [];
        static #instances = [];
        
        static #eventHandlers = {
            copy: (dom) => {
                const fallbackText = dom.copy.textContent;
                dom.copy.style.pointerEvents = "none";
                dom.copy.classList.add("active");
                dom.copy.textContent = "Copied";
                setTimeout(() => {
                    dom.copy.style.pointerEvents = "auto";
                    dom.copy.classList.remove("active");
                    dom.copy.textContent = fallbackText;
                }, 1000);
            },
            highlight: (code) => code
        };
        
        static #renderAll(forceUpdate = false) {
            HTMLSourceCodeElement.#instances
            .forEach((instance) => {
                instance.render(null, forceUpdate);
            });
        }

        static #decodeEntities(html) {
            const sanitizer = document.createElement("textarea");
            sanitizer.innerHTML = html;
            return sanitizer.value;
        }
        
        static on(event, callback) {
            HTMLSourceCodeElement.#eventHandlers[event] = callback;

            switch(event) {
                case "highlight":
                    HTMLSourceCodeElement.#renderAll();
                    break;
            }
        }
        
        static globalAttrs(overrides = {}) {
            HTMLSourceCodeElement.#globalAttrs = {
                ...HTMLSourceCodeElement.#globalAttrs,
                ...overrides
            };
            HTMLSourceCodeElement.#renderAll();
        }
        
        static config(overrides = {}) {
            HTMLSourceCodeElement.#config = {
                ...HTMLSourceCodeElement.#config,
                ...overrides
            };
            HTMLSourceCodeElement.#renderAll(true);
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
                const levelledLines = lines
                .map((line) => line.slice(minIndentation));
                const detectedIndentation = this.#detectIndentation(levelledLines.join("\n"));
                const tabbedLines = levelledLines
                .map((line) => this.#fixIndentation(detectedIndentation, line))
                .join("\n");

                this.innerHTML = "";
                this.#type(
                    HTMLSourceCodeElement.#decodeEntities(tabbedLines),
                    this.#readAttribute("type") ? 0 : Infinity
                );

                this.#recoverStyle("visibility");
            });

            this.#dom.edit = this.#shadowRoot.querySelector(".edit");
            this.#dom.display = this.#shadowRoot.querySelector(".display");
            this.#dom.table = this.#dom.display.querySelector(".display table");
            this.#dom.copy = this.#shadowRoot.querySelector(".copy");

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
                
                this.render(code);

                this.#dispatchEvent("input", code);
            });
            this.#dom.edit.addEventListener("keydown", (e) => {
                if(e.keyCode !== 9) return;
                e.preventDefault();
                document.execCommand("insertText", false, " ".repeat(HTMLSourceCodeElement.#config.tabSize));
            });
            
            this.#dom.copy.addEventListener("click", () => this.#copy());
        }

        #readAttribute(name) {
            if([ true, false ].includes(HTMLSourceCodeElement.#globalAttrs[name])) {
                return HTMLSourceCodeElement.#globalAttrs[name];
            }
            return this.hasAttribute(name)
            ? (this.getAttribute(name) || true)
            : false;
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

        #updateCode(code) {
            this.#code = code;
            this.#dom.table.innerHTML = "";
            
            const detectedIndentation = !this.#readAttribute("edit")
            ? this.#detectIndentation(code)
            : 0;

            const tagStack = [];
            (HTMLSourceCodeElement.#eventHandlers
                .highlight
                .bind(this)(
                    code,
                    this.#readAttribute("language")
                ) ?? ""
            )
            .split(/\n/g)
            .forEach((line, i) => {
                const tabbedLine = line.trim().length
                ? (detectedIndentation ? this.#fixIndentation(detectedIndentation, line) : line)
                : "";
                const taggedLine = [
                    ...tagStack.map((tag) => tag.outerHTML),
                    tabbedLine
                ].join("");
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
        }

        #type(code, i = 0) {
            const partialCode = code.slice(0, i);
            const partialLines = partialCode.split(/\n/g);
            this.#dom.edit.innerHTML = partialLines
            .map((line) => line
                .replace(/[\u00A0-\u9999<>\&]/g, (c) => `&#${c.charCodeAt(0)};`))
            .map((line) => `<div>${line || "&emsp;"}</div>`)
            .join("");
            
            this.render(
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
            skip(/^&[a-z]+;/);
            
            setTimeout(() => {
                code
                this.#type(HTMLSourceCodeElement.#decodeEntities(code), i);
            }, 50 + (!/\n/.test(code.charAt(i)) ? (Math.random() * 150) : 0));
        }

        #detectIndentation(code) {
            return Math.min(
                ...code
                .split(/\n/g)
                .filter((line) => line.trim().length)
                .map((line) => line.match(/^( {2})*/)[0].length)
                .filter((len) => len)
            );
        }

        #fixIndentation(trueIndentation, line) {
            return line
            .replace(new RegExp(`^( {${trueIndentation}})*`), (indentation) => {
                return " ".repeat(
                    HTMLSourceCodeElement.#config.tabSize
                    * (indentation.length / trueIndentation)
                );
            })
        }

        #copy() {
            try {
                navigator.clipboard.writeText(this.#code);
            } catch(err) {} finally {
                HTMLSourceCodeElement.#eventHandlers
                .copy({
                    host: this,
                    ...this.#dom
                });
            }
        }

        render(code, forceUpdate = false) {
            if(!code && !this.#code) return;
            
            const updateConfigAttribute = (name) => {
                this.#readAttribute(name)
                ? this.setAttribute(name, "")
                : this.removeAttribute(name);
            };
            updateConfigAttribute("copy");
            updateConfigAttribute("scroll");
            
            (code || forceUpdate)
            && this.#updateCode(code || this.#code);
        }

        addStylesheet(stylesheet) {
            this.#shadowRoot.appendChild(stylesheet.cloneNode(true));
        }
    }
    
    window.customElements.define(_config.tagName, HTMLSourceCodeElement);

    window[_config.className] = HTMLSourceCodeElement;
})();