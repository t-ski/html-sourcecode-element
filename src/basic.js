HTMLCodeComponent.appendStyle("@CSS");

let copyTimeout;
HTMLCodeComponent.setCopyHandler(copyButton => {
    copyButton.textContent = "Copied";

    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(_ => {
        copyButton.textContent = "Copy";
    }, 2000);
});