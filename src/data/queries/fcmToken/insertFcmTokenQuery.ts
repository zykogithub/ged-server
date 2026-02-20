import FcmTokenField from '@fields/fcmTokenFields';

export const query = `
    INSERT INTO ${FcmTokenField.TABLE_NAME} (
        ${FcmTokenField.USER_ID},
        ${FcmTokenField.DEVICE_TOKEN}
    ) VALUES (
      :user_id, 
      :device_token
    )
`;

export const binds = (userId: string, deviceToken: string) => ({
    user_id: userId,
    device_token: deviceToken
});