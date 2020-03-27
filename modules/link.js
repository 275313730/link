class link {
    constructor(options) {
        this.el = options.el
        this.app = document.getElementById(this.el)
        this.data = options.data
        this.methods = options.methods
        this.computed = options.computed
        this.bindings = null
        this._init()
    }

    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //初始化
    _init() {
        if (this.data) {
            this._arrayProto()
            this._defineComputed()
            this._defineReactive(this.data, Object.keys(this.data))
            this._forBind(this.app)
            this._mustacheBind(this.app)
            this._mustacheInit()
            this._linkBind(this.app)
        }
        this._defineMethods()
        this._classBind(this.app)
        this._styleBind(this.app)
        this._eventsBind(this.app)
    }

    /*初始化内容 
        暴露事件:defineEvents
        初始化mustache内容:mustacheInit
    */

    //数组方法改写
    _arrayProto() {
        let link = this
        let protoNameList = ['push', 'pop', 'shift', 'unshift']

        protoNameList.forEach(proto => {
            let arrayProto = []
            arrayProto.push(Array.prototype[proto])
            Array.prototype[`link${proto}`] = arrayProto[0]
            arrayProto = null
        })

        Array.prototype.push = function (value) {
            this[this.length] = value
            link._keyArrGet(link.data, value, [], keyArr => {
                link._defineProperty(this, this.length - 1, value, keyArr)
                link._mustacheInit()
            })
        }

        Array.prototype.pop = function () {
            if (this.length > 0) {
                this.length--
            }
            link._mustacheInit()
        }
    }

    //将methods暴露到this中，便于调用方法和数据
    _defineMethods() {
        for (const key in this.methods) {
            if (this.methods.hasOwnProperty(key)) {
                const value = this.methods[key];
                this[key] = value
            }
        }
        delete this.methods
    }

    //将computed加入data中
    _defineComputed() {
        for (const key in this.computed) {
            if (this.computed.hasOwnProperty(key)) {
                const value = this.computed[key];
                this[key] = value
                this.data[key] = this[key]()
                console.log(this[key])
            }
        }
        delete this.computed
    }

    //初始化mustache内容 
    _mustacheInit() {
        if (this.bindings == null) { return }
        this.bindings.forEach(e => {
            if (e.type === 'mustache') {
                this._viewDataChange(this, e)
            }
        })
    }

    /*数据变动 
        数据响应化:defineReactive 
        数据变动监听:dataChange 
        页面数据变动:viewDataChange 
        页面class变动:viewClassChange 
        页面style变动:viewStyleChange
    */

    //数据响应化
    _defineReactive(data, keys, keyArr) {
        //keyArr是一个包含key路径的数组，用于查找value
        keyArr = keyArr || []
        for (const key of keys) {
            let currentKeyArr = []
            let value = data[key]

            keyArr.linkpush(key)
            keyArr.forEach(key => {
                currentKeyArr.linkpush(key)
            })
            this._defineProperty(data, key, value, currentKeyArr)

            if (data[key] instanceof Object) {
                this._defineReactive(data[key], Object.keys(data[key]), keyArr)
            }

            keyArr.linkpop()
        }
    }

    _defineProperty(data, key, value, currentKeyArr) {
        let link = this
        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value !== newValue) {
                    value = newValue
                    link.__proto__._dataChange(link, key, currentKeyArr)
                }
            },
            enumerable: true,
            configurable: true,
        })
    }

    //判断binding类型
    _dataChange(link, key, keyArr) {
        //判断是否为数组
        if (!isNaN(Number(key))) {
            keyArr.linkpop()
            key = keyArr[keyArr.length - 1]
        }

        let value = this._dataGet(link.data, keyArr)

        link.bindings.forEach(e => {
            if (e.template.match(key)) {
                if (e.type == 'link' || e.type == 'mustache') {
                    this._viewDataChange(link, e)
                } else if (e.type == 'class') {
                    this._viewClassChange(link, e, value)
                } else if (e.type == 'style') {
                    this._viewStyleChange(link, e, value)
                }
            }
        })
    }

    //改变页面数据
    _viewDataChange(link, e) {
        let mustaches = e.template.match(/\{\{(.+?)\}\}/g)
        let text = e.template

        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+')
            let value = this._dataTypesGet(link, dataTypes)
            if (mustache === value) { return }
            text = text.replace(mustache, value)
        })

        if (e.node.nodeType === 3) {
            e.node.data = text
        } else if (e.node.nodeType === 1) {
            if (e.node.nodeName === 'INPUT') {
                e.node.value = text
            } else {
                e.node.innerText = text
            }
        }
    }

    //改变页面class
    _viewClassChange(link, e, value) {
        let node = e.node
        let classArr = e.template.split(',')

        classArr.forEach(cs => {
            let className = ""
            let boolean = false

            //判断是否为对象表达式
            if (cs.split(':').length === 1) {

                //判断是否为函数
                if (cs.match(/\(.*\)/) != null) {
                    let matches = cs.match(/(.*)\(.*\)/)
                    className = link[matches[1]](matches[2])
                } else {
                    className = value || this._dataGet(link.data, cs.split('.'))
                }
                if (className !== null && className !== undefined) {
                    boolean = true
                }
            } else {
                let matches = cs.split(':')
                className = matches[0].trim()
                let dataType = matches[1].trim()
                if (dataType.match(/\(.*\)/) != null) {
                    let matches = dataType.match(/(.*)\(.*\)/)
                    boolean = link[matches[1]](matches[2])
                } else {
                    boolean = value || this._dataGet(link.data, dataType.split('.'))
                }
            }

            //修改className
            if (boolean && node.className.match(className) == null) {
                if (node.className == "") {
                    node.className += className
                } else {
                    node.className += ` ${className}`
                }
            } else if (!boolean && node.className.match(className) != null) {
                if (node.className == className) {
                    node.className = node.className.replace(className, "")
                } else {
                    node.className = node.className.replace(` ${className}`, "")
                }
            }
        })
    }

    //改变页面style
    _viewStyleChange(link, e, value) {
        let node = e.node
        let styleArr = e.template.split(';')
        styleArr.forEach(style => {
            if (style == null || style == undefined || style == "") { return }

            let matches = style.split(':')
            let styleName = matches[0].trim()
            let dataType = matches[1]

            if (dataType.match(/\(.*\)/) != null) {
                let method = dataType.match(/(.*)\(.*\)/)
                node.style[styleName] = link[method[1]](method[2])
            } else {
                node.style[styleName] = value || this._dataGet(link.data, dataType.split('.'))
            }
        })
    }

    /*语法绑定 
        mustache 
        link 
        class 
        style
        events 
    */

    //绑定@for语法
    _forBind(node) {
        this._nodeSearch(node, 1, res => {
            let attr = res.getAttribute('@for')
            if (!attr) { return }
            let matches = attr.match(/(.+)in(.+)/)
            let subType, index = false
            if (matches[1].match(/\((.+)\)/)) {
                subType = matches[1].match(/\((.+)\)/)[1].split(',')[0].trim()
                index = true
            } else {
                subType = matches[1].trim()
            }
            let dataType = matches[2].trim()
            let keyArr = dataType.split('.')
            let data = this._dataGet(this.data, keyArr)
            res.removeAttribute('@for')
            let currentNode = res
            for (let i = 0; i < data.length - 1; i++) {
                let newNode = currentNode.cloneNode()
                newNode.innerHTML = currentNode.innerHTML
                currentNode.innerHTML = currentNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.${i}}}`)
                if (index) {
                    currentNode.setAttribute('index', i)
                }
                currentNode.parentNode.insertBefore(newNode, currentNode.nextSibling)
                currentNode = newNode
            }
            currentNode.innerHTML = currentNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.${data.length - 1}}}`)
            if (index) {
                currentNode.setAttribute('index', data.length - 1)
            }
        })
    }

    //绑定mustache语法
    _mustacheBind(node) {
        let mustaches = node.innerText.match(/(\{\{.+?\}\})/g)
        if (!mustaches) { return }

        mustaches.forEach(mustache => {
            this._nodeSearch(node, 3, res => {
                let data = res.data.replace(/[\r\n]/g, "").trim()
                if (res == node || data == "") { return }
                if (data.indexOf(mustache) !== -1 || data.match(mustache) !== null) {
                    let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+')
                    dataTypes.forEach((dataType, index) => {
                        let typeArr = dataTypes[index].split('.')
                        typeArr.forEach((dataType, index) => {
                            if (dataType.match(/(.*)\[(\d+)\]/)) {
                                let matches = dataType.match(/(.*)\[(\d+)\]/)
                                typeArr.splice(index, 1, matches[1], matches[2])
                            }
                        })
                        typeArr = typeArr.join('.')
                        data = data.replace(dataTypes[index], typeArr)
                    })
                    this._bindingsSet({ node: res, template: data, type: 'mustache' })
                }
            })

        });
    }

    //绑定link语法
    _linkBind(node) {
        this._nodeSearch(node, 1, res => {
            let attr = res.getAttribute('link')
            if (!attr) { return }

            let dataTypes = attr.split('+')
            let value = null

            if (dataTypes.length === 1) {
                value = this._dataGet(this.data, dataTypes[0].split('.'))
            } else {
                dataTypes.forEach(dataType => {
                    if (value === null) {
                        value = this._dataGet(this.data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                    } else {
                        value += this._dataGet(this.data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                    }
                })
            }

            if (!value) {
                throw new Error(`${attr} is not defined`)
            }

            if (res.tagName === 'INPUT') {
                res.value = value
                res.addEventListener('input', () => {
                    let _value = isNaN(Number(res.value)) ? res.value : Number(res.value)
                    this._dataSet(this.data, attr.split('.'), _value)
                })
            } else {
                res.innerText = value
            }

            this._bindingsSet({ node: res, template: `{{${attr}}}`, type: 'link' })
        })
    }

    //绑定@class语法
    _classBind(node) {
        this._nodeSearch(node, 1, res => {
            let attr = res.getAttribute('@class')
            if (!attr) { return }

            this._bindingsSet({ node: res, template: attr, type: 'class' }, e => {
                res.removeAttribute('@class')
                this._viewClassChange(this, e)
            })
        })
    }

    //绑定@style语法
    _styleBind(node) {
        this._nodeSearch(node, 1, res => {
            let attr = res.getAttribute('@style')
            if (!attr) { return }

            let template = (res.getAttribute('style') || "") + attr
            this._bindingsSet({ node: res, template: template, type: 'style' }, e => {
                res.removeAttribute('@style')
                this._viewStyleChange(this, e)
            })
        })
    }

    //绑定events语法
    _eventsBind(node) {
        let link = this
        this._nodeSearch(node, 1, res => {
            this.events.forEach(event => {
                let method = res.getAttribute(event)
                if (method === null || method === undefined) { return }
                let matches = method.match(/(.+)\((.*)\)/)
                if (matches === null) { return }

                let fn = matches[1]
                let args = matches[2]
                event = event.slice(1)

                if (args.match(/event/)) {
                    res.addEventListener(event, function (args) {
                        link[fn](args)
                    })
                } else if (args.match(/this/)) {
                    res.addEventListener(event, function (args) {
                        link[fn](args.target)
                    })
                } else if (args.match(/index/) && res.getAttribute('index')) {
                    res.addEventListener(event, function () {
                        let index = res.getAttribute('index')
                        link[fn](index)
                    })
                } else {
                    res.addEventListener(event, function () {
                        link[fn](args)
                    })
                }
                res.removeAttribute('@click')
            })
        })
    }

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    _bindingsSet(options, fn) {
        this.bindings = this.bindings || []
        let exist = false
        this.bindings.forEach(e => {
            if (e.node == options.node && e.template == options.template) {
                exist = true
            }
        })

        if (exist) { return }
        this.bindings.linkpush(options)

        if (fn) {
            fn(this.bindings[this.bindings.length - 1])
        }
    }

    /*遍历
        数据:dataGet dataSet
        节点:nodeSearch
    */

    //通过dataTypes数组来获取多个data
    _dataTypesGet(link, dataTypes) {
        let value = null
        dataTypes.forEach(dataType => {
            let _value = link._dataGet(link.data, dataType.split('.'))
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

    //获取data
    _dataGet(data, keyArr) {
        keyArr.forEach(key => {
            data = data[key]
        })
        return data
    }

    //设置data
    _dataSet(data, keyArr, value) {
        keyArr.forEach((key, index) => {
            if (index === keyArr.length - 1) {
                data[key] = value
            } else {
                data = data[key]
            }
        })
    }


    //获取keyArr
    _keyArrGet(data, value, keyArr, fn) {
        let keys = Object.keys(data)
        keyArr = keyArr || []
        for (const key of keys) {
            keyArr.linkpush(key, true)
            if (data[key] === value) {
                fn(keyArr)
            } else if (typeof (data) === "object") {
                this._keyArrGet(data[key], value, keyArr, fn)
            }
            keyArr.linkpop()
        }
    }

    //查询node
    _nodeSearch(node, type, callback) {
        let childNodes = node.childNodes
        for (let child of childNodes) {
            if (child.nodeType === 3 && type === 3) {
                callback(child)
            } else if (child.nodeType === 1) {
                if (type === 1) {
                    callback(child)
                }
                this._nodeSearch(child, type, callback)
            }
        }
    }
}

module.exports = link