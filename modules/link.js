"use strict";
class Link {
    constructor(options) {
        //检查传参
        this.checkOptions(options)

        //基础参数
        this.el = options.el || null
        this.node = options.node || document.getElementById(options.el)
        this.template = options.template || null

        //数据
        this.data = options.data || null
        this.methods = Object.freeze(options.methods) || null

        //生命钩子函数
        this.mounted = Object.freeze(options.mounted) || null
        this.updated = Object.freeze(options.updated) || null
        this.beforeDestroy = Object.freeze(options.beforeDestroy) || null
        this.destroyed = Object.freeze(options.destroyed) || null

        //组件
        this.components = options.components || null
        this.$parent = options.parent || null
        this.$children = []

        //$data是暴露到methods中的属性，包含data和methods
        this.$data = {}
        
        //视图
        this.views = []

        //路由
        this.router = options.router || null
        this.alive = options.alive || false
        this.aliveData = options.aliveData || null

        //初始化
        this.init()
    }

    /*
        Common Module
    */

    //检查传入参数
    checkOptions(options) {
        if (options.el == null) {
            if (options.template == null) {
                throw new Error(`Property 'el' or 'template' is not defined`)
            }
        } else if (document.getElementById(options.el) == null) {
            throw new Error(`Can not find element '${options.el}'`)
        }
    }

    //初始化
    init() {
        //重写数组方法
        this.arrayReconstruct()
        //替换组件标签为模板内容
        this.template && this.replaceCpnHTML()
        //将数据替换成aliveData(如果存在aliveData)
        this.aliveData && this.dataReplace()
        //执行data函数，将数据加入$data
        if (this.data) { this.$data = this.data() }
        //遍历$data并defineProperty
        this.$data && this.dataTraversal(this.$data)
        //将methods中的函数加入$data
        this.methods && this.methodsExpose()
        //判断组件是否alive来决定是否执行mounted函数
        this.alive === false && this.mounted && this.mounted.call(this.$data)
        //遍历组件节点并进行view绑定
        this.nodeTraversal(this.node)
        //将$parent和$children传入$data
        this.$data.$parent = this.$parent
        this.$data.$children = this.$children
        //刷新页面
        this.notify(this)
        //刷新页面后调用一次updated
        this.updated && this.updated.call(this.$data)
        //传入router
        this.router && new Router(Object.assign(this.router, { el: this.el }))
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
                    _this.dataTraversal(this)
                }
                _this.notify()
                return result
            }
        })
    }

    //销毁
    destroy() {
        this.beforeDestroy && this.beforeDestroy.call(this.$data)
        this.mounted = null
        this.updated = null
        this.beforeDestroy = null
        this.node = null
        this.data = null
        this.$data = null
        this.methods = null
        this.views = []
        this.destroyed && this.destroyed.call(this.$data)
        this.destroyed = null
    }

    /*
        Data Module
    */

    //将data替换为aliveData
    dataReplace() {
        this.data = function () {
            return this.aliveData.$data
        }
    }

    //将methods暴露到$data中
    methodsExpose() {
        for (const key in this.methods) {
            const value = this.methods[key];
            this.$data[key] = value
        }
    }

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
            let _value = this.dataGet(this.$data, dataType.split('.'))
            if (_value === undefined) {
                _value = isNaN(Number(dataType)) ? dataType : Number(dataType)
            }
            value = (value == null) ? _value : value + _value
        })
        return value
    }

    /*
        View Module
    */

    //声明语法事件
    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //声明语法属性
    attributes = ['@for', '@link', '@class', '@style']

    //替换组件标签内容
    replaceCpnHTML() {
        let prev = this.node.previousSibling
        this.node.outerHTML = this.template
        this.node = prev.nextElementSibling
    }

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    viewSet(options) {
        //判断节点是否存在
        for (const view of this.views) {
            if (view.node === options.node && view.type === options.type) {
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
                if (this.isCpnNode(child)) {
                    continue
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
                switch (value) {
                    case '@link':
                        this.linkBind(child)
                        return
                    case '@class':
                        this.classBind(child)
                        return
                    case '@style':
                        this.styleBind(child)
                        return
                    case '@for':
                        this.forBind(child)
                        return
                }
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
            hasIndex = false
        //判断左侧内容是否包含多个参数
        if (subType) {
            subType = subType[1].split(',')[0].trim()
            hasIndex = true
        } else {
            subType = matches[1].trim()
        }
        node.removeAttribute('@for')
        //复制一个新的节点
        let thisNode = node,
            newNode = node.cloneNode(),
            innerHTML = thisNode.innerHTML
        newNode.innerHTML = node.innerHTML
        while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)) {
            innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)
        }
        thisNode.innerHTML = innerHTML
        if (hasIndex) {
            thisNode.setAttribute('index', 0)
        }
        this.viewSet({ node: thisNode, template: dataType, props: { subType: subType, hasIndex: hasIndex, length: 1, nodeTemplate: newNode }, type: "for" })
    }

    //绑定mustache语法
    mustacheBind(node) {
        let text = node.data,
            mustaches = text.match(/(\{\{.+?\}\})/g)
        if (mustaches == null) { return }
        mustaches.forEach(mustache => {
            if (text.indexOf(mustache) === -1 && text.match(mustache) == null) { return }
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
        let data = this.$data,
            attr = node.getAttribute("@link"),
            dataTypes = attr.split('+'),
            value = null
        if (dataTypes.length === 1) {
            value = this.dataGet(data, dataTypes[0].split('.'))
        } else {
            dataTypes.forEach(dataType => {
                let _value = this.dataGet(data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                value = value == null ? _value : value + _value
            })
        }
        if (value == null) {
            throw new Error(`${attr} is not defined`)
        }
        //判断tagName
        if (node.tagName === 'INPUT') {
            this.inputBind(node)
        } else {
            node.innerText = value
        }
        this.viewSet({ node: node, template: `{{${attr}}}`, type: "link" })
        node.removeAttribute("@link")
    }

    //input双向绑定
    inputBind(node) {
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
        this.eventListen(node, event)
        node.removeAttribute(event)
    }

    //添加监听事件
    eventListen(node, event) {
        let _this = this.$data,
            matches = node.getAttribute(event).match(/(.+)\((.*)\)/),
            fn = matches[1],
            args = matches[2]
        if (!_this[fn]) {
            throw new Error(`Method ${fn} is not defined`)
        }
        event = event.slice(1)
        //判断传入参数
        if (args.match(/event/)) {
            node.addEventListener(event, function (args) {
                _this[fn](args)
            })
        } else if (args.match(/index/) && node.getAttribute('index')) {
            let index = node.getAttribute('index')
            args = args.replace('index', index)
            node.addEventListener(event, function () {
                _this[fn](args)
            })
        } else {
            node.addEventListener(event, () => {
                _this[fn](args)
            })
        }
    }

    /*
        Respond Module
    */

    //通知分发
    notify(key) {
        this.views.forEach(view => {
            if (key == null && view.template.match(key) == null) { return }
            switch (view.type) {
                case 'for':
                    this.forRender(view)
                    return
                case 'class':
                    this.classRender(view)
                    return
                case 'style':
                    this.styleRender(view)
                    return
                case 'link':
                    this.linkRender(view)
                    return
                case 'mustache':
                    this.mustacheRender(view)
                    return
            }
        })
    }

    //渲染页面节点(for语法)
    forRender(thisView) {
        let value = this.dataGet(this.$data, thisView.template.split('.'))
        if (value.length > thisView.props.length) {
            this.addNode(thisView, value)
        } else if (value.length < thisView.props.length) {
            this.delNode(thisView, value)
        }
        this.viewSet(thisView)
        this.updated && this.updated()
    }

    //节点添加
    addNode(thisView, value) {
        while (value.length > thisView.props.length) {
            //复制节点
            let nodeTemplate = thisView.props.nodeTemplate,
                newNode = nodeTemplate.cloneNode()
            newNode.innerHTML = nodeTemplate.innerHTML
            //插入节点
            thisView.node.parentNode.insertBefore(newNode, thisView.node.nextSibling)
            //更新当前节点
            thisView.node = newNode
            this.replaceHTML(thisView)
            //设置index
            if (thisView.props.hasIndex) {
                thisView.node.setAttribute('index', thisView.props.length)
            }
            thisView.props.length++
            this.refreshNode(thisView)
            this.nodeTraversal(thisView.node.parentNode)
        }
    }

    //替换页面内容
    replaceHTML(thisView) {
        let innerHTML = thisView.node.innerHTML,
            subType = thisView.props.subType,
            length = thisView.props.length
        while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${thisView.template}.${length}}}`)
        ) {
            innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${thisView.template}.${length}}}`)
        }
        thisView.node.innerHTML = innerHTML
    }

    //节点减少
    delNode(thisView, value) {
        while (value.length < thisView.props.length) {
            this.refreshNode(thisView)
            let prevNode = thisView.node.previousSibling
            thisView.node.parentNode.removeChild(thisView.node)
            thisView.node = prevNode
            thisView.props.length--
        }
    }

    //更新视图节点
    refreshNode(thisView) {
        this.views = this.views.filter(view => {
            return view.type === 'for' && view.node === thisView.node ? true : false
        })
    }

    //渲染页面mustache
    mustacheRender(thisView) {
        thisView.node.data = this.replaceText(thisView)
    }

    //渲染页面link
    linkRender(thisView) {
        if (thisView.node.nodeName === 'INPUT') {
            thisView.node.value = this.replaceText(thisView)
        } else {
            thisView.node.innerText = this.replaceText(thisView)
        }
    }

    //替换模板内容
    replaceText(thisView) {
        let text = thisView.template,
            mustaches = text.match(/\{\{(.+?)\}\}/g)
        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+'),
                value = this.dataTypesGet(dataTypes)
            if (value == null) {
                text = text.replace(mustache, '')
            } else {
                text = text.replace(mustache, value)
            }
        })
        return text
    }

    //渲染页面class
    classRender(thisView) {
        //拆分class
        let classArr = thisView.template.split(','),
            className = thisView.props.class
        classArr.forEach(cs => {
            let { thisClassName, boolean } = this.getClass(cs)
            //修改className
            if (boolean) {
                className += ` ${thisClassName}`
            }
        })
        thisView.node.className = className
    }

    //获取@class语法的值
    getClass(cs) {
        let boolean,
            thisClassName = "",
            matches = cs.split(':')
        //判断是否为对象语法
        //对象语法的key=className,value=boolean
        //非对象语法直接获取变量值作为className,boolean根据className取值
        if (matches.length === 1) {
            //判断是否为函数
            let fn = cs.match(/(.*)\(.*\)/)
            thisClassName = fn ? this[fn[1]](fn[2]) : this.dataGet(this.$data, cs.split('.'))
            boolean = thisClassName ? true : false
        } else {
            thisClassName = matches[0].trim()
            let dataType = matches[1].trim(),
                fn = dataType.match(/(.*)\(.*\)/)
            boolean = fn ? this[fn[1]](fn[2]) : this.dataGet(this.$data, dataType.split('.'))
        }
        return { thisClassName, boolean }
    }

    //渲染页面style
    styleRender(thisView) {
        //拆分style
        let styleArr = thisView.template.split(';')
        styleArr.forEach(style => {
            if (style == null || style === "") { return }
            let matches = style.split(':'),
                styleName = matches[0].trim(),
                dataType = matches[1],
                fn = dataType.match(/(.*)\(.*\)/)
            //判断是否为函数
            thisView.node.style[styleName] = fn ? this[fn[1]](fn[2]) : this.dataGet(this.$data, dataType.split('.'))
        })
    }

    /*
        Component Module
    */

    //注册组件
    static component(options) {
        let node = document.getElementById(options.template)
        if (node == null) {
            throw new Error(`Can't find template '${options.template}'`)
        }
        options.template = node.innerHTML
        node.parentNode.removeChild(node)
        Link.components.push(options)
    }

    //检查是否为子组件
    isCpnNode(child) {
        const tagName = child.tagName.toLowerCase()
        for (const cpn of Link.components) {
            if (cpn.name === tagName) {
                this.newCpn(cpn, child)
                return true
            }
        }
        return false
    }

    //创建子组件实例
    newCpn(component, child) {
        let newCpn = Object.assign({}, component)
        newCpn.parent = this
        newCpn.node = child
        if (this.aliveData && this.aliveData.$children) {
            newCpn.aliveData = this.aliveData.$children[0]
            this.aliveData.$children.splice(0, 1)
        }
        this.$children.push(new Link(newCpn))
    }

}

Link.components = []
Link.$store = {}