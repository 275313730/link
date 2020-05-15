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
        const arrayProto = Array.prototype
        const arrayMethods = Object.create(arrayProto)
        const methodsList = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"]

        methodsList.forEach(method => {
            const original = arrayMethods[method]
            Array.prototype[method] = function (...args) {
                // 用数组原方法处理
                const result = original.apply(this, args)

                // 重新响应化数据
                if (this.__ob__ && (method === 'push' || method === 'unshift' || method === 'splice')) {
                    this.dataTravel(this)
                }

                // 判读是否$data中的数据
                this.__ob__ && this.notify()

                // 返回值
                return result
            }
        })

        delete this.arrayReconstruct
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

        delete this.init
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

    // 获取父组件传值
    propsGet() {
        for (const attr of this.node.attributes) {
            if (attr.name.indexOf('~') > -1) {
                this.$data.props = this.$data.props || {}
                this.$data.props[attr.name.slice(1)] = this.dataGet(this.$parent, attr.value)
            }
        }
    }

    // 获取子组件引用值
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
            this.defineProperty(data, key, data[key])
            if (data[key] instanceof Object) {
                this.dataTravel(data[key])
            }
        }

        // 给data添加ob属性
        data.__ob__ = true

        // 给数组添加通知和遍历方法
        if (data instanceof Array) {
            data.notify = this.notify.bind(this)
            data.dataTravel = this.dataTravel.bind(this)
        }
    }

    // 定义data的setter和getter
    defineProperty(data, key, value) {
        const _this = this

        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value === newValue) { return }
                value = newValue
                if (newValue instanceof Object) {
                    _this.dataTravel(newValue)
                }
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
    viewAdd(options) {
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
            // 判断是否子组件
            if (Link.components && this.isCpnNode(node)) {
                return
            }

            // 属性匹配
            this.attrMatch(node)

            // 事件匹配
            this.eventMatch(node)

            // 遍历子节点
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
            // mustache语法绑定
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

        // 遍历节点属性
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
            if (attr.name.indexOf("@") > -1) {
                this.eventBind(node, attr.name)
                node.removeAttribute(attr.name)
            }
        }
    }

    // 绑定each语法
    eachBind(node) {
        // 获取语法内容
        let attr = node.getAttribute("each"),
            matches = attr.match(/(.+)of(.+)/),
            subType = matches[1].trim(),
            dataType = matches[2].trim()
        node.removeAttribute("each")

        // 复制一个新的节点
        let newNode = node.cloneNode(true)

        // 替换HTML的mustache
        let innerHTML = node.innerHTML
        while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)) {
            innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)
        }
        node.innerHTML = innerHTML

        // 设置临时属性
        node.setAttribute("index", 0)
        node.setAttribute("dataType", dataType)
        node.setAttribute("subType", subType)

        // 添加到视图中
        this.viewAdd({
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
        let template = node.data
        const mustaches = template.match(/\{\{(.+?)\}\}/g)
        if (mustaches == null) { return }

        // 遍历mustaches
        mustaches.forEach(mustache => {
            mustache = mustache.replace('{{', '').replace('}}', '')
            template = template.replace(mustache, this.replaceVarName(node, mustache, 'mustache'))
        })

        // 添加到视图中
        this.viewAdd({
            node: node,
            template: template,
            type: "mustache"
        })
    }

    // 绑定link语法
    linkBind(node, value) {
        let template = this.replaceVarName(node, value)

        // input双向绑定
        if (node.tagName === "INPUT") {
            let data = this.$data

            // 监听input事件
            node.addEventListener("input", () => {
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

        // 添加到视图中
        this.viewAdd({
            node: node,
            template: `{{${template}}}`,
            type: "link"
        })

        // 移除节点属性
        node.removeAttribute("link")
    }

    // 绑定$class语法
    classBind(node, value) {
        // 添加到视图中
        this.viewAdd({
            node: node,
            template: this.replaceVarName(node, value),
            props: {
                class: node.getAttribute("class")
            },
            type: "class"
        })

        // 移除节点属性
        node.removeAttribute("$class")
    }

    // 绑定$style语法
    styleBind(node, value) {
        // 添加到视图中
        this.viewAdd({
            node: node,
            template: (node.getAttribute("style") || "") + this.replaceVarName(node, value),
            type: "style"
        })

        // 移除节点属性
        node.removeAttribute("$style")
    }

    // 绑定其他属性
    attrBind(node, name, value) {
        // 添加到视图中
        this.viewAdd({
            node: node,
            template: this.replaceVarName(node, value),
            type: name.slice(1)
        })

        // 移除节点属性
        node.removeAttribute(name)
    }

    // 替换节点属性的变量名
    replaceVarName(node, value, type) {
        // 如果值为null返回null
        if (value == null) { return null }

        // 如果存在变量则返回获取的值
        if (this.dataGet(this.$data, value) !== undefined) { return value }

        // 如果是mustache语法将节点改变为父节点(因为mustache语法是在textnode上)
        if (type === 'mustache') {
            node = node.parentNode
        }

        // 向上寻找each语法添加的临时属性
        while (node !== this.node) {
            const subType = node.getAttribute('subType')
            const dataType = node.getAttribute('dataType')
            const index = node.getAttribute('index')

            if (subType && value.indexOf(subType) > -1) {
                // 替换变量名
                value = value.replace(subType, dataType + '.' + index)

                // 替换后存在变量则返回值，不存在则继续往上查找(多层each)
                if (this.dataGet(this.$data, value) !== undefined) {
                    return value
                }
            }

            node = node.parentNode
        }

        throw new Error(`Can not find data '${value}'`)
    }


    // 绑定event语法
    eventBind(node, attr) {
        const _this = this.$data
        const matches = node.getAttribute(attr).match(/(.+)\((.*)\)/)
        const [_, fn, args] = matches

        // 判断是否存在方法
        if (!_this[fn]) {
            throw new Error(`'${fn}' is not defined`)
        }

        // 去除前缀@
        attr = attr.slice(1)

        // 分隔传参
        let argArr = args.split(',')

        // 判断是否传入index
        if (argArr.indexOf('index') > -1) {
            argArr[argArr.indexOf('index')] = this.getIndex(node)
        }

        // 监听事件
        node.addEventListener(attr, function () {
            // 判断是否传入this
            if (argArr.indexOf('this') > -1) {
                argArr[argArr.indexOf('this')] = this
            }

            // 判断是否传入event
            if (argArr.indexOf('event') > -1) {
                argArr[argArr.indexOf('event')] = event
            }

            // 执行方法
            _this[fn](...argArr)
        })
    }

    // 获取索引
    getIndex(node) {
        // 向上寻找each语法添加的index
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
            // 存在键名但没有匹配键名的模板时返回
            if (key != null && view.template.match(key) == null) { return }

            // 根据视图类型渲染
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

            // 视图改变后触发updated钩子函数
            this.updated && this.updated.call(this.$data)
        })
    }

    // 渲染页面节点(each语法)
    eachRender(view) {
        const _this = this
        const value = this.dataGet(this.$data, view.template)

        // 如果数组长度没有变化则不修改节点
        if (value.length === view.props.length) { return }

        // 根据数组长度变化增减节点
        if (value.length > view.props.length) {
            addNode(view, value)
        } else if (value.length < view.props.length) {
            delNode(view, value)
        }

        this.viewAdd(view)
        this.notify(view.template)

        // 节点添加
        function addNode(view, value) {
            while (value.length > view.props.length) {
                // 复制节点
                let nodeTemplate = view.props.nodeTemplate
                let newNode = nodeTemplate.cloneNode(true)

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

                // 刷新视图并遍历新增节点的子节点
                refreshView(view)
                _this.nodeTravel(view.node)
            }
        }

        // 节点减少
        function delNode(view, value) {
            while (value.length < view.props.length) {
                // 删减节点
                let prevNode = view.node.previousSibling
                view.node.parentNode.removeChild(view.node)
                view.node = prevNode
                view.props.length--

                // 刷新视图
                refreshView(view)
            }
        }

        // 替换节点内容
        function replaceNodeHTML(view) {
            let innerHTML = view.node.innerHTML
            const subType = view.props.subType
            const length = view.props.length

            // 替换节点中的mustache语法
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
        const _this = this
        const text = replaceText(view)

        // 判断视图类型
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
            let text = view.template
            const mustaches = text.match(/\{\{(.+?)\}\}/g)

            mustaches.forEach(mustache => {
                const dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split("+")
                const value = expressionGet(dataTypes)

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
        let classArr = view.template.split(",")
        let className = view.props.class

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
            let boolean
            let thisClassName = ""
            const matches = cs.split(":")

            // 判断是否为对象语法
            // 对象语法的key=className,value=boolean
            // 非对象语法直接获取变量值作为className,boolean根据className取值
            if (matches.length === 1) {
                // 判断是否为函数
                const fn = cs.match(/(.*)\(.*\)/)

                thisClassName = fn ? _this[fn[1]](fn[2]) : _this.dataGet(_this.$data, cs)
                boolean = thisClassName ? true : false
            } else {
                const dataType = matches[1].trim()
                const fn = dataType.match(/(.*)\(.*\)/)
                
                thisClassName = matches[0].trim()
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
            // style为null或空字符串则返回
            if (style == null || style === "") { return }

            const matches = style.split(":")
            const styleName = matches[0].trim()
            const dataType = matches[1]
            const fn = dataType.match(/(.*)\(.*\)/)

            // 判断是否为函数
            view.node.style[styleName] = fn ? this[fn[1]](fn[2]) : this.dataGet(this.$data, dataType)
        })
    }

    // 
    attrRender(view) {
        const attr = view.template
        const fn = attr.match(/(.*)\(.*\)/)

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
    addCpn(component, childNode) {
        // 初始化子组件
        this.$children = this.$children || []

        // 创建新子组件
        let newCpn = Object.assign({}, component)

        // 绑定组件关系
        newCpn.parent = this.$data
        newCpn.node = childNode

        // router的alive功能
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