# HTML Code Element

Rich HTML code component `<code-element>` for native usage.

- Editable
- Formatting / highlighting interface
- Simple custom styling

![](https://github.com/t-ski/html-code-element/blob/master/demo.gif)

## Integration

Integrate GitHub hosted module via script tag:

``` html
<script src="https://t-ski.github.io/html-code-element/dist/codecomponent.basic.js"></script>
```

Code elements can be created like ordinary non-empty HTML elements: From markup tags or dynamic creation.

``` html
<code-element language="php" editable>
    // Code goes here
</code-element>
```

By default, different themes are available for simple integration:

|    |    |
| :- | :- |
| `codecomponent.min.js`   | *Minimum component style*       |
| `codecomponent.basic.js` | *Basic component style (adapts dark mode)* |

> Code elements can be considered block spaced text content elements.

## Attributes

Several attribute modifiers are available:

| Attribute | Purpose |
| :--- | :------ |
| `copyable` | *Enable copying of code via button* |
| `editable` | *Enable editing of code* |
| `highlight` | *Highlight given line(s) of code. Multiple lines to delimit with semicolon (;); line ranges to depicit with an infix dash (-).* |
| `type-live`| *Have given code simulated as if typed live (true (default speed), or numerical value defining the speed ([0, ∞] * default speed))* |

## Global Configuration

Code elements can be adjusted on a globally uniformal basis using the static HTMLCodeElement class context.  
  
Apply settings to each successively parsed code element using the `config()` method: 

``` js
HTMLCodeElement.config({
    "tab-size": 4,
    "no-overflow": false
});
```

| Parameter | Purpose |
| :--- | :------ |
| `tab-size` | *Number of whitespaces to use in a tab upon formatting (indentation)* |
| `no-overflow` | *Whether not to have lines overflow the code box, but break lines. :warning: This option interferes and thus inherently disables editability of code (i.e. `editable` attributes will be ignored).* |

Element attributes (s.a.) that might be required to have a universal effect can be also be assigned to the config:

``` js
HTMLCodeElement.config({
    "copyable": true,
    "editable": true,
    "type-live": 1.5
});
```

## Style

Custom styles can be provided to extend (and possibly override) the default style theme. At that, both plain CSS text or a path to a stylesheet file may be provided:

``` js
// CSS Text overload
HTMLCodeElement.appendStyle(`
    .edit {
        color: slategray;
    }

    .hljs-comment {
        color: gray;
    }
`);

// Stylesheet href overload
HTMLCodeElement.appendStyle("/assets/css/code-component.css");
```

## Structure

The code element maintains an encapsulated DOM. The underlying elements can be styles from the given styles accessing the elements directly. The internal elements are classified as follows:

| Class | Element Description |
| :--- | :------------------- |
| `:host` | *Overall element wrapper* |
| `lines` | *Line number indicator on the left* |
| `edit` | *Editable area on the right* |
| `highlighted` | *Highlighted lines* |
| `copy` | *Copy button in the top-right corner* |

## Dynamic Handlers

### Formatting

In order to provide custom code formatting (usually for highlighting) use the `setFormatHandler()` method:

``` js
// Specific language
HTMLCodeElement.setFormatHandler("js", code => {
    return formatJs(code);
});

// Specific language
HTMLCodeElement.setFormatHandler([ "js", "javascript" ], code => {
    return formatJs(code);
});

// Any language wildcard
HTMLCodeElement.setFormatHandler("*", (code, language) => {
    return formatAny(code, language);
});
```

> Each language can be assigned multiple handlers that are worked in order of registration.

> The wildcard (working on `*`) handles any code regardless of the actual language and always applies first.

#### Using highlight.js

[highlight.js](https://highlightjs.org/) – representing the most popular code highlighting API for JS – can easily be integrated. Consider the following example:

``` html
<script src="https://unpkg.com/@highlightjs/cdn-assets@11.6.0/highlight.min.js"></script>

<script>
    HTMLCodeElement.setFormatHandler("*", (code, language) => hljs.highlight(code, { language }).value);
</script>
```

### Copy Action

In order to provide custom copy action handling (usually for mutating the copy button) use the `setCopyHandler()` method:

``` js
let copyTimeout;
HTMLCodeElement.setCopyHandler(copyButton => {
    copyButton.textContent = "Copied";

    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(_ => {
        copyButton.textContent = "Copy";
    }, 2000);
});
```

> At most one copy handler is effective. Thus, any newly set handler overrides the previous.

## Slotted contents

Retrieve slotted code using either `innerHTML` or `textContent`. Both return the exact same value.

``` js
let code = document.querySelector("code-element#hero").innerHTML;
    code = document.querySelector("code-element#hero").textContent;
```

## Events

Each code element emits the familiar generic events. Additionally, editable code elements emit the `input` and the `change` event equivalent to `input` or `textarea` element.

``` js
document.querySelector("code-element#hero")
.addEventListener("input", e => {
    console.log(`Code length: ${compileAndRun(e.target.textContent.length)}`);
});
```

## SSR

The code element is integrated into the client at runtime. However, the structural integration can also be pre-rendered to resolve visible setups.

### Installation

```
$ npm install t-ski/html-code-element
```

### Rendering

``` js
const { render } = require("html-code-element");

render({
    sourcePath: "./dev/index.html",
    distPath: "./web/index.html,

    styles: String(readFileSync(join(__dirname, "./dev/code-component.css")))
});
```

| Configuration | Purpose |
| :------------ | :------ |
| `sourcePath` | *Path to markup file whose content to render.* |
| `sourceCode` | *Markup string to render. If `sourcePath` is provided, this configuration is ignored.* |
| `distPath` | *Path which write render result to as a file.* |
| `distCallback` | *Callback to invoke with render result.* |
| `styles` | *Styles string to render as custom styling (CSS).* |

## 

<sub>© Thassilo Martin Schiepanski</sub>
