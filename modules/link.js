"use strict";
class Link {
    constructor(options) {
        this.el = options.el
        this.node = document.getElementById(options.el)
        this.data = (options.data && options.data()) || null
        this.methods = options.methods || null
        this.mounted = options.mounted || null
        this.updated = options.updated || null
        this.beforeDestroy = options.beforeDestroy || null
        this.destroyed = options.destroyed || null
        this.router = options.router || null
        this.components = options.components || null
        this.views = []
        //link是暴露到this中的data和methods
        this.link = {}
        this.link.parent = options.parent || null
        this.init()
    }

    /*
        Common Module
    */

    //初始化
    init() {
        this.arrayReconstruct()
        this.data && this.dataExpose()
        this.data && this.dataTraversal(this.link)
        this.methods && this.methodsExpose()
        this.components && this.componentsExpose()
        this.mounted && this.mounted.call(this.link)
        this.nodeTraversal(this.node)
        this.notify(this)
        if (this.router) {
            this.router.el = this.el
            new Router(this.router)
        }
    }

    //数组方法改写
    arrayReconstruct() {
        let _this = this,
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
                            _this.dataTraversal(this[currentIndex])
                        }
                    } else if (method === 'splice') {
                        let currentLength = -args[1] + args.length - 1
                        for (let i = 0; i < currentLength - 1; i++) {
                            let currentIndex = this.length + i
                            _this.dataTraversal(this[currentIndex])
                        }
                    }
                }
                _this.notify()
                return result
            }
        })
    }

    //将data暴露到this中
    dataExpose() {
        for (const key in this.data) {
            const value = this.data[key];
            this.link[key] = value
        }
    }

    //将methods暴露到this中
    methodsExpose() {
        for (const key in this.methods) {
            const value = this.methods[key];
            this.link[key] = value
        }
    }

    componentsExpose() {
        this.children = []
        this.components.forEach(child => {
            child.parent = this.link
            this.children.push(new Link(child))
        })
        this.link.children = this.children
    }

    //销毁
    destroy() {
        this.beforeDestroy && this.beforeDestroy.call(this.link)
        this.updated = null
        this.node = null
        this.data = null
        this.link = null
        this.methods = null
        this.mounted = null
        this.views = []
        this.beforeDestroy = null
        this.destroyed && this.destroyed.call(this.link)
        this.destroyed = null
    }

    /*
        Data Module
    */

    //遍历data
    dataTraversal(data) {
        for (const key of Object.keys(data)) {
            let value = data[key]
            this.defineProperty(this, data, key, value)
            if (data[key] instanceof Object) {
                if (data[key].length === 0) {
                    data[key].__ob__ = true
                } else {
                    this.dataTraversal(data[key])
                }
            }
        }
    }

    //定义data的setter和getter
    defineProperty(_this, data, key, value) {
        data.__ob__ = true
        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value === newValue) { return }
                value = newValue
                _this.notify(key)
                _this.updated && _this.updated()
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

    //通过dataTypes数组来获取表达式的值
    dataTypesGet(dataTypes) {
        let value = null
        dataTypes.forEach(dataType => {
            let _value = this.dataGet(this.link, dataType.split('.'))
            if (_value == undefined) {
                _value = isNaN(Number(dataType)) ? dataType : Number(dataType)
            }
            value = (value === null || value === undefined) ? _value : value + _value
        })
        return value
    }

    /*
        View Module
    */

    //声明语法事件
    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //声明语法属性
    attributes = ['@for', 'link', '@class', '@style']

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    viewSet(options) {
        //判断节点是否存在
        for (const view of this.views) {
            if (view.node == options.node && view.type == options.type) {
                return
            }
        }
        this.views.push(options)
    }

    //node遍历
    nodeTraversal(node) {
        let childNodes = node.childNodes
        //匹配语法
        for (let child of childNodes) {
            if (child.nodeType === 1) {
                if (this.components) {
                    let id = child.getAttribute('Id')
                    for (const child of this.components) {
                        if (child.el === id) {
                            return
                        }
                    }
                }
                this.normalMatch(child)
                this.eventMatch(child)
            } else if (child.nodeType === 3) {
                this.mustacheBind(child)
            }
            if (child.childNodes != null) {
                this.nodeTraversal(child)
            }
        }
    }

    //匹配基本语法
    normalMatch(child) {
        for (const value of this.attributes) {
            if (child.getAttribute(value)) {
                let _value = value.replace('@', '')
                this[`${_value}Bind`](child)
                return
            }
        }
    }

    //匹配事件语法
    eventMatch(child) {
        this.events.forEach(event => {
            if (child.getAttribute(event) != null) {
                this.eventsBind(child, event)
            }
        })
        if (child.getAttribute('index')) {
            child.removeAttribute('index')
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
        let thisNode = node,
            newNode = node.cloneNode()
        newNode.innerHTML = node.innerHTML
        while (thisNode.innerHTML != thisNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)) {
            thisNode.innerHTML = thisNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)
        }
        if (index) {
            thisNode.setAttribute('index', 0)
        }
        this.viewSet({ node: thisNode, template: dataType, props: { subType: subType, index: index, length: 1, nodeTemplate: newNode }, type: "node" })
    }

    //绑定mustache语法
    mustacheBind(node) {
        let text = node.data,
            mustaches = text.match(/(\{\{.+?\}\})/g)
        if (mustaches === null) { return }
        mustaches.forEach(mustache => {
            if (text.indexOf(mustache) == -1 && text.match(mustache) == null) { return }
            text = this.replaceExpression(text, mustache)
        });
        this.viewSet({ node: node, template: text, type: "mustache" })
    }

    //处理mustache表达式
    replaceExpression(text, mustache) {
        let mathes = mustache.match(/\{\{(.*)\}\}/),
            dataTypes = mathes[1].split('+')
        dataTypes.forEach(dataType => {
            //先分离再结合
            let typeArr = dataType.split('.')
            typeArr.forEach((type, index) => {
                if (type.match(/(.*)\[(\d+)\]/)) {
                    let matches = type.match(/(.*)\[(\d+)\]/)
                    typeArr.splice(index, 1, matches[1], matches[2])
                }
            })
            typeArr = typeArr.join('.')
            text = text.replace(dataType, typeArr)
        })
        return text
    }

    //绑定link语法
    linkBind(node) {
        let data = this.link,
            attr = node.getAttribute("link"),
            dataTypes = attr.split('+'),
            value = null
        if (dataTypes.length === 1) {
            value = this.dataGet(data, dataTypes[0].split('.'))
        } else {
            dataTypes.forEach(dataType => {
                let _value = this.dataGet(data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                value = value === null ? _value : value + _value
            })
        }
        if (value === null || value === undefined) {
            throw new Error(`${attr} is not defined`)
        }
        //判断tagName
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
        this.viewSet({ node: node, template: `{{${attr}}}`, type: "link" })
        node.removeAttribute("link")
    }

    //绑定@class语法
    classBind(node) {
        this.viewSet({
            node: node, template: node.getAttribute('@class'), props: { class: node.getAttribute("class") }, type: "class"
        })
        node.removeAttribute('@class')
    }

    //绑定@style语法
    styleBind(node) {
        this.viewSet({ node: node, template: (node.getAttribute("style") || "") + node.getAttribute('@style'), type: "style" })
        node.removeAttribute('@style')
    }

    //绑定events语法
    eventsBind(node, event) {
        let _this = this.link,
            matches = node.getAttribute(event).match(/(.+)\((.*)\)/),
            fn = matches[1],
            args = matches[2]
        event = event.slice(1)
        //判断传入参数
        if (args.match(/event/)) {
            node.addEventListener(event, function (args) {
                _this[fn](args)
            })
        } else if (args.match(/this/)) {
            node.addEventListener(event, function (args) {
                _this[fn](args.target)
            })
        } else if (args.match(/index/) && node.getAttribute('index')) {
            let index = node.getAttribute('index')
            node.addEventListener(event, function () {
                _this[fn](index)
            })
        } else {
            node.addEventListener(event, () => {
                _this[fn](args)
            })
        }
        node.removeAttribute(`@${event}`)
    }

    /*
        Respond Module
    */

    //通知分发
    notify(key) {
        this.views.forEach(view => {
            if (key && view.template.match(key) == null) { return }
            this[`${view.type}Render`](view)
        })
    }

    //改变页面节点
    nodeRender(thisView) {
        let views = this.views,
            value = this.dataGet(this.link, thisView.template.split('.'))
        while (value.length > thisView.props.length) {
            //复制节点
            let nodeTemplate = thisView.props.nodeTemplate,
                newNode = nodeTemplate.cloneNode()
            newNode.innerHTML = nodeTemplate.innerHTML
            //插入节点
            thisView.node.parentNode.insertBefore(newNode, thisView.node.nextSibling)
            //更新当前节点
            thisView.node = newNode
            //replaceAll
            while (thisView.node.innerHTML != thisView.node.innerHTML.replace(`{{${thisView.props.subType}}}`, `{{${thisView.template}.${thisView.props.length}}}`)
            ) {
                thisView.node.innerHTML = thisView.node.innerHTML.replace(`{{${thisView.props.subType}}}`, `{{${thisView.template}.${thisView.props.length}}}`)
            }
            if (thisView.props.index) {
                thisView.node.setAttribute('index', thisView.props.length)
            }
            thisView.props.length++
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
        while (value.length < thisView.props.length) {
            //解绑视图节点
            for (let i = 0; i < views.length; i++) {
                const view = views[i];
                if (thisView.node == view.node) {
                    views.splice(i, 1)
                    i--
                }
            }
            let prevNode = thisView.node.previousSibling,
                currNode = thisView.node
            currNode.parentNode.removeChild(currNode)
            thisView.node = prevNode
            thisView.props.length--
        }
        this.viewSet(thisView)
        this.updated && this.updated()
    }

    //改变页面mustache
    mustacheRender(thisView) {
        thisView.node.data = this.replaceText(thisView)
    }

    //改变页面link
    linkRender(thisView) {
        if (thisView.node.nodeName === 'INPUT') {
            thisView.node.value = this.replaceText(thisView)
        } else {
            thisView.node.innerText = this.replaceText(thisView)
        }
    }

    //替换语法模板
    replaceText(thisView) {
        let text = thisView.template,
            mustaches = text.match(/\{\{(.+?)\}\}/g)
        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+'),
                value = this.dataTypesGet(dataTypes)
            if (mustache === `{{${value}}}`) {
                text = text.replace(mustache, '')
            } else {
                text = text.replace(mustache, value)
            }
        })
        return text
    }

    //改变页面class
    classRender(thisView) {
        //拆分class
        let classArr = thisView.template.split(','),
            className = thisView.props.class
        classArr.forEach(cs => {
            let boolean,
                thisClassName = "",
                matches = cs.split(':')
            //判断是否为对象语法
            if (matches.length === 1) {
                //判断是否为函数
                let fn = cs.match(/(.*)\(.*\)/)
                thisClassName = fn ? this[fn[1]](fn[2]) : this.dataGet(this.link, cs.split('.'))
                boolean = thisClassName ? true : false
            } else {
                thisClassName = matches[0].trim()
                let dataType = matches[1].trim(),
                    fn = dataType.match(/(.*)\(.*\)/)
                boolean = fn ? this[fn[1]](fn[2]) : this.dataGet(this.link, dataType.split('.'))
            }
            //修改className
            if (boolean) {
                className += ` ${thisClassName}`
            }
        })
        thisView.node.className = className
    }

    //改变页面style
    styleRender(thisView) {
        //拆分style
        let styleArr = thisView.template.split(';')
        styleArr.forEach(style => {
            if (style == null || style == undefined || style == "") { return }
            let matches = style.split(':'),
                styleName = matches[0].trim(),
                dataType = matches[1],
                method = dataType.match(/(.*)\(.*\)/)
            //判断是否为函数
            thisView.node.style[styleName] = method ? this[method[1]](method[2]) : this.dataGet(this.link, dataType.split('.'))
        })
    }
}