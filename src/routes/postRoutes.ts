import express from 'express';
import {propagateCustomClaims, verifyAuthIdToken, verifyCustomClaims} from '@middlewares/authMiddleware';
import * as postController from '@controllers/postController';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
            callback(null, true);
        } else {
            callback(new Error("Only images are allowed"));
        }
    }
});

const router = express.Router();

router.get(
    '/',
    verifyAuthIdToken,
    propagateCustomClaims,
    postController.getPosts
);

router.post(
    '/create',
    verifyCustomClaims((claims) => claims.admin == true),
    upload.array('images', 15),
    propagateCustomClaims,
    postController.createPost
)

router.post(
    '/update',
    verifyCustomClaims((claims) => claims.admin == true),
    upload.array('images', 15),
    propagateCustomClaims,
    postController.updatePost
)

router.post(
    '/delete',
    verifyCustomClaims((claims) => claims.admin == true),
    propagateCustomClaims,
    postController.deleteMission
);

export default router;