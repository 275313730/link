(function () {
    //实现require
    window.require = require = function (url, type) {
        type = type || 'function'
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url, false);
        xmlhttp.send();
        if (xmlhttp.status === 200) {
            let fn = xmlhttp.responseText
            if (type === 'function') {
                return function () {
                    eval(fn)
                    if (module.exports) {
                        return new module(module.exports)
                    }
                }()
            } else {
                return fn
            }
        }
    }

    //实现module.exports
    window.module = module = function (exports) {
        module.exports = null
        return Object.freeze(exports)
    }

    //载入app.js
    let config = require('./config.json', 'json')
    config = JSON.parse(config)
    let url = config.publicPath + '/' + config.entry
    require(url)

})()
