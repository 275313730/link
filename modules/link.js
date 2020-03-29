class Link {
    constructor(options) {
        this.el = options.el
        this.app = document.getElementById(this.el)
        this.data = options.data
        this.methods = options.methods
        this.computed = options.computed
        this.views = []
        this.init()
    }

    //初始化
    init() {
        this.arrayProto()
        this.methodsExpose()
        this.computedExpose()
        if (this.data) {
            new Data(this)
            new View(this, this.app)
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
            Data.defineProperty(link, this, this.length - 1, value)
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
    viewInit(link) {
        link = link || this
        link.views.forEach(view => {
            if (view.type === 'node') {
                Respond.viewNodeChange(link, view)
            } else if (view.type === 'mustache' || view.type === 'link') {
                Respond.viewDataChange(link, view)
            } else if (view.type === 'class') {
                Respond.viewClassChange(link, view)
            } else if (view.type === 'style') {
                Respond.viewStyleChange(link, view)
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

    //通过dataTypes数组来获取mustache语法表达式的值
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
}

//数据
class Data {
    constructor(link) {
        this.link = link
        this.defineReactive(link.data)
    }

    defineReactive(data) {
        for (const key of Object.keys(data)) {
            let value = data[key]
            Data.defineProperty(this.link, data, key, value)
            if (data[key] instanceof Object) {
                this.defineReactive(data[key])
            }
        }
    }

    static defineProperty(link, data, key, value) {
        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value !== newValue) {
                    value = newValue
                    Respond.notify(link, key)
                }
            },
            enumerable: true,
            configurable: true,
        })
        link.__proto__.viewInit(link)
    }
}

//视图
class View {
    constructor(link, node) {
        this.link = link
        this.fn = link.__proto__
        this.node = node
        this.data = link.data
        this.views = link.views
        this.nodeTraversal(this.node)
    }

    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    static viewSet(options, link) {
        let exist = false
        link.views.forEach(view => {
            if (view.node == options.node && view.type == options.type) {
                exist = true
            }
        })
        if (!exist) {
            link.views.linkpush(options)
        }
    }


    //node遍历
    nodeTraversal(node) {
        let childNodes = node.childNodes
        //匹配语法
        for (let child of childNodes) {
            if (child.nodeType === 1) {
                if (child.getAttribute('@for')) {
                    this.forBind(child)
                }
                if (child.getAttribute('link')) {
                    this.linkBind(child)
                }
                if (child.getAttribute('@class')) {
                    this.classBind(child)
                }
                if (child.getAttribute('@style')) {
                    this.styleBind(child)
                }
                let eventArr = []
                this.events.forEach(event => {
                    if (child.getAttribute(event)) {
                        eventArr.linkpush(event)
                    }
                })
                if (eventArr.length > 0) {
                    this.eventsBind(child, eventArr)
                }
                if (child.childNodes) { this.nodeTraversal(child) }
            } else if (child.nodeType === 3) {
                this.mustacheBind(child)
            }
        }
    }

    //绑定@for语法
    forBind(node) {
        //获取@for内容
        let attr = node.getAttribute('@for')
        //获取左右侧内容(通过in分割)
        let matches = attr.match(/(.+)in(.+)/)
        let subType = matches[1].match(/\((.+)\)/),
            dataType = matches[2].trim(),
            index = false
        //判断左侧内容是否包含多个参数
        if (subType) {
            subType = subType[1].split(',')[0].trim()
            index = true
        } else {
            subType = matches[1].trim()
        }
        node.removeAttribute('@for')
        //复制一个新的节点
        let newNode = node.cloneNode()
        newNode.innerHTML = node.innerHTML
        let thisNode = node
        thisNode.innerHTML = thisNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)
        if (index) {
            thisNode.setAttribute('index', 0)
        }
        View.viewSet({ node: thisNode, template: dataType, attr: { subType: subType, index: index, length: 1, nodeTemplate: newNode }, type: "node" }, this.link)
    }

    //绑定mustache语法
    mustacheBind(node) {
        const mustaches = this.link.app.innerText.match(/(\{\{.+?\}\})/g)
        mustaches.forEach(mustache => {
            let data = node.data.replace(/[\r\n]/g, "").trim()
            if (data == "" && data.indexOf(mustache) == -1 && data.match(mustache) == null) { return }
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+')
            dataTypes.forEach(dataType => {
                let typeArr = dataType.split('.')
                typeArr.forEach((type, index) => {
                    if (type.match(/(.*)\[(\d+)\]/)) {
                        let matches = type.match(/(.*)\[(\d+)\]/)
                        typeArr.splice(index, 1, matches[1], matches[2])
                    }
                })
                typeArr = typeArr.join('.')
                data = data.replace(dataType, typeArr)
            })
            View.viewSet({ node: node, template: data, type: 'mustache' }, this.link)
        });
    }

    //绑定link语法
    linkBind(node) {
        let attr = node.getAttribute('@link')
        let dataTypes = attr.split('+')
        let value = null
        if (dataTypes.length === 1) {
            value = this.fn.dataGet(this.data, dataTypes[0].split('.'))
        } else {
            dataTypes.forEach(dataType => {
                if (value === null) {
                    value = this.fn.dataGet(this.link.data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                } else {
                    value += this.fn.dataGet(this.link.data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                }
            })
        }
        if (!value) {
            throw new Error(`${attr} is not defined`)
        }
        //input双向绑定
        if (node.tagName === 'INPUT') {
            node.value = value
            node.addEventListener('input', () => {
                let _value = isNaN(Number(node.value)) ? node.value : Number(node.value)
                this.fn.dataSet(this.link.data, attr.split('.'), _value)
            })
        } else {
            node.innerText = value
        }
        View.viewSet({ node: node, template: `{{${attr}}}`, type: 'link' }, this.link)
        node.removeAttribute('@link')
    }

    //绑定@class语法
    classBind(node) {
        let attr = node.getAttribute('@class')
        let thisClass = node.getAttribute('class')
        View.viewSet({ node: node, template: attr, class: thisClass, type: 'class' }, this.link)
        node.removeAttribute('@class')
    }

    //绑定@style语法
    styleBind(node) {
        let attr = node.getAttribute('@style')
        let template = (node.getAttribute('style') || "") + attr
        View.viewSet({ node: node, template: template, type: 'style' }, this.link)
        node.removeAttribute('@style')
    }

    //绑定events语法
    eventsBind(node, eventArr) {
        let link = this.link
        eventArr.forEach(event => {
            let matches = node.getAttribute(event).match(/(.+)\((.*)\)/)
            if (matches === null) { return }
            let fn = matches[1]
            let args = matches[2]
            event = event.slice(1)
            if (args.match(/event/)) {
                node.addEventListener(event, function (args) {
                    link[fn](args)
                })
            } else if (args.match(/this/)) {
                node.addEventListener(event, function (args) {
                    link[fn](args.target)
                })
            } else if (args.match(/index/) && node.getAttribute('index')) {
                node.addEventListener(event, function () {
                    let index = node.getAttribute('index')
                    link[fn](index)
                })
            } else {
                node.addEventListener(event, function () {
                    link[fn](args)
                })
            }
            node.removeAttribute(`@${event}`)
        })
    }

}

//响应
class Respond {
    //通知分发
    static notify(link, key) {
        link.views.forEach(view => {
            if (view.template.match(key)) {
                if (view.type == 'link' || view.type == 'mustache') {
                    this.viewDataChange(link, view)
                } else if (view.type == 'class') {
                    this.viewClassChange(link, view)
                } else if (view.type == 'style') {
                    this.viewStyleChange(link, view)
                } else if (view.type == 'node') {
                    this.viewNodeChange(link, view)
                }
            }
        })
    }

    //改变页面节点
    static viewNodeChange(link, thisView) {
        let value = link.__proto__.dataGet(link.data, thisView.template.split('.'))
        while (value.length > thisView.attr.length) {
            let newNode = thisView.attr.nodeTemplate.cloneNode()
            newNode.innerHTML = thisView.attr.nodeTemplate.innerHTML
            thisView.node.parentNode.insertBefore(newNode, thisView.node.nextSibling)
            thisView.node = newNode
            thisView.node.innerHTML = thisView.node.innerHTML.replace(`{{${thisView.attr.subType}}}`, `{{${thisView.template}.${thisView.attr.length}}}`)
            if (thisView.attr.index) {
                thisView.node.setAttribute('index', thisView.attr.length)
            }
            thisView.attr.length++
            for (let i = 0; i < link.views.length; i++) {
                const view = link.views[i];
                if (view.type == "node") {
                    link.views.splice(i, 1)
                    i--
                }
            }
            new View(link, thisView.node.parentNode)
            View.viewSet(thisView, link)
        }
        while (value.length < thisView.attr.length) {
            for (let i = 0; i < link.views.length; i++) {
                const view = link.views[i];
                if (thisView.node == view.node) {
                    link.views.splice(i, 1)
                    i--
                }
            }
            let prevNode = thisView.node.previousSibling
            let thisNode = thisView.node
            thisNode.parentNode.removeChild(thisNode)
            thisView.node = prevNode
            thisView.attr.length--
            View.viewSet(thisView, link)
        }
    }

    //改变页面数据
    static viewDataChange(link, thisView) {
        let text = thisView.template
        let mustaches = text.match(/\{\{(.+?)\}\}/g)
        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+')
            let value = link.__proto__.dataTypesGet(link, dataTypes)
            if (mustache === value) { return }
            text = text.replace(mustache, value)
        })
        //判断语法类型
        if (thisView.type == 'mustache') {
            thisView.node.data = text
        } else if (thisView.type == 'link') {
            if (thisView.node.nodeName === 'INPUT') {
                thisView.node.value = text
            } else {
                thisView.node.innerText = text
            }
        }
    }

    //改变页面class
    static viewClassChange(link, thisView) {
        let node = thisView.node
        let classArr = thisView.template.split(',')
        let className = thisView.class
        classArr.forEach(cs => {
            let boolean = false
            let thisClassName = ""
            //判断是否为对象表达式
            let matches = cs.split(':')
            if (matches.length === 1) {
                //判断是否为函数
                let fn = cs.match(/(.*)\(.*\)/)
                if (fn) {
                    thisClassName = link[fn[1]](fn[2])
                } else {
                    thisClassName = link.__proto__.dataGet(link.data, cs.split('.'))
                }
                if (thisClassName) {
                    boolean = true
                }
            } else {
                thisClassName = matches[0].trim()
                let dataType = matches[1].trim()
                let fn = dataType.match(/(.*)\(.*\)/)
                if (fn) {
                    boolean = link[fn[1]](fn[2])
                } else {
                    boolean = link.__proto__.dataGet(link.data, dataType.split('.'))
                }
            }
            //修改className
            if (boolean) {
                className += ` ${thisClassName}`
            }
        })
        node.className = className
    }

    //改变页面style
    static viewStyleChange(link, thisView) {
        let node = thisView.node
        let styleArr = thisView.template.split(';')
        styleArr.forEach(style => {
            if (style == null || style == undefined || style == "") { return }
            let matches = style.split(':'),
                styleName = matches[0].trim(),
                dataType = matches[1]
            //判断是否为函数
            if (dataType.match(/\(.*\)/) != null) {
                let method = dataType.match(/(.*)\(.*\)/)
                node.style[styleName] = link[method[1]](method[2])
            } else {
                node.style[styleName] = link.__proto__.dataGet(link.data, dataType.split('.'))
            }
        })
    }
}