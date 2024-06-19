(_ => {
    const _config = require("_config.json");
    const template = require("template.html");
    const minCss = require("min.css");

    class HTMLCodeElement extends HTMLElement {
        static #instances = [];
        static #highlightCallback = (code) => {
            const sanitizer = document.createElement("pre");
            sanitizer.textContent = code;
            return sanitizer.innerHTML;
        };
        static #copyCallback = (dom) => {
            const fallbackText = dom.copy.textContent;
            const { opacity, pointerEvents } = dom.copy.style;
            dom.copy.style.pointerEvents = "none";
            dom.copy.style.opacity = 0.25;
            dom.copy.textContent = "Copied";
            setTimeout(() => {
                dom.copy.style.pointerEvents = pointerEvents;
                dom.copy.style.opacity = opacity;
                dom.copy.textContent = fallbackText;
            }, 1000);
        };
        
        static onHighlight(callback) {
            HTMLCodeElement.#highlightCallback = callback;

            HTMLCodeElement.#instances
            .forEach((instance) => instance.#render());
        }

        static onCopy(callback) {
            HTMLCodeElement.#copyCallback = callback;
        }
        
        #visibilityFallback;
        #shadowRoot;
        #dom = {};

        constructor() {
            super();

            this.#visibilityFallback = this.style.visibility;
            this.style.visibility = "hidden";

            this.#shadowRoot = this.attachShadow({ mode: "open" });
            this.#shadowRoot.innerHTML = template;

            const addStyle = (css) => {
                const style = document.createElement("style");
                style.innerHTML = css;
                this.#shadowRoot.appendChild(style);
            };
            addStyle(minCss);
            addStyle(`@STYLE@`);

            HTMLCodeElement.#instances.push(this);
        }
        
        connectedCallback() {
            setTimeout(() => {
                const code = this.innerHTML
                .replace(/^( *\n)*/, "")
                .replace(/(\n *)*$/, "");
                this.innerHTML = "";
                this.#dom.edit.textContent = this.#fixIndentation(code);

                const type = (code, i = 0) => {
                    this.#render(code.slice(0, i));
                    if(i >= code.length) {
                        this.hasAttribute("editable")
                        && this.#dom.edit.setAttribute("contenteditable", "");
                        return;
                    }
                    i += !code.slice(i, i + _config.tabSize).trim().length ? _config.tabSize + 1 : 1;
                    setTimeout(() => type(code, i), 50 + Math.random() * 200);
                };
                type(code, this.hasAttribute("type") ? 0 : Infinity);

                this.style.visibility = this.#visibilityFallback;
                !this.style.length && this.removeAttribute("style");
            });

            this.#dom.edit = this.#shadowRoot.querySelector("pre[edit]");
            this.#dom.table = this.#shadowRoot.querySelector("table");
            this.#dom.copy = this.#shadowRoot.querySelector("button");

            this.#dom.edit.addEventListener("input", () => {
                this.#render();
                this.#dispatchEvent("input", this.#dom.edit.textContent);
            });
            this.#dom.edit.addEventListener("keydown", (e) => {
                if(e.keyCode !== 9) return;
                e.preventDefault();
                document.execCommand("insertText", false, " ".repeat(_config.tabSize));
            });
            
            this.#dom.copy.addEventListener("click", () => this.#copy());
        }

        #dispatchEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail }));
        }

        #fixIndentation(code) {
            const lines = code
            .split(/\n/g);
            const minIndentation = Math.min(
                ...lines
                .filter((line) => line.trim().length)
                .map((line) => line.match(/^ */)[0].length)
            );
            return lines
            .map((line) => line.slice(minIndentation))
            .join("\n");
        }

        #render(code = this.#dom.edit.textContent) {
            this.#dom.table.innerHTML = "";

            (HTMLCodeElement.#highlightCallback.bind(this)(
                this.#fixIndentation(code),
                this.getAttribute("language")) ?? "")
            .split(/\n/g)
            .forEach((line, i) => {
                const row = document.createElement("tr");
                const tdLine = document.createElement("td");
                tdLine.classList.add("line-number");
                tdLine.textContent = i;
                row.appendChild(tdLine);
                const tdCode = document.createElement("td");
                const preCode = document.createElement("pre");
                preCode.classList.add("line-code");
                preCode.innerHTML = line;
                tdCode.appendChild(preCode);
                row.appendChild(tdCode);
                this.#dom.table.appendChild(row);
            });

            this.#dom.edit.style.paddingLeft = `${this.#dom.table.querySelector("td").offsetWidth}px`;
        }

        #copy() {
            try {
                const code = this.#dom.edit.textContent;

                navigator.clipboard.writeText(code);
            } catch(err) {} finally {
                HTMLCodeElement.#copyCallback(this.#dom);
            }
        }
    }
    
    window.customElements.define(_config.tagName, HTMLCodeElement);

    window.HTMLCodeElement = HTMLCodeElement;
})();