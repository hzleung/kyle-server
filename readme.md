# kyle-boot

NodeJs 服务端框架，基于 typescript 5.6 开发，使用最新版装饰器封装，默认基于 Express 4.26

### 开发进度

- [x] 读取配置信息，合并根据运行环境配置信息
- [x] 基本路由监听，参数读取封装
- [x] 模块注入，完成 AppRequest
- [ ] 配置参数通过命令初始化模板
- [ ] 数据库连接，Mysql
- [x] 请求参数校验，使用 Json Schema 方式定义
- [ ] Session 数据保存
- [ ] 全局数据共享
- [ ] 单个请求数据共享
- [ ] Session 数据共享
- [ ] 文件上传保存
- [x] 跨域请求检查
- [ ] 请求转发
- [ ] 模拟消息队列处理
- [ ] 并发请求处理
- [ ] 新增注解给路由加注释，并生成文档
- [x] Json 转 Typescript 类型

#### 命令行参数

|    参数    | 说明         |
| :--------: | :----------- |
|  APP_ENV   | 运行环境     |
| configPath | 配置文件路径 |

#### 配置参数

```yaml
Server:
  port: 8001
  host: 0.0.0.0
  publicKey: 5e7692707c144a33
  staticPath: "./stub"
  staticRoute: "/public"
  uploadPath: "./stub/res"
  tempPath: "./stub/temp"
  otherPath: "/Users/mnt/api"
Log:
  level: info
  savePath: "./logs"
Session:
  enabled: true
  timeout: 120000
Email:
  pop3: pop3.163.com,
  smtp: smtp.163.com
  user: kyle@163.com
  accessKey: 123456
```

#### 装饰器

| 装饰器          | 功能              | 特殊说明                                                                                                                                                                                       |
| --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BootApplication | 装载启动类        | 标识启动类，将在启动类装载运行所需配置信息                                                                                                                                                     |
| Config          | 装载配置文件信息  | 此装饰器必须在启动类使用                                                                                                                                                                       |
| GetConfig       | 获取配置信息      | 获取系统配置信息，示例：`@GetConfig("Server", "host")`                                                                                                                                         |
| AppService      | 装载 Service 模块 | 装载的类在一个 application 中只会初始化一次，并在服务停止时销毁                                                                                                                                |
| AppRequest      | Request 类模块    | 一个请求初始化一次，在请求结束时销毁                                                                                                                                                           |
| AppModel        | 模块注入          | 类装饰器，注入模块系统自动初始化模块， 示例：`@AppModel([ TestModel1, TestModel2 ])`, 在 constructor 接收初始化对象，`constructor(private model1: TestModel1, private model2: TestModel2)) {}` |
| RequestMapping  | 定义路由          | 定义路由，示例 ：`@RequestMapping("/example", "GET")`                                                                                                                                          |
| Get             | 定义 Get 路由     | Get 路由，示例：`@Get("/example")`                                                                                                                                                             |
| Post            | 定义 POST 路由    | Post 路由，示例：`@POST("/example")`                                                                                                                                                           |
| GetParam        | 获取请求参数      | 此装饰器必须在定义路由装饰器之后使用， 详细用法参考：[使用教程](/doc/GetParam "点击跳转到详细教程")                                                                                            |

#### 扩展模块

- Email, 发送邮件模块
