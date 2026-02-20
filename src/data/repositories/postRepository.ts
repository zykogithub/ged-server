import OracleApi from '@api/oracleApi';
import type {Post, RemotePost} from '@models/post';
import PostField from '@fields/postField';
import type {Result} from "oracledb";
import {toPost} from "@data/mappers/postMapper";

const oracleApi = OracleApi.instance;

export default class PostRepository {
    async getPosts(postTest: boolean): Promise<RemotePost[]> {
        const query = `
            SELECT JSON_OBJECT(* RETURNING CLOB)
            FROM ${PostField.TABLE_NAME}
            WHERE ${PostField.POST_TEST} = :post_test
        `;
        const binds = { post_test: postTest ? 1 : 0 };

        const result = await oracleApi.execute(query, binds);
        return result.rows?.map(row =>
            JSON.parse(row as [string][0]) as RemotePost
        ) ?? [];
    }

    async getPost(postId: string, postTest: boolean): Promise<Post | null> {
        const query = `
            SELECT JSON_OBJECT(* RETURNING CLOB)
            FROM ${PostField.TABLE_NAME}
            WHERE ${PostField.POST_ID} = :post_id
                AND ${PostField.POST_TEST} = :post_test
        `;

        const binds = {
            post_id: postId,
            post_test: postTest ? 1 : 0
        };

        const result = await oracleApi.execute(query, binds) as Result<string[]>;
        const postJson = result.rows?.[0]?.[0];
        return postJson ? toPost(JSON.parse(postJson) as RemotePost) : null;
    }

    async createPost(post: Post) {
        const query = `
            INSERT INTO ${PostField.TABLE_NAME} (
                ${PostField.POST_ID},
                ${PostField.POST_TITLE},
                ${PostField.POST_CONTENT},
                ${PostField.POST_LINK},
                ${PostField.POST_SOURCE_ID},
                ${PostField.POST_DATE},
                ${PostField.POST_IMAGE_FILE_NAMES},
                ${PostField.POST_TEST}
            ) VALUES (
                :post_id,
                :post_title,
                :post_content,
                :post_link,
                :post_source_id,
                :post_date,
                :post_image_file_names,
                :post_test
             )
        `;

        const binds = {
            post_id: post.id,
            post_title: post.title,
            post_content: post.content,
            post_link: post.link,
            post_source_id: post.sourceId,
            post_date: post.date,
            post_image_file_names: post.imageFileNames,
            post_test: post.test ? 1 : 0
        };

        return await oracleApi.execute(query, binds, { autoCommit: true });
    }

    async updatePost(post: Post) {
        const query = `
            UPDATE ${PostField.TABLE_NAME}
            SET 
                ${PostField.POST_TITLE} = :post_title,
                ${PostField.POST_CONTENT} = :post_content,
                ${PostField.POST_LINK} = :post_link,
                ${PostField.POST_SOURCE_ID} = :post_source_id,
                ${PostField.POST_IMAGE_FILE_NAMES} = :post_image_file_names
            WHERE ${PostField.POST_ID} = :post_id
                AND ${PostField.POST_TEST} = :post_test
        `;

        const binds = {
            post_id: post.id,
            post_title: post.title,
            post_content: post.content,
            post_link: post.link,
            post_source_id: post.sourceId,
            post_image_file_names: post.imageFileNames,
            post_test: post.test ? 1 : 0
        };

        await oracleApi.execute(query, binds, { autoCommit: true });
    }

    async deletePost(postId: string, postTest: boolean) {
        const query = `
            DELETE FROM ${PostField.TABLE_NAME}
            WHERE ${PostField.POST_ID} = :post_id 
              AND ${PostField.POST_TEST} = :post_test
        `;

        const binds = {
            post_id: postId,
            post_test: postTest ? 1 : 0
        };

        await oracleApi.execute(query, binds, { autoCommit: true });
    }
}