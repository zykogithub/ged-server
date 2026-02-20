import {Post, RemotePost} from "@models/post";

export const toPost = (remotePost: RemotePost): Post  => ({
    id: remotePost.POST_ID,
    title: remotePost.POST_TITLE,
    content: remotePost.POST_CONTENT,
    link: remotePost.POST_LINK,
    sourceId: remotePost.POST_SOURCE_ID,
    date: remotePost.POST_DATE,
    imageFileNames: remotePost.POST_IMAGE_FILE_NAMES,
    test: remotePost.POST_TEST
});