export default function(theme = "min", syntax = null) {
    import(`./dist/HTMLSourceCodeElement.${theme}${syntax ? "." : ""}${syntax ?? ""}.js`);
}