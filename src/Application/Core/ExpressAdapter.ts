import { Adapter } from "./Adapter";
import utils from "../../utils/utils";
import express, { Express, Response, Request } from "express";
import path from "path";
import lodash from "lodash";
import { createRequestRoutes, IDefineRequestParam, IDefineRoute } from "../Request/Annotation";
import { Log } from "./Log";
import { GLOBAL_KEY_SESSION_ID_KEY } from "../../data/constants";
import { createInstanceInApp } from "../../Annotation/createInstance";
import { CrossOrigin } from "./CrossOrigin";

export class ExpressAdapter extends Adapter {

    private app: Express;
    constructor() {
        super();
        this.app = express();
    }
    public listen(log: Log) {
        const serverConfig = this.configuration?.Server;
        const rootPath = (this.configuration as any).rootPath;
        const staticPath = path.resolve(rootPath, serverConfig?.staticPath);
        if (!serverConfig) {
            throw new Error("未正确加载配置信息！");
        }
        if (utils.isEmpty(serverConfig?.staticRoute)) {
            this.app.use(express.static(serverConfig.staticPath));
        } else {
            this.app.use(serverConfig?.staticRoute, express.static(serverConfig.staticPath));
        }
        if (utils.isEmpty(serverConfig.staticRoute)) {
            this.app.use(express.static(staticPath));
            log.info(`Static resource, path: ${staticPath}`);
        } else {
            this.app.use(serverConfig.staticRoute, express.static(staticPath));
            log.info(`Static resource, path: ${staticPath}, static route: ${serverConfig.staticRoute}`);
        }
        this.app.on("error", (err) => {
            this.emit("error", err);
        });
        this.app.on("close", () => {
            this.emit("close");
        });
        this.app.on("ready", () => {
            this.emit("ready");
        });
        this.app.listen(serverConfig.port, serverConfig.host, () => {
            this.emit("ready", `http://${serverConfig.host}:${serverConfig.port}`);
        });
    }
    get(url: string, handler: Function): void {
        this.app.get(url, handler as any);
    }
    post(url: string, handler: Function): void {
        this.app.post(url, handler as any);
    }
    use(handler: Function): void {
        this.app.use(handler as any);
    }
    options(url: string, handler: Function): void {
        this.app.options(url, handler as any);
    }
    delete(url: string, handler: Function): void {
        this.app.delete(url, handler as any);
    }
    put(url: string, handler: Function): void {
        this.app.put(url, handler as any);
    }
    getParam(opt: IDefineRequestParam[], route: IDefineRoute, req: Request, res: Response): any[] {
        const params: any[] = [];
        opt.forEach((item) => {
            switch (item.type) {
                case 'PathParam': {
                    const fieldId = item.args?.toString();
                    params.push(fieldId && this.getPathParam(route, req, fieldId));
                    break;
                }
                case 'Body': {
                    const fieldNames = item.args;
                    params.push(this.getRequestBody(req, fieldNames));
                    break;
                }
                case "QueryParam": {
                    params.push(this.getQueryParams(req, item.args));
                    break;
                }
                case "Header": {
                    params.push(this.getHeaders(req, item.args));
                    break;
                }
                case "Cookie": {
                    params.push(this.getCookies(req, item.args));
                    break;
                }
                case "Request": {
                    params.push(req);
                    break;
                }
                case "Response": {
                    params.push(res);
                    break;
                }
                case "SessionId": {
                    const SSIDKey = this.configuration.Session?.sessionIdKey || GLOBAL_KEY_SESSION_ID_KEY;
                    let saveSSID = this.getCookies(req, SSIDKey);
                    if (utils.isEmpty(saveSSID)) {
                        const oldSessionId = this.getCookies(req, SSIDKey);
                        if (utils.isEmpty(oldSessionId)) {
                            const newSessionId = utils.md5(`session_${utils.uuid()}_${Date.now()}`);
                            res.cookie(SSIDKey, newSessionId, {
                                "httpOnly": true,
                                "secure": true,
                                "path": "/",
                                "sameSite": true,
                                "maxAge": this.configuration.Session?.maxAge || 90000,
                            });
                            saveSSID = newSessionId;
                        }
                    }
                    params.push(saveSSID);
                    break;
                }
                default: {
                    params.push(null);
                }
            }
        })
        return params;
    }
    public loadRouter(log: Log, afterRequestHandler: Function) {
        this.app.use(express.json());
        this.crossOriginCheck(log);
        log.info("Load routers: ");
        const routeLogs = createRequestRoutes(this, (req: Request, res: Response) => {
            //--------CreateSession id
            const SSID = this.configuration.Session?.sessionIdKey || GLOBAL_KEY_SESSION_ID_KEY;
            const oldSessionId = this.getCookies(req, SSID);
            if (utils.isEmpty(oldSessionId)) {
                const newSessionId = utils.md5(`session_${utils.uuid()}_${Date.now()}`);
                res.cookie(SSID, newSessionId, {
                    "httpOnly": true,
                    "secure": true,
                    "path": "/",
                    "sameSite": true,
                    "maxAge": this.configuration.Session?.maxAge || 90000,
                });
            }
            // crossorigin check
        }, (responseData: Promise<any>, req: Request, res: Response, next) => {
            responseData.then(({ data, route }) => {
                !route.options?.takeOver && res.send(data);
                afterRequestHandler();
            }).catch((error) => {
                try {
                    log.error(error.stack);
                    res.status(/^[\d]+$/.test(error.code) ? error.code || 500 : 500);
                    if (error.code !== 'ERR_HTTP_HEADERS_SENT') {
                        //链接为关闭时才可以发送错误信息到前端，防止系统错误
                        if (error.data) {
                            res.send(error.data)
                        } else {
                            res.send({ statusCode: error.statusCode || "Unknown", message: error.message });
                        }
                    }
                    afterRequestHandler();
                } catch (e) {
                    log.error(e.stack);
                    res.sendStatus(500);
                    res.send();
                }
            });
        });
        if (routeLogs.length > 0) {
            routeLogs[0] = routeLogs[0].substring(1); // 为兼容Log4j打印多参数自动加1一个空格问题
        }
        log.info("Routes:", '\n', routeLogs.join("\n"));
    }
    private getCookies(req: Request, fieldNames?: string | string[]) {
        let cookieData = req.cookies || {};
        if (Object.keys(cookieData).length === 0) {
            const cookieValue = this.getHeaders(req, "cookie");
            const uriData = utils.toUri(cookieValue);
            cookieData = uriData;
        }
        return this.getParamDecoratorData(cookieData, fieldNames);
    }
    /**
     * 获取请求头
     * @param req 请求体
     * @param fieldNames 字段名
     * @returns 
     */
    private getHeaders(req: Request, fieldNames?: string | string[]) {
        const headerData = req.headers || {};
        return this.getParamDecoratorData(headerData, fieldNames, (name: string) => name?.toLowerCase());
    }
    private getQueryParams(req: Request, fieldNames?: string | string[]) {
        const uriData = req.query || {};
        return this.getParamDecoratorData(uriData, fieldNames);
    }
    /**
     * 解析请求payload, content-type: application/x-www-form-urlencoded
     * @param req 
     * @param fieldNames 
     */
    private getRequestBody(req: Request, fieldNames?: string | string[]) {
        return this.getParamDecoratorData(req.body, fieldNames);
    }
    /**
     * 解析path参数, url: http://localhost/test/:id
     * @param route - 路由配置信息
     * @param req - 请求
     * @param fieldId - 路由参数id
     * @returns 
     */
    private getPathParam(route: IDefineRoute, req: Request, fieldId: string) {
        const pathArr = route.url.split("/");
        const urlArr = req.url.split("/");
        const matchIndex = pathArr.indexOf(`:${fieldId}`);
        return matchIndex > 0 ? urlArr[matchIndex] : null;
    }
    /**
     * 根据指定字段名获取数据，不传fieldNames返回完整object
     * @param sourceData - 数据源
     * @param fieldNames - 获取字段Key
     * @returns 
     */
    private getParamDecoratorData(sourceData: any, fieldNames?: string | string[], nameFormat?: Function) {
        if (utils.isArray(fieldNames)) {
            const objResult = {};
            fieldNames.forEach((name: string) => {
                const nameEx = typeof nameFormat === "function" ? nameFormat(name) : name;
                lodash.set(objResult, name, lodash.get(sourceData, nameEx));
            });
            return objResult;
        } else if (!utils.isEmpty(fieldNames)) {
            const nameEx = typeof nameFormat === "function" ? nameFormat(fieldNames) : fieldNames;
            return lodash.get(sourceData, nameEx);
        } else {
            return sourceData;
        }
    }
    private crossOriginCheck(log: Log) {
        this.app.use("*", (req: Request, res: Response, next) => {
            const crossOriginObj = createInstanceInApp(CrossOrigin, this);
            const crossOriginCheckOption = {
                headers: req.headers as any,
                method: req.method,
                origin: req.originalUrl,
                url: req.baseUrl
            };
            const isSimpleRequestWithCrossOrigin = crossOriginObj.isSempleRequestWithCrossOrigin(crossOriginCheckOption);
            log.info(`${req.method} ${req.originalUrl}`);

            if (req.method === "OPTIONS" || isSimpleRequestWithCrossOrigin) {
                const matchAllowHeaders = crossOriginObj.isValidateRequest(crossOriginCheckOption);
                if (matchAllowHeaders) {
                    matchAllowHeaders.forEach((header) => {
                        res.header(header.name, header.value);
                    });
                    if (req.method === "OPTIONS") {
                        // 只有options请求发送空数据并结束请求。
                        res.send({});
                        return;
                    }
                }
            }
            next();
        });
    }
}
