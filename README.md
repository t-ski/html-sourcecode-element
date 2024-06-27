# HTMLSourceCodeElement

Rich HTML code element with a native API.

<a href="#integration"><img src="./readme/hero.gif" width="550"></a>

[1. Integration](#integration)  
[2. Attributes](#attributes)  
&emsp; [2.1 `copy`](#copy)  
&emsp; [2.2 `edit`](#edit)  
&emsp; [2.3 `type`](#type)  
&emsp; [2.4 `language`](#language)  
&emsp; [2.5 `scroll`](#scroll)  
[3. Themes](#themes)  
&emsp; [3.1 `min`](#default)  
&emsp; [3.2 `default`](#default)  
[4. Highlighting](#highlighting)  
&emsp; [4.1 `autumn`](#autumn)  
&emsp; [4.2 `matrix`](#matrix)  

## Integration

``` html
<script src="unpkg.com/@t-ski/html-code-element/dist/HTMLCodeElement.<theme>[.<highlighting>].js"></script>
```

`<theme>` is a placeholder for an element theme identifier ([browse Themes](#themes)).  
`<highlighting>` specifies an optional syntax highlighting scheme ([browse Highlighting](#highlighting)).

#### Recommended

``` html
<script src="unpkg.com/@t-ski/html-code-element/dist/HTMLCodeElement.default.autumn.js"></script>
```

#### Usage

``` html
<source-code edit type language="py">
  print('Hello, world!')
</source-code>`
```

> ℹ️ Anything slotted within the `<source-code>` is detected as code contents. HTML code snippets particularly do not have to be escaped.

## Attributes

#### `copy`

<sub>`singleton`</sub>
``` html
<source-code copy>
```

Make element copyable by hover activated button.

#### `edit`

<sub>`singleton`</sub>
``` html
<source-code edit>
```

Make element editable like a script editor.

#### `scroll`

<sub>`singleton`</sub>
``` html
<source-code type>
```

Make element scrollable at horizontal overflow, instead of wrap.

#### `type`

<sub>`singleton`</sub>
``` html
<source-code type>
```

Make element as if a human would type the code.

#### `language`

``` html
<source-code language="php">
```

Specify language to help with highlighting (if necessary).

#### `maxheight`

``` html
<source-code maxheight="php">
```

Specify maximum amount of lines after which to enable vertical scroll.

> ℹ️ A minimum of `5` lines are shown when used with `type`.

---

### Attribute API

The DOM class `HTMLSourceCodeElement` is associated with the `<source-code>` tag. The DOM class provides a static configuration function to override certain attributes globally.

``` ts
HTMLSourceCodeElement
.config(attrs: { [name: string]: boolean; });
```

``` js
HTMLSourceCodeElement
.config({
  copy: true,
  edit: false
});
```

> ℹ️ A global configuration does not invert, but override individual attributes.

## Themes

#### `min`

``` html
<script src="…/HTMLCodeElement.min[.<syntax>].js">
```

Minimal editor theme.

| | |
| - | - |
| <a href="#themes"><img src="./readme/light.min.png" width="385"></a> | <a href="#themes"><img src="./readme/dark.min.png" width="385"></a> |

#### `default`

``` html
<script src="…/HTMLCodeElement.default[.<syntax>].js">
```

Default editor theme.

| | |
| - | - |
| <a href="#themes"><img src="./readme/light.default.png" width="385"></a> | <a href="#themes"><img src="./readme/dark.default.png" width="385"></a> |

> ℹ️ Themes adopt the colour scheme preferred by the user.

---

### Theme API

Using the `addStylesheet()` method, custom styles can be injected into the `<source-code>` shadow DOM. The method exists both statically on `HTMLSourceCodeElement`, as well as on each individual instance. The method must be passed a URL to a stylesheet. Alternatively, a reference to a `<link>` or `<style>` element also works.

``` ts
(HTMLSourceCodeElement|instanceof HTMLSourceCodeElement)
.addStylesheet(stylesheet: HTMLStyleElement|HTMLLinkElement|string);
```

## Highlighting

Syntax highlighting is an optional addition to the basic API. In fact, it requires [highlight.js](https://highlightjs.org/) to work:

``` html
<head>
  <script src="https://unpkg.com/@highlightjs/cdn-assets/highlight.min.js"></script>
  <script src="unpkg.com/@t-ski/html-code-element/dist/HTMLCodeElement.default.autumn.js"></script>
  <script>
    HTMLCodeElement.on("highlight", (code, language) => {
      return ´language
            ? hljs.highlight(code, { language }).value
            : hljs.highlightAuto(code).value);
    });
  </script>
</head>
```

> ℹ️ Omit a syntax highlighting specifier to skip highlighting.

#### `autumn`

``` html
<script src="…/HTMLCodeElement.<theme>.autumn.js">
```

Cozy, autumn inspired syntax highlighting.

| | |
| - | - |
| <a href="#syntax-highlighting"><img src="./readme/light.default.autumn.png" width="385"></a> | <a href="#syntax-highlighting"><img src="./readme/dark.default.autumn.png" width="385"></a> |

#### `matrix`

``` html
<script src="…/HTMLCodeElement.<theme>.matrix.js">
```

All green, Matrix (1999) inspired syntax highlighting.

| | |
| - | - |
| <a href="#syntax-highlighting"><img src="./readme/light.default.matrix.png" width="385"></a> | <a href="#syntax-highlighting"><img src="./readme/dark.default.matrix.png" width="385"></a> |

---

### Events API

The `HTMLSourceCodeElement` DOM class provides a static API to handle events in a custom fashion.

``` ts
HTMLSourceCodeElement
.on(event: string, cb: (...args: unknown[]) => unknown)
```

#### on `copy`

``` ts
HTMLCodeElement.on("copy", (dom: {
  edit: HTMLDivElement;
  table: HTMLTableElement;
  copy: HTMLButtonElement;
}) => void)
```

Callback fires whenever code is copied. The callback is passed the respective element's shadow DOM key elements. The DOM might be used to to reflect that the code was in fact copied.

#### on `highlight`

``` ts
HTMLCodeElement.on("highlight", cb: (code: string, language?: string) => string)
```

Callback fires whenever code is rendered. The callback is passed the respective raw code to highlight. If the respective element has an assigned `language` attribute that value is also passed.

## 

<sub>&copy; Thassilo Martin Schiepanski</sub>