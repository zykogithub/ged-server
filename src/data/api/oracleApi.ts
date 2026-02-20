import type { BindParameters, ExecuteOptions, Pool } from 'oracledb';
import oracledb from 'oracledb';
import { e } from '@utils/logs';
import { dbConfig } from '@api/configs';
import {ORACLE_HOME} from "@root/env";

oracledb.initOracleClient({ libDir: ORACLE_HOME });
oracledb.fetchAsString = [ oracledb.CLOB ];

export default class OracleApi {
    private _pool: Pool | null = null;
    private static _instance: OracleApi;

    private constructor() {}

    public static get instance() {
        return this._instance || (this._instance = new this());
    }

    private async getPool() {
        if (!this._pool) {
            const pool = await oracledb.createPool(dbConfig);
            this._pool = pool;
            return pool;
        } else {
            return this._pool;
        }
    }

    async execute(sql: string, params: BindParameters = [], options: ExecuteOptions = {}) {
        let connection;
        try {
            connection = await (await this.getPool()).getConnection();
            return await connection.execute(sql, params, options);
        } catch (error) {
            e(error);
            throw error;
        } finally {
            await connection?.close();
        }
    }

    async executeMany(sql: string, params: BindParameters[] = [], options: ExecuteOptions = {}) {
        let connection;
        try {
            connection = await (await this.getPool()).getConnection();
            return await connection.executeMany(sql, params, options);
        } catch (error) {
            e(error);
            throw error;
        } finally {
            await connection?.close();
        }
    }

    async getConnection() {
        return await (await this.getPool()).getConnection();
    }

    async closePool() {
        if (this._pool) {
            try {
                await this._pool.close(10);
                this._pool = null;
            } catch (error) {
                e(error);
            }
        }
    }
}