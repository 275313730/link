"use strict";
class Link {
    constructor(options) {
        this.__node__ = document.getElementById(options.el)
        this.__template__ = options.template
        this.__data__ = options.data
        this.__methods__ = options.methods
        this.__mounted__ = options.mounted
        this.__updated__ = options.updated
        this.__beforeDestroy__ = options.beforeDestroy
        this.__destroyed__ = options.destroyed
        this.__views__ = []
        this.init()
    }

    //初始化
    init() {
        this.arrayReconstruct()
        this.defineReactive(this.__data__)
        this.dataExpose()
        this.methodsExpose()
        this.__mounted__ && this.__mounted__()
        this.nodeTraversal(this.__node__)
        this.notify(this)
    }

    //销毁
    destroy() {
        this.__beforeDestroy__ && this.__beforeDestroy__()
        this.__updated__ = null
        this.__node__ = null
        this.__data__ = null
        this.__methods__ = null
        this.__mounted__ = null
        this.__views__ = []
        this.__beforeDestroy__ = null
        this.__destroyed__ && this.__destroyed__()
        this.__destroyed__ = null
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
                            link.defineProperty(link, this, currentIndex, this[currentIndex])
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
                                link.defineProperty(link, this, currentIndex, this[currentIndex])
                            }
                        }
                    }
                }
                link.notify(link)
                return result
            }
        })
    }

    //将data暴露到this中
    dataExpose() {
        for (const key in this.__data__) {
            const value = this.__data__[key];
            this[key] = value
        }
    }

    //将methods暴露到this中
    methodsExpose() {
        for (const key in this.__methods__) {
            const value = this.__methods__[key];
            this[key] = value
        }
    }

    /*
        Data Module
     */

    defineReactive(data) {
        for (const key of Object.keys(data)) {
            let value = data[key]
            this.defineProperty(this, data, key, value)
            if (data[key] instanceof Object) {
                this.defineReactive(data[key])
            }
        }
    }

    //link是必须的
    defineProperty(link, data, key, value) {
        data.__ob__ = true
        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value === newValue) { return }
                value = newValue
                link.notify(link, key)
                link.__updated__ && link.__updated__()
            },
            enumerable: typeof (data) === 'object' ? true : false,
            configurable: true,
        })
    }

    //获取data
    dataGet(data, keyArr) {
        keyArr.forEach(key => {
            data = data[key]
        })
        return data
    }

    //通过dataTypes数组来获取mustache语法表达式的值
    dataTypesGet(dataTypes) {
        let value = null
        dataTypes.forEach(dataType => {
            let _value = this.dataGet(this.__data__, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
            value = (value === null || value === undefined) ? _value : value + _value
        })
        return value
    }

    /*
        View Module
    */

    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    viewSet(options) {
        //判断节点是否存在
        for (const view of this.__views__) {
            if (view.node == options.node && view.type == options.type) {
                return
            }
        }
        this.__views__.push(options)
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
                if (child.getAttribute("Link")) {
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
        let matches = node.getAttribute('@for').match(/(.+)in(.+)/),
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
        this.viewSet({ node: thisNode, template: dataType, attr: { subType: subType, index: index, length: 1, nodeTemplate: newNode }, type: "Node" })
    }

    //绑定mustache语法
    mustacheBind(node) {
        const mustaches = this.__node__.innerText.match(/(\{\{.+?\}\})/g)
        if (mustaches === null) { return }
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
            this.viewSet({ node: node, template: data, type: "Mustache" })
        });
    }

    //绑定link语法
    linkBind(node) {
        let data = this.__data__,
            attr = node.getAttribute("Link"),
            dataTypes = attr.split('+'),
            value = null
        if (dataTypes.length === 1) {
            value = this.dataGet(data, dataTypes[0].split('.'))
        } else {
            dataTypes.forEach(dataType => {
                if (value === null) {
                    value = this.dataGet(data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                } else {
                    value += this.dataGet(data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                }
            })
        }
        if (value === null || value === undefined) {
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
        this.viewSet({ node: node, template: `{{${attr}}}`, type: "Link" })
        node.removeAttribute("Link")
    }

    //绑定@class语法
    classBind(node) {
        let className = node.getAttribute("Class")
        this.viewSet({
            node: node, template: node.getAttribute('@class'), attr: { class: className }, type: "Class"
        })
        node.removeAttribute('@class')
    }

    //绑定@style语法
    styleBind(node) {
        let template = (node.getAttribute("Style") || "") + node.getAttribute('@style')
        this.viewSet({ node: node, template: template, type: "Style" })
        node.removeAttribute('@style')
    }

    //绑定events语法
    eventsBind(node, eventArr) {
        let link = this
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

    /*
        Respond Module
    */

    //通知分发
    notify(key) {
        this.__views__.forEach(view => {
            if (view.template.match(key) == null && key) { return }
            this[`view${view.type}Change`](view)
        })
    }

    //改变页面节点
    viewNodeChange(thisView) {
        let proto = this.__proto__,
            data = this.__data__,
            views = this.__views__,
            value = proto.dataGet(data, thisView.template.split('.'))
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
            //更新视图节点
            for (let i = 0; i < views.length; i++) {
                const view = views[i];
                if (view.type == "Node" && view.node == thisView.node) {
                    views.splice(i, 1)
                    i--
                }
            }
            this.nodeTraversal(thisView.node.parentNode)
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
        }
        this.viewSet(thisView)
        this.__updated__ && this.__updated__()
    }

    //改变页面数据
    viewDataChange(thisView) {
        let text = thisView.template,
            mustaches = text.match(/\{\{(.+?)\}\}/g)
        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+'),
                value = this.dataTypesGet(dataTypes)
            if (mustache === value) { return }
            text = text.replace(mustache, value)
        })
        return text
    }

    //改变页面mustache
    viewMustacheChange(thisView) {
        thisView.node.data = this.viewDataChange(thisView)
    }

    //改变页面link
    viewLinkChange(thisView) {
        if (thisView.node.nodeName === 'INPUT') {
            thisView.node.value = this.viewDataChange(thisView)
        } else {
            thisView.node.innerText = this.viewDataChange(thisView)
        }
    }

    //改变页面class
    viewClassChange(thisView) {
        let node = thisView.node,
            classArr = thisView.template.split(','),
            className = thisView.attr.class,
            proto = this.__proto__,
            data = this.__data__
        classArr.forEach(cs => {
            let boolean, thisClassName = "",
                matches = cs.split(':')
            if (matches.length === 1) {
                //判断是否为函数
                let fn = cs.match(/(.*)\(.*\)/)
                thisClassName = fn ? this[fn[1]](fn[2]) : proto.dataGet(data, cs.split('.'))
                boolean = thisClassName ? true : false
            } else {
                thisClassName = matches[0].trim()
                let dataType = matches[1].trim(),
                    fn = dataType.match(/(.*)\(.*\)/)
                boolean = fn ? this[fn[1]](fn[2]) : proto.dataGet(data, dataType.split('.'))
            }
            //修改className
            if (boolean) {
                className += ` ${thisClassName}`
            }
        })
        node.className = className
    }

    //改变页面style
    viewStyleChange(thisView) {
        let node = thisView.node,
            styleArr = thisView.template.split(';'),
            proto = this.__proto__,
            data = this.__data__
        styleArr.forEach(style => {
            if (style == null || style == undefined || style == "") { return }
            let matches = style.split(':'),
                styleName = matches[0].trim(),
                dataType = matches[1],
                method = dataType.match(/(.*)\(.*\)/)
            //判断是否为函数
            node.style[styleName] = method ? this[method[1]](method[2]) : proto.dataGet(data, dataType.split('.'))
        })
    }
}



