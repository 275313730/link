link是一种MVVM框架，包含了三个模块：数据(Data),响应(Respond),视图(View)。
link的工作流程为：
一、创建一个link实例，并传入参数(options)。
二、link实例接受到参数后会劫持数据(Data)，使其响应化(defineProperty)。
三、link实例收集html中与数据相匹配的的节点数据(node)和语法数据(template)，组合成视图(View)。
四、当数据(Data)发生改变时，通知响应模块(Respond)。
五、响应模块收到数据(Data)后会查询视图(View)中的数据并更新。

以简图的形式来表达即：

 new link(options)
        ↓    
    数据(Data)            
    ↑       ↓            
视图(View)←响应(Respond)  
                           

