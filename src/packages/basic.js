HTMLCodeElement.appendStyle("@CSS");

let copyTimeout;
HTMLCodeElement.setCopyHandler(copyButton => {
    copyButton.textContent = "Copied";

    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(_ => {
        copyButton.textContent = "Copy";
    }, 2000);
});