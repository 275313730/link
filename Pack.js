// change the urls according to your files
// put this script in the index.html for the first script
const urls = {
    entry: 'App',
    modules: ['Link', 'link-router'],
    views: ['Game', 'Score'],
    components: ['Test', 'Cpn']
}

const pack = document.getElementsByTagName('script')[0]

urls.modules.forEach(name => {
    document.write(`<script type="text/javascript" src="modules/${name}.js"></script>`);
})

urls.components.forEach(url => {
    parseCpn(url)
});

urls.views.forEach(url => {
    parseCpn(url)
});

document.write(`<script src="${urls.entry}.js" ></script>`)

pack.parentNode.removeChild(pack)

function parseCpn(url) {
    const tags = ['template', 'script', 'style'],
        text = getFileText(`views/${url}.Link`)

    tags.forEach(tag => {
        const start = text.indexOf(`<${tag}`),
            end = text.indexOf(`/${tag}>`) + `/${tag}>`.length
        document.write(text.slice(start, end));
    })
}

function getFileText(url) {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, false)
    xhr.send()
    return xhr.responseText
}
