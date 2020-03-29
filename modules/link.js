const Data = require('../modules/Data.js')
const Bind = require('../modules/Bind.js')
const Respond = require('../modules/Respond.js')

class Link {
    constructor(options) {
        this.el = options.el
        this.app = document.getElementById(this.el)
        this.data = options.data
        this.methods = options.methods
        this.computed = options.computed
        this.bindings = null
        this.defineProperty = null
        this.init()
    }

    //初始化
    init() {
        this.arrayProto()
        this.methodsExpose()
        this.computedExpose()
        if (this.data) {
            this.defineProperty = new Data(this)
            new Bind(this, this.app)
            this.viewInit()
        }
    }

    //数组方法改写
    arrayProto() {
        let link = this
        let protoNameList = ['push', 'pop', 'shift', 'unshift']

        protoNameList.forEach(proto => {
            let arrayProto = []
            arrayProto.push(Array.prototype[proto])
            Array.prototype[`link${proto}`] = arrayProto[0]
            arrayProto = null
        })

        Array.prototype.push = function (value) {
            this.linkpush(value)
            link.defineProperty(this, this.length - 1, value)
            link.viewInit(link)
            link.viewInit(link)
        }

        Array.prototype.pop = function () {
            this.linkpop()
            link.viewInit(link)
        }
    }

    //将methods暴露到this中，便于调用方法和数据
    methodsExpose() {
        for (const key in this.methods) {
            if (this.methods.hasOwnProperty(key)) {
                const value = this.methods[key];
                this[key] = value
            }
        }
        delete this.methods
    }

    //将computed加入data中
    computedExpose() {
        for (const key in this.computed) {
            if (this.computed.hasOwnProperty(key)) {
                const value = this.computed[key];
                this[key] = value
                this.data[key] = this[key]()
            }
        }
        delete this.computed
    }

    //页面刷新
    viewInit(link, type) {
        link = link || this
        link.bindings.forEach(binding => {
            if (type ? binding.type === type : binding.type === 'node') {
                Respond.viewNodeChange(link, binding)
            } else if (type ? binding.type === type : binding.type === 'mustache') {
                Respond.viewDataChange(link, binding)
            } else if (type ? binding.type === type : binding.type === 'class') {
                Respond.viewClassChange(link, binding)
            } else if (type ? binding.type === type : binding.type === 'style') {
                Respond.viewStyleChange(link, binding)
            }
        });
    }

    //获取data
    dataGet(data, keyArr) {
        keyArr.forEach(key => {
            data = data[key]
        })
        return data
    }

    //设置data
    dataSet(data, keyArr, value) {
        keyArr.forEach((key, index) => {
            if (index === keyArr.length - 1) {
                data[key] = value
            } else {
                data = data[key]
            }
        })
    }

    //通过dataTypes数组来获取多个data
    dataTypesGet(link, dataTypes) {
        let value = null
        dataTypes.forEach(dataType => {
            let _value = link.dataGet(link.data, dataType.split('.'))
            if (value === null || value === undefined) {
                if (_value === undefined) {
                    value = (isNaN(Number(dataType)) ? dataType : Number(dataType))
                } else {
                    value = _value || ""
                }
            } else {
                if (_value === undefined) {
                    value += (isNaN(Number(dataType)) ? dataType : Number(dataType))
                } else {
                    value += _value || ""
                }
            }
        });
        return value
    }

    //查询node (已废弃)
    nodeSearch(node, type, callback) {
        let childNodes = node.childNodes
        for (let child of childNodes) {
            if (child.nodeType === 3 && type === 3) {
                callback(child)
            } else if (child.nodeType === 1) {
                if (type === 1) {
                    callback(child)
                }
                this.nodeSearch(child, type, callback)
            }
        }
    }

    //获取keyArr (已废弃)
    keyArrGet(data, value, keyArr, fn) {
        let keys = Object.keys(data)
        keyArr = keyArr || []
        for (const key of keys) {
            keyArr.linkpush(key)
            if (data[key] === value) {
                fn(keyArr)
            } else if (typeof (data) === "object") {
                this.keyArrGet(data[key], value, keyArr, fn)
            }
            keyArr.linkpop()
        }
    }
}

module.exports = Link