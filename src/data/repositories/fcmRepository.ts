import FirebaseApi from '@api/firebaseApi';
import OracleApi from "@api/oracleApi";
import type {FcmMessage, FcmMulticastMessage} from '@models/fcmMessage';
import type {FcmToken, FcmTokens} from "@models/fcmTokens";
import * as getFcmTokenQuery from "@queries/fcmToken/getFcmTokenQuery"
import * as getFcmTokensQuery from "@queries/fcmToken/getFcmTokensQuery"
import * as insertFcmTokenQuery from "@queries/fcmToken/insertFcmTokenQuery"
import * as updateFcmTokenQuery from "@queries/fcmToken/updateFcmTokenQuery"
import * as deleteFcmTokenQuery from "@queries/fcmToken/deleteFcmTokenQuery";
import type {Result} from "oracledb";

const firebaseApi = new FirebaseApi();
const oracleApi = OracleApi.instance;

export default class FcmRepository {
    private static _instance: FcmRepository;
    static get instance(): FcmRepository {
        return this._instance || (this._instance = new this());
    }

    private _userFcmTokens = new Map<string, Set<string>>();
    get userFcmTokens(): Map<string, Set<string>> {
        return this._userFcmTokens;
    }

    private constructor() {
        this.getAllFcmTokens()
            .then(fcmTokens => {
                fcmTokens.forEach(fcmToken => {
                    this._userFcmTokens.set(fcmToken.USER_ID, new Set(fcmToken.TOKENS));
                });
            })
            .catch(error => console.error(error));
    }

    private async getAllFcmTokens(): Promise<FcmTokens[]> {
        const result = await oracleApi.execute(getFcmTokensQuery.query);
        return result.rows?.map(row =>
            JSON.parse(row as [string][0]) as FcmTokens
        ) ?? [];
    }

    async upsertFcmToken(userId: string, deviceToken: string)  {
        const currentFcmToken = await this.getFcmToken(deviceToken)

        if (currentFcmToken) {
            await this.updateFcmToken(userId, deviceToken);
            this._userFcmTokens.get(currentFcmToken.USER_ID)?.delete(deviceToken);
            this._userFcmTokens.get(userId)?.add(deviceToken);
        } else {
            await this.insertFcmToken(userId, deviceToken);
            const tokens = this._userFcmTokens.get(userId) ?? new Set<string>();
            tokens.add(deviceToken);
            this._userFcmTokens.set(userId, tokens);
        }
    }

    async deleteFcmToken(userId: string, deviceToken: string) {
        await oracleApi.execute(
            deleteFcmTokenQuery.query,
            deleteFcmTokenQuery.binds(deviceToken),
            { autoCommit: true }
        )
        this._userFcmTokens.get(userId)?.delete(deviceToken);
    }

    async sendNotification(fcmMessage: FcmMessage) {
        await firebaseApi.sendNotification(fcmMessage);
    }

    async sendNotifications(fcmMulticastMessage: FcmMulticastMessage) {
        await firebaseApi.sendMulticastNotification(fcmMulticastMessage);
    }

    private async getFcmToken(deviceToken: string): Promise<FcmToken | null> {
        const query = getFcmTokenQuery.query;
        const binds = getFcmTokenQuery.binds(deviceToken);
        const result = await oracleApi.execute(query, binds) as Result<string[]>;
        const fcmTokenJson = result.rows?.[0]?.[0];
        return fcmTokenJson ? JSON.parse(fcmTokenJson) as FcmToken : null;
    }

    private async insertFcmToken(userId: string, deviceToken: string) {
        const query = insertFcmTokenQuery.query;
        const binds = insertFcmTokenQuery.binds(userId, deviceToken);
        await oracleApi.execute(query, binds, { autoCommit: true });
    }

    private async updateFcmToken(userId: string, deviceToken: string) {
        const query = updateFcmTokenQuery.query;
        const binds = updateFcmTokenQuery.binds(userId, deviceToken);
        await oracleApi.execute(query, binds, { autoCommit: true });
    }
}