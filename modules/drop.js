//method @drop
function drop(event, el) {
    let fileList = event.dataTransfer.files;
    let container = document.querySelector(el)
    if (fileList.length > 0) {
        let url = window.webkitURL.createObjectURL(fileList[0]);
        if (fileList[0].type.match(/image/)) {
            container.innerHTML = `<img src="${url}" width="100%">`
        } else if (fileList[0].type.match(/text/)) {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.send();
            xhr.onload = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    container.innerText = xhr.responseText
                }
            }
        }
    }

}

window.addEventListener('drop', event => event.preventDefault())
window.addEventListener('dragleave', event => event.preventDefault())
window.addEventListener('dragenter', event => event.preventDefault())
window.addEventListener('dragover', event => event.preventDefault())

module.exports = drop