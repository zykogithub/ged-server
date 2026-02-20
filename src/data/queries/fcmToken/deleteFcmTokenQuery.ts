import FcmTokenField from '@fields/fcmTokenFields';

export const query = `
    DELETE FROM ${FcmTokenField.TABLE_NAME}
    WHERE ${FcmTokenField.DEVICE_TOKEN} = :device_token
`;

export const binds = (deviceToken: string) => ({
    device_token: deviceToken
});