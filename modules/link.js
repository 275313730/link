"use strict";
class Link {
    constructor(options) {
        // 重写数组方法
        Link.arrayReconstruct && Link.arrayReconstruct()

        // 检查传参
        this.checkOptions(options)

        // 基础参数
        this.el = options.el || null
        this.node = options.node || document.getElementById(options.el)
        this.template = options.template || null

        // 数据
        this.data = options.data || null
        this.methods = Object.freeze(options.methods) || null

        // 生命钩子函数
        this.mounted = Object.freeze(options.mounted) || null
        this.updated = Object.freeze(options.updated) || null
        this.beforeDestroy = Object.freeze(options.beforeDestroy) || null
        this.destroyed = Object.freeze(options.destroyed) || null

        // 父组件
        this.$parent = options.parent || null

        // 路由
        this.router = options.router || null
        this.alive = options.alive || false
        this.aliveData = options.aliveData || null

        // 初始化
        this.init()
    }

    /*
        Common Module
    */

    // 数组方法改写
    static arrayReconstruct() {
        let arrayProto = Array.prototype,
            arrayMethods = Object.create(arrayProto),
            methodsList = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"]

        methodsList.forEach(method => {
            const original = arrayMethods[method]
            Array.prototype[method] = function (...args) {
                // 用数组原方法处理
                const result = original.apply(this, args)

                // 判读是否$data中的数据
                this.__ob__ && this.notify()

                // 返回值
                return result
            }
        })
        this.arrayReconstruct = null
    }

    // 检查传入参数
    checkOptions(options) {
        if (options.el == null) {
            if (options.template == null) {
                throw new Error(`Property "el" or "template" is not defined`)
            }
        } else if (document.getElementById(options.el) == null) {
            throw new Error(`Can not find element "${options.el}"`)
        }
    }

    // 初始化
    init() {
        // 将数据替换成aliveData(如果存在aliveData)
        this.aliveData && this.dataReplace()

        // 初始化$data
        this.$data = this.data ? this.data() : {}

        // 获取父组件传入的props
        this.$parent && this.propsGet()

        // 给父组件设置ref
        this.$parent && this.refsSet()

        // 遍历$data并定义get和set
        this.$data && this.dataTravel(this.$data)

        // 将methods中的函数加入$data
        this.methods && this.methodsExpose()

        // 判断alive来决定是否执行mounted函数
        !this.alive && this.mounted && this.mounted.call(this.$data)

        // 替换组件标签为模板内容
        this.template && this.replaceCpnHTML()

        // 遍历组件节点并进行view绑定
        this.nodeTravel(this.node)

        // 创建子组件实例
        this.$children && this.createCpns()

        // 传入parent和children组件
        this.$data.$parent = this.$parent
        this.$data.$children = this.$children

        // 传入router
        if (this.router) {
            this.router.el = this.el
            Link.$router = new Router(this.router)
        }

        // 刷新页面
        this.$data && this.notify()

        // 刷新页面后调用一次updated
        this.updated && this.updated.call(this.$data)
    }

    // 销毁
    destroy() {
        // 销毁前
        this.beforeDestroy && this.beforeDestroy.call(this.$data)

        // 销毁views和$data
        this.views = null
        this.$data = null

        // 销毁后
        this.destroyed && this.destroyed.call(this.$data)
    }

    /*
        Data Module
    */

    // propsGet
    propsGet() {
        for (const attr of this.node.attributes) {
            if (attr.name.indexOf('~') > -1) {
                this.$data.props = this.$data.props || {}
                this.$data.props[attr.name.slice(1)] = this.dataGet(this.$parent, attr.value)
            }
        }
    }

    // refsGet
    refsSet() {
        for (const attr of this.node.attributes) {
            if (attr.name === 'ref') {
                this.$parent.$refs = this.$parent.$refs || {}
                this.$parent.$refs[attr.value] = this.$data
            }
        }
    }

    // 将data替换为aliveData
    dataReplace() {
        this.data = function () {
            return this.aliveData.$data
        }
    }

    // 将methods暴露到$data中
    methodsExpose() {
        for (const key in this.methods) {
            const value = this.methods[key];
            this.$data[key] = value
        }
    }

    // 遍历data
    dataTravel(data) {
        for (const key in data) {
            this.defineProperty(this, data, key, data[key])
            if (data[key] instanceof Object) {
                this.dataTravel(data[key])
            }
        }
        data.__ob__ = true
        data.notify = this.notify.bind(this)
    }

    // 定义data的setter和getter
    defineProperty(_this, data, key, value) {
        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value === newValue) { return }
                value = newValue
                _this.notify(key)
            },
            enumerable: typeof (data) === "object" ? true : false,
            configurable: true,
        })
    }

    // 获取data的值
    dataGet(data, key) {
        const keyArr = key.split(".")
        for (const key of keyArr) {
            data = data[key]
            if (data === undefined) {
                return undefined
            }
        }
        return data
    }

    /*
        View Module
    */

    // 声明Dom属性
    attributes = ["each", "link", "$class", "$style"]

    // 替换组件标签内容
    replaceCpnHTML() {
        const newNode = document.createElement('div')
        this.node.parentNode.insertBefore(newNode, this.node)
        newNode.outerHTML = this.template
        this.node = this.node.previousElementSibling
        this.node.parentNode.removeChild(this.node.nextElementSibling)
    }

    // 在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    viewSet(options) {
        this.views = this.views || []
        // 判断节点是否存在
        for (const view of this.views) {
            if (view.node === options.node && view.type === options.type) {
                return
            }
        }
        this.views.push(options)
    }

    // node遍历
    nodeTravel(node) {
        // 匹配语法
        if (node.nodeType === 1) {
            if (Link.components && this.isCpnNode(node)) {
                return
            }
            this.attrMatch(node)
            this.eventMatch(node)
            if (node.childNodes != null) {
                for (let child of node.childNodes) {
                    this.nodeTravel(child)
                }
            }
            // 移除node上的临时属性
            node.removeAttribute("index")
            node.removeAttribute('subType')
            node.removeAttribute('dataType')
        } else if (node.nodeType === 3) {
            this.mustacheBind(node)
        }
    }

    // 匹配标签属性
    attrMatch(node) {
        // 先执行each语法修改页面节点
        if (node.getAttribute("each")) {
            // 判断是否为根节点
            if (node === this.node) {
                throw new Error(`Can't use 'each' in the root element`)
            }
            this.eachBind(node)
        }

        for (const attr of node.attributes) {
            switch (attr.name) {
                case "link":
                    this.linkBind(node, attr.value)
                    break
                case "$class":
                    this.classBind(node, attr.value)
                    break
                case "$style":
                    this.styleBind(node, attr.value)
                    break
                default:
                    attr.name.indexOf('$') > -1 && this.attrBind(node, attr.name, attr.value)
            }
        }
    }

    // 匹配事件语法
    eventMatch(node) {
        for (const attr of node.attributes) {
            if (attr.name.indexOf("@") === -1) { continue }
            this.eventBind(node, attr.name)
            node.removeAttribute(attr.name)
        }
    }

    // 绑定@for语法
    eachBind(node) {
        // 获取@for内容
        let attr = node.getAttribute("each"),
            matches = attr.match(/(.+)of(.+)/),
            subType = matches[1].trim(),
            dataType = matches[2].trim()
        node.removeAttribute("each")

        // 复制一个新的节点
        let newNode = node.cloneNode()
        newNode.innerHTML = node.innerHTML

        // 替换HTML的mustache
        let innerHTML = node.innerHTML
        while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)) {
            innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)
        }
        node.innerHTML = innerHTML

        // 设置临时attr
        node.setAttribute("index", 0)
        node.setAttribute("dataType", dataType)
        node.setAttribute("subType", subType)

        this.viewSet({
            node: node,
            template: dataType,
            props: {
                subType: subType,
                length: 1,
                nodeTemplate: newNode
            },
            type: "each"
        })
    }

    // 绑定mustache语法
    mustacheBind(node) {
        let template = node.data,
            mustaches = template.match(/\{\{(.+?)\}\}/g)
        if (mustaches == null) { return }
        mustaches.forEach(mustache => {
            mustache = mustache.replace('{{', '').replace('}}', '')
            template = template.replace(mustache, this.replaceVarName(node, mustache, 'mustache'))
        })
        this.viewSet({
            node: node,
            template: template,
            type: "mustache"
        })
    }

    // 绑定link语法
    linkBind(node, value) {
        let template = this.replaceVarName(node, value)

        // 判断tagName
        if (node.tagName === "INPUT") {
            let data = this.$data
            node.addEventListener("INPUT", () => {
                let keyArr = template.split(".")
                for (const key in keyArr) {
                    if (key === keyArr.length - 1) {
                        data[key] = node.value
                    } else {
                        data = data[key]
                    }
                }
            })
        }

        this.viewSet({
            node: node,
            template: `{{${template}}}`,
            type: "link"
        })
        node.removeAttribute("link")

    }

    // 绑定$class语法
    classBind(node, value) {
        this.viewSet({
            node: node,
            template: this.replaceVarName(node, value),
            props: {
                class: node.getAttribute("class")
            },
            type: "class"
        })
        node.removeAttribute("$class")
    }

    // 绑定$style语法
    styleBind(node, value) {
        this.viewSet({
            node: node,
            template: (node.getAttribute("style") || "") + this.replaceVarName(node, value),
            type: "style"
        })
        node.removeAttribute("$style")
    }

    // 绑定其他属性
    attrBind(node, name, value) {
        this.viewSet({
            node: node,
            template: this.replaceVarName(node, value),
            type: name.slice(1)
        })
        node.removeAttribute(name)
    }

    // 替换节点属性的变量名
    replaceVarName(node, value, type) {
        if (value == null) { return null }
        if (this.dataGet(this.$data, value) !== undefined) { return value }
        if (type === 'mustache') {
            node = node.parentNode
        }
        while (node !== this.node) {
            let subType = node.getAttribute('subType')
            if (subType && value.indexOf(subType) > -1) {
                let dataType = node.getAttribute('dataType'),
                    index = node.getAttribute('index')
                return value.replace(subType, dataType + '.' + index)
            }
            node = node.parentNode
        }
        throw new Error(`Can not find data '${value}'`)
    }


    // 绑定event语法
    eventBind(node, attr) {
        let _this = this.$data,
            matches = node.getAttribute(attr).match(/(.+)\((.*)\)/),
            fn = matches[1],
            args = matches[2]
        if (!_this[fn]) {
            throw new Error(`'${fn}' is not defined`)
        }
        attr = attr.slice(1)

        // 将传参修改为实际数据
        let argArr = args.split(',')
        if (argArr.indexOf('index') > -1) {
            argArr[argArr.indexOf('index')] = this.getIndex(node)
        }
        node.addEventListener(attr, function () {
            if (argArr.indexOf('this') > -1) {
                argArr[argArr.indexOf('this')] = this
            }
            if (argArr.indexOf('event') > -1) {
                argArr[argArr.indexOf('event')] = event
            }
            _this[fn](...argArr)
        })
    }

    getIndex(node) {
        while (node != this.node) {
            if (node.getAttribute('index')) {
                return node.getAttribute('index')
            }
            node = node.parentNode
        }
        throw new Error(`Can't use 'index' without 'each' grammer`)
    }

    /*
        Respond Module
    */

    // 通知分发
    notify(key) {
        if (this.views == null) { return }
        this.views.forEach(view => {
            if (key != null && view.template.match(key) == null) { return }
            switch (view.type) {
                case "each":
                    this.eachRender(view)
                    break
                case "class":
                    this.classRender(view)
                    break
                case "style":
                    this.styleRender(view)
                    break
                case "link":
                    this.textRender(view)
                    break
                case "mustache":
                    this.textRender(view)
                    break
                default:
                    this.attrRender(view)
            }
            this.updated && this.updated.call(this.$data)
        })
    }

    // 渲染页面节点(each语法)
    eachRender(view) {
        const _this = this
        let value = this.dataGet(this.$data, view.template)
        if (value.length === view.props.length) { return }
        if (value.length > view.props.length) {
            addNode(view, value)
        } else if (value.length < view.props.length) {
            delNode(view, value)
        }
        this.viewSet(view)
        this.notify(view.template)

        // 节点添加
        function addNode(view, value) {
            while (value.length > view.props.length) {
                // 复制节点
                let nodeTemplate = view.props.nodeTemplate,
                    newNode = nodeTemplate.cloneNode()
                newNode.innerHTML = nodeTemplate.innerHTML
                // 插入节点
                if (view.node.nextElementSibling) {
                    view.node.parentNode.insertBefore(newNode, view.node.nextElementSibling)
                } else {
                    view.node.parentNode.appendChild(newNode)
                }
                // 更新当前节点
                view.node = newNode
                replaceNodeHTML(view)
                // 设置attr
                view.node.setAttribute("dataType", view.template)
                view.node.setAttribute("subType", view.props.subType)
                view.node.setAttribute("index", view.props.length)
                view.props.length++
                refreshView(view)
                _this.nodeTravel(view.node)
            }
        }

        // 节点减少
        function delNode(view, value) {
            while (value.length < view.props.length) {
                refreshView(view)
                let prevNode = view.node.previousSibling
                view.node.parentNode.removeChild(view.node)
                view.node = prevNode
                view.props.length--
            }
        }

        // 替换节点内容
        function replaceNodeHTML(view) {
            let innerHTML = view.node.innerHTML,
                subType = view.props.subType,
                length = view.props.length
            while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${view.template}.${length}}}`)
            ) {
                innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${view.template}.${length}}}`)
            }
            view.node.innerHTML = innerHTML
        }

        // 更新视图
        function refreshView(thisView) {
            _this.views = _this.views.filter(view => {
                return view.type !== "each" && view.node !== thisView.node ? true : false
            })
        }
    }

    textRender(view) {
        const _this = this,
            text = replaceText(view)
        if (view.type === "link") {
            if (view.node.nodeName === "INPUT") {
                view.node.value = text
            } else {
                view.node.innerText = text
            }
        } else {
            view.node.data = text
        }

        // 替换模板内容
        function replaceText(view) {
            let text = view.template,
                mustaches = text.match(/\{\{(.+?)\}\}/g)
            mustaches.forEach(mustache => {
                let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split("+"),
                    value = expressionGet(dataTypes)
                if (value == null) {
                    text = text.replace(mustache, '')
                } else {
                    text = text.replace(mustache, value)
                }
            })
            return text
        }

        // 获取表达式的值
        function expressionGet(keys) {
            let value = null
            keys.forEach(key => {
                let _value = _this.dataGet(_this.$data, key)
                if (_value === undefined) {
                    _value = isNaN(Number(key)) ? key : Number(key)
                }
                value = (value == null) ? _value : value + _value
            })
            return value
        }
    }

    // 渲染页面class
    classRender(view) {
        const _this = this
        //拆分class
        let classArr = view.template.split(","),
            className = view.props.class
        classArr.forEach(cs => {
            let { thisClassName, boolean } = getClass(cs)
            //修改className
            if (boolean) {
                className += ` ${thisClassName}`
            }
        })
        view.node.className = className

        // 获取$class的值
        function getClass(cs) {
            let boolean,
                thisClassName = "",
                matches = cs.split(":")
            // 判断是否为对象语法
            // 对象语法的key=className,value=boolean
            // 非对象语法直接获取变量值作为className,boolean根据className取值
            if (matches.length === 1) {
                // 判断是否为函数
                let fn = cs.match(/(.*)\(.*\)/)
                thisClassName = fn ? _this[fn[1]](fn[2]) : _this.dataGet(_this.$data, cs)
                boolean = thisClassName ? true : false
            } else {
                thisClassName = matches[0].trim()
                let dataType = matches[1].trim(),
                    fn = dataType.match(/(.*)\(.*\)/)
                boolean = fn ? _this[fn[1]](fn[2]) : _this.dataGet(_this.$data, dataType)
            }
            return { thisClassName, boolean }
        }
    }

    // 渲染页面style
    styleRender(view) {
        // 拆分style
        let styleArr = view.template.split(";")
        styleArr.forEach(style => {
            if (style == null || style === "") { return }
            let matches = style.split(":"),
                styleName = matches[0].trim(),
                dataType = matches[1],
                fn = dataType.match(/(.*)\(.*\)/)
            // 判断是否为函数
            view.node.style[styleName] = fn ? this[fn[1]](fn[2]) : this.dataGet(this.$data, dataType)
        })
    }

    // 
    attrRender(view) {
        let attr = view.template,
            fn = attr.match(/(.*)\(.*\)/)
        view.node[view.type] = fn ? this[fn[1]](fn[2]) : this.dataGet(this.$data, attr)
    }

    /*
        Component Module
    */

    // 注册组件
    static component(options) {
        Link.components = Link.components || []
        let node = options.template
        if (node instanceof Object) {
            if (node == null) {
                throw new Error(`Can"t find template '${options.template}"`)
            }
            options.template = node.innerHTML
            node.parentNode.removeChild(node)
        }
        Link.components.push(options)
    }

    // 检查是否为Component
    isCpnNode(child) {
        const tagName = child.tagName.toLowerCase()
        for (const cpn of Link.components) {
            if (cpn.name === tagName) {
                this.addCpn(cpn, child)
                return true
            }
        }
        return false
    }

    // 添加子组件
    addCpn(component, child) {
        this.$children = this.$children || []
        let newCpn = Object.assign({}, component)
        newCpn.parent = this.$data
        newCpn.node = child
        if (this.aliveData && this.aliveData.$children) {
            newCpn.alive = true
            newCpn.aliveData = this.aliveData.$children[0]
            this.aliveData.$children.shift()
        }
        this.$children.push(newCpn)
    }

    // 创建子组件
    createCpns() {
        for (const key in this.$children) {
            this.$children[key] = new Link(this.$children[key])
        }
    }
}