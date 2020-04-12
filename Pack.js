// use reg /^\s*(?=\r?$)\n/ to delete the space line
const urls = {
    html: 'index',
    entry: 'App',
    modules: ['Link', 'link-router'],
    views: ['Game', 'Score'],
    components: ['Test', 'Cpn']
}

parseUrls()

function parseUrls() {
    let html = getFileText(`${urls.html}.html`),
        templates = '',
        scripts = '',
        styles = ''

    urls['modules'].forEach(name => {
        scripts += `<script src="modules/${name}.js" ></script>`
    })

    urls['components'].forEach(url => {
        parseCpn(url)
    });

    urls['views'].forEach(url => {
        parseCpn(url)
    });

    scripts += `<script src="${urls.entry}.js" ></script>`

    html = html.replace(/\<script.*\/script>/, templates + scripts + styles)
    console.log(html)

    function parseCpn(url) {
        let text = getFileText(`views/${url}.html`),
            start = text.indexOf('<template'),
            end = text.indexOf('/template>') + '/template>'.length
        templates += text.slice(start, end) + '\n'

        start = text.indexOf('<script')
        end = text.indexOf('/script>') + '/script>'.length
        scripts += text.slice(start, end) + '\n'

        start = text.indexOf('<style')
        end = text.indexOf('/style>') + '/style>'.length
        styles += text.slice(start, end) + '\n'
    }
}

function getFileText(url) {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, false)
    xhr.send()
    return xhr.responseText
}
