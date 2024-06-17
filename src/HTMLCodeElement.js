(_ => {
    const _config = require("_config.json");
    const template = require("template.html");

    class HTMLCodeElement extends HTMLElement {
        constructor() {
            super();

            const shadowDOM = this.attachShadow({ mode: "open" });
            shadowDOM.innerHTML = template;
        }

        connectedCallback() {
            
        }

        attributeChangedCallback(attrName) {
            switch(attrName) {
                case "highlight":
                    return;
            }
        }
    }
    
    window.customElements.define(_config.tagName, HTMLCodeElement);

    window.HTMLCodeElement = HTMLCodeElement;
})();