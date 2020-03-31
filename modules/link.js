"use strict";
class Link {
    constructor(options) {
        this.__app__ = document.getElementById(options.el)
        this.__data__ = options.data
        this.__methods__ = options.methods
        this.__computed__ = options.computed
        this.__views__ = []
        this.init()
    }

    //初始化
    init() {
        this.arrayReconstruct()
        this.methodsExpose()
        this.computedExpose()
        if (this.__data__) {
            new Data(this)
            this.dataExpose()
            new View(this, this.__app__)
            this.viewInit()
        }
    }

    //数组方法改写
    arrayReconstruct() {
        let link = this,
            arrayProto = Array.prototype,
            arrayMethods = Object.create(arrayProto),
            methodsList = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
        methodsList.forEach(method => {
            const original = arrayMethods[method]
            Array.prototype[method] = function (...args) {
                const result = original.apply(this, args)
                if (this.__ob__) {
                    if (method === 'push' || method === 'unshift') {
                        for (let i = 0; i < args.length; i++) {
                            let currentIndex = this.length - args.length + i
                            Data.defineProperty(link, this, currentIndex, this[currentIndex])
                        }
                    } else if (method === 'splice') {
                        let currentLength = -args[1],
                            items = []
                        args.forEach((arg, index) => {
                            if (index >= 2) {
                                items.push(arg)
                                currentLength++
                            }
                        })
                        if (currentLength > 0) {
                            for (let i = 0; i < items.length; i++) {
                                let currentIndex = this.length - items.length + i
                                Data.defineProperty(link, this, currentIndex, this[currentIndex])
                            }
                        }
                    }
                }
                link.viewInit(link)
                return result
            }
        })
    }

    //将data暴露到this中
    dataExpose() {
        for (const key in this.__data__) {
            if (this.__data__.hasOwnProperty(key)) {
                const value = this.__data__[key];
                this[key] = value
            }
        }
    }

    //将methods暴露到this中
    methodsExpose() {
        for (const key in this.__methods__) {
            if (this.__methods__.hasOwnProperty(key)) {
                const value = this.__methods__[key];
                this[key] = value
            }
        }
    }

    //将computed加入data中
    computedExpose() {
        for (const key in this.__computed__) {
            if (this.__computed__.hasOwnProperty(key)) {
                const value = this.__computed__[key];
                this[key] = value
                this.__data__[key] = this[key]()
            }
        }
    }

    //页面刷新
    viewInit(link) {
        link = link || this
        link.__views__.forEach(view => {
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

    //通过dataTypes数组来获取mustache语法表达式的值
    dataTypesGet(link, dataTypes) {
        let value = null
        dataTypes.forEach(dataType => {
            let _value = link.dataGet(link.__data__, dataType.split('.'))
            dataType = isNaN(Number(dataType)) ? dataType : Number(dataType)
            if (value === null || value === undefined) {
                value = _value === undefined ? dataType : (_value || "")
            } else {
                value += _value === undefined ? dataType : (_value || "")
            }
        });
        return value
    }
}

//数据
class Data {
    constructor(link) {
        this.link = link
        this.defineReactive(link.__data__)
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
        data.__ob__ = true
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
            enumerable: typeof (data) === 'object' ? true : false,
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
        this.data = link.__data__
        this.views = link.__views__
        this.nodeTraversal(this.node)
    }

    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    static viewSet(options, link) {
        let exist = false
        link.__views__.forEach(view => {
            if (view.node == options.node && view.type == options.type) {
                exist = true
            }
        })
        if (!exist) {
            link.__views__.push(options)
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
                        eventArr.push(event)
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
        let attr = node.getAttribute('@for'),
            matches = attr.match(/(.+)in(.+)/),
            subType = matches[1].match(/\((.+)\)/),
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
        let newNode = node.cloneNode(),
            thisNode = node
        newNode.innerHTML = node.innerHTML
        thisNode.innerHTML = thisNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)
        if (index) {
            thisNode.setAttribute('index', 0)
        }
        View.viewSet({ node: thisNode, template: dataType, attr: { subType: subType, index: index, length: 1, nodeTemplate: newNode }, type: "node" }, this.link)
    }

    //绑定mustache语法
    mustacheBind(node) {
        const mustaches = this.link.__app__.innerText.match(/(\{\{.+?\}\})/g)
        if (!mustaches) { return }
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
        let data = this.link.__data__,
            attr = node.getAttribute('@link'),
            dataTypes = attr.split('+'),
            value = null
        if (dataTypes.length === 1) {
            value = this.fn.dataGet(this.data, dataTypes[0].split('.'))
        } else {
            dataTypes.forEach(dataType => {
                if (value === null) {
                    value = this.fn.dataGet(data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                } else {
                    value += this.fn.dataGet(data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                }
            })
        }
        if (!value) {
            throw new Error(`${attr} is not defined`)
        }
        //input双向绑定
        if (node.tagName === 'INPUT') {
            node.value = isNaN(Number(value)) ? value : Number(value)
            node.addEventListener('input', () => {
                let _value = node.value,
                    keyArr = attr.split('.')
                keyArr.forEach((key, index) => {
                    if (index === keyArr.length - 1) {
                        data[key] = _value
                    } else {
                        data = data[key]
                    }
                })
            })
        } else {
            node.innerText = value
        }
        View.viewSet({ node: node, template: `{{${attr}}}`, type: 'link' }, this.link)
        node.removeAttribute('@link')
    }

    //绑定@class语法
    classBind(node) {
        View.viewSet({ node: node, template: node.getAttribute('@class'), class: node.getAttribute('class'), type: 'class' }, this.link)
        node.removeAttribute('@class')
    }

    //绑定@style语法
    styleBind(node) {
        template = (node.getAttribute('style') || "") + node.getAttribute('@style')
        View.viewSet({ node: node, template: template, type: 'style' }, this.link)
        node.removeAttribute('@style')
    }

    //绑定events语法
    eventsBind(node, eventArr) {
        let link = this.link
        eventArr.forEach(event => {
            let matches = node.getAttribute(event).match(/(.+)\((.*)\)/)
            if (matches === null) { return }
            let fn = matches[1],
                args = matches[2]
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
                node.addEventListener(event, () => {
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
        link.__views__.forEach(view => {
            if (!(view.template.match(key))) { return }
            if (view.type == 'link' || view.type == 'mustache') {
                this.viewDataChange(link, view)
            } else if (view.type == 'class') {
                this.viewClassChange(link, view)
            } else if (view.type == 'style') {
                this.viewStyleChange(link, view)
            } else if (view.type == 'node') {
                this.viewNodeChange(link, view)
            }

        })
    }

    //改变页面节点
    static viewNodeChange(link, thisView) {
        let proto = link.__proto__,
            data = link.__data__,
            views = link.__views__
        let value = proto.dataGet(data, thisView.template.split('.'))
        while (value.length > thisView.attr.length) {
            //复制节点
            let newNode = thisView.attr.nodeTemplate.cloneNode()
            newNode.innerHTML = thisView.attr.nodeTemplate.innerHTML
            //插入节点
            thisView.node.parentNode.insertBefore(newNode, thisView.node.nextSibling)
            thisView.node = newNode
            //替换模板内容
            thisView.node.innerHTML = thisView.node.innerHTML.replace(`{{${thisView.attr.subType}}}`, `{{${thisView.template}.${thisView.attr.length}}}`)
            if (thisView.attr.index) {
                thisView.node.setAttribute('index', thisView.attr.length)
            }
            thisView.attr.length++
            for (let i = 0; i < views.length; i++) {
                const view = views[i];
                if (view.type == "node") {
                    views.splice(i, 1)
                    i--
                }
            }
            new View(link, thisView.node.parentNode)
            View.viewSet(thisView, link)
        }
        while (value.length < thisView.attr.length) {
            for (let i = 0; i < views.length; i++) {
                const view = views[i];
                if (thisView.node == view.node) {
                    views.splice(i, 1)
                    i--
                }
            }
            let prevNode = thisView.node.previousSibling,
                thisNode = thisView.node
            thisNode.parentNode.removeChild(thisNode)
            thisView.node = prevNode
            thisView.attr.length--
            View.viewSet(thisView, link)
        }
    }

    //改变页面数据
    static viewDataChange(link, thisView) {
        let text = thisView.template,
            mustaches = text.match(/\{\{(.+?)\}\}/g)
        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+'),
                value = link.__proto__.dataTypesGet(link, dataTypes)
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
        let node = thisView.node,
            classArr = thisView.template.split(','),
            className = thisView.class,
            proto = link.__proto__,
            data = link.__data__
        classArr.forEach(cs => {
            let boolean, thisClassName = "",
                matches = cs.split(':')
            if (matches.length === 1) {
                //判断是否为函数
                let fn = cs.match(/(.*)\(.*\)/)
                thisClassName = fn ? link[fn[1]](fn[2]) : proto.dataGet(data, cs.split('.'))
                boolean = thisClassName ? true : false
            } else {
                thisClassName = matches[0].trim()
                let dataType = matches[1].trim(),
                    fn = dataType.match(/(.*)\(.*\)/)
                boolean = fn ? link[fn[1]](fn[2]) : proto.dataGet(data, dataType.split('.'))
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
        let node = thisView.node,
            styleArr = thisView.template.split(';'),
            proto = link.__proto__,
            data = link.__data__
        styleArr.forEach(style => {
            if (style == null || style == undefined || style == "") { return }
            let matches = style.split(':'),
                styleName = matches[0].trim(),
                dataType = matches[1],
                method = dataType.match(/(.*)\(.*\)/)
            //判断是否为函数
            node.style[styleName] = method ? link[method[1]](method[2]) : proto.dataGet(data, dataType.split('.'))
        })
    }
}