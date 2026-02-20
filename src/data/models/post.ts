export interface Post {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly link: string;
    readonly sourceId: number;
    readonly date: string;
    readonly imageFileNames: string;
    readonly test: boolean;
}

export interface RemotePost {
    readonly POST_ID: string;
    readonly POST_TITLE: string;
    readonly POST_CONTENT: string;
    readonly POST_LINK: string;
    readonly POST_SOURCE_ID: number;
    readonly POST_DATE: string;
    readonly POST_IMAGE_FILE_NAMES: string;
    readonly POST_TEST: boolean;
}