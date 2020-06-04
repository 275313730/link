// 解析Link单文件组件
(function () {
    const files = {
        publicPath: 'src',
        entry: 'App',
        modules: ['Link', 'link-router'],
        views: ['Home', 'Img'],
        components: ['Cpn']
    }

    const pack = document.getElementsByTagName('script')[0]

    files.modules.forEach(name => {
        document.write(`<script type="text/javascript" src="modules/${name}.js"></script>`);
    })

    files.components.forEach(fileName => {
        parseCpn('components', fileName)
    });

    files.views.forEach(fileName => {
        parseCpn('views', fileName)
    });

    document.write(`<script src="${files.publicPath}/${files.entry}.js" ></script>`)
    pack.parentNode.removeChild(pack)

    function parseCpn(path, fileName) {
        const tags = ['template', 'script', 'style'],
            text = getFileText(`${files.publicPath}/${path}/${fileName}.Link`)
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
})()
