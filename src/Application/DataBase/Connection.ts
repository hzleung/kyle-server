import { AppService } from "../../Annotation";
import { createInstanceInApp } from "../../Annotation/createInstance";
import { GetConfig } from "../../Config/GetConfig";
import { IConfigDB } from "../../Config/interface/IConfigDB";
import { DataBaseEngine } from "./DataBaseEngine";
import { Mysql } from "./Mysql";

@AppService
export class Connection {

    private db: DataBaseEngine;

    @GetConfig("DataBase")
    public config!: IConfigDB;

    init() {
        const dataBaseEngine = this.config.type || "Mysql";
        if(dataBaseEngine === "Mysql") {
            this.db = createInstanceInApp(Mysql, this);
        } else {
            throw new Error(`Unsupport data engine type.(${dataBaseEngine})`);
        }
        this.db.init(this.config);
    }
    startTransaction() {
        this.db.connect();
    }
    query(sql: string, params: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.log.info("Sql: ", sql);
            this.db.query(sql, params)
                .then(resolve)
                .catch((err) => {
                    this.db.log.error(err.stack);
                    reject(err);
                });
        })
    }
    beginTransaction(): Promise<any> {
        return this.db.beginTransaction();
    }
    commit(): Promise<any> {
        return this.db.commit();
    }
    rollback(): Promise<any> {
        return this.db.rollback();
    }
    dispose(): void {
        try {
            this.db?.log.info("Close database connection.");
            this.db?.dispose();
        } catch(e) {
            this.db?.log.error(e.stack);
        }
    }
}