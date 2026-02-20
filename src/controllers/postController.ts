import type { Request, Response } from 'express';
import PostRepository from '@repositories/postRepository';
import {
    oracleErrorResponse,
    badRequestErrorResponse
} from '@utils/errorUtils';
import type {ServerResponse} from '@models/serverResponse';
import {Post} from '@models/post';
import {e} from '@utils/logs';
import ImageRepository from "@repositories/imageRepository";
import {Readable} from "stream";

const postRepository = new PostRepository();
const imageRepository = new ImageRepository();

export const getPosts = async (req: Request, res: Response): Promise<void> => {
    const postTest = req.claims?.tester ?? false;

    try {
        const result = await postRepository.getPosts(postTest);
        res.json(result);
    } catch (error: any) {
        e(new Error(`Error getting posts: ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
    }
}

export const createPost = async (req: Request, res: Response): Promise<void> => {
    const postTest = req.claims?.tester ?? false;
    const postJson = req.body.post;
    const {
        POST_ID: id,
        POST_TITLE: title,
        POST_CONTENT: content,
        POST_LINK: link,
        POST_SOURCE_ID: sourceId,
        POST_DATE: date,
        POST_IMAGE_FILE_NAMES: imageFileNames,
    } = JSON.parse(postJson);

    if (
        !id ||
        !title ||
        (!content && !imageFileNames) ||
        !link ||
        !sourceId ||
        !date ||
        !imageFileNames
    ) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    const post: Post = {
        id: id,
        title: title,
        content: content,
        link: link,
        sourceId: sourceId,
        date: date,
        imageFileNames: imageFileNames,
        test: postTest
    };

    try {
        await postRepository.createPost(post);
        const files = Array.isArray(req.files) ? req.files : [];
        for (const file of files) {
            await imageRepository.uploadImage(
                Readable.from(file.buffer),
                getImagePath(file.originalname),
                file.size
            );
        }
        const serverResponse: ServerResponse = { message: 'Post created successfully' };
        res.status(201).json(serverResponse);
    } catch (error: any) {
        e(new Error(`Error creating post: ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
    }
}

export const updatePost = async (req: Request, res: Response): Promise<void> => {
    const postTest = req.claims?.tester ?? false;
    const postJson = req.body.post;
    const {
        POST_ID: id,
        POST_TITLE: title,
        POST_CONTENT: content,
        POST_LINK: link,
        POST_SOURCE_ID: sourceId,
        POST_DATE: date,
        POST_IMAGE_FILE_NAMES: imageFileNames,
    } = JSON.parse(postJson);

    if (
        !id ||
        !title ||
        !content ||
        !link ||
        !sourceId ||
        !date ||
        !imageFileNames
    ) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    const post: Post = {
        id: id,
        title: title,
        content: content,
        link: link,
        sourceId: sourceId,
        date: date,
        imageFileNames: imageFileNames,
        test: postTest
    };

    let previousImageFileNames: string[] = [];
    let previousImageFileNamesSet = new Set<string>();

    try {
        const previousPost = await postRepository.getPost(id, postTest);
        await postRepository.updatePost(post);

        if (previousPost) {
            previousImageFileNames = JSON.parse(previousPost.imageFileNames) as string[];
            previousImageFileNamesSet = new Set(previousImageFileNames);
        }

        const files = Array.isArray(req.files) ? req.files : [];
        const imageToAdd = files.filter((value) => !previousImageFileNamesSet.has(value.originalname));
        for (const file of imageToAdd) {
            await imageRepository.uploadImage(
                Readable.from(file.buffer),
                getImagePath(file.originalname),
                file.size
            );
        }
        const serverResponse: ServerResponse = { message: 'Post updated successfully' };
        res.status(201).json(serverResponse);

        const imageFilesNamesSet = new Set(JSON.parse(post.imageFileNames) as string[]);
        const imageToDelete = previousImageFileNames.filter((value) => !imageFilesNamesSet.has(value));

        for (const fileName of imageToDelete) {
            await imageRepository.deleteImage(getImagePath(fileName))
                .catch((error: any) => e(new Error(`Error deleting previous post image ${fileName}: ${error.message}`)));
        }
    } catch (error: any) {
        e(new Error(`Error updating post: ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
    }
}

export const deleteMission = async (req: Request, res: Response): Promise<void> => {
    const postTest = req.claims?.tester ?? false;
    const {
        POST_ID: postId,
        POST_IMAGE_FILE_NAMES: postImageFileNames
    } = req.body;

    if(!postId) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    try {
        await postRepository.deletePost(postId, postTest);
        const serverResponse: ServerResponse = { message: 'Post has been deleted successfully' };
        res.status(200).json(serverResponse);
    } catch (error: any) {
        e(new Error(`Error deleting post ${postId} : ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
        return;
    }

    const imageFileNames = JSON.parse(postImageFileNames) as string[];
    imageFileNames.forEach((fileName: string) => {
        imageRepository.deleteImage(getImagePath(fileName))
            .catch((error: Error) => {
                e(new Error(`Error deleting post image ${fileName} : ${error.message}`));
            });
    });
}


function getImagePath(fileName: string): string {
    return `PostImages/${fileName}`;
}