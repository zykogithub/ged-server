import FcmTokenField from '@fields/fcmTokenFields';

export const query = `
    UPDATE ${FcmTokenField.TABLE_NAME} 
    SET ${FcmTokenField.USER_ID} = :user_id
    WHERE ${FcmTokenField.DEVICE_TOKEN} = :device_token
`;

export const binds = (userId: string, deviceToken: string) => ({
    user_id: userId,
    device_token: deviceToken
});