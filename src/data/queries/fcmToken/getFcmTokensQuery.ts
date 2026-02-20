import FcmTokenField from '@fields/fcmTokenFields';

export const query = `
    SELECT JSON_OBJECT(
        '${FcmTokenField.USER_ID}': ${FcmTokenField.USER_ID},
        'TOKENS': (
            SELECT JSON_ARRAYAGG(${FcmTokenField.DEVICE_TOKEN})
            FROM ${FcmTokenField.TABLE_NAME} F
            WHERE F.${FcmTokenField.USER_ID} = SOURCE.${FcmTokenField.USER_ID}
        )
   ) FROM ${FcmTokenField.TABLE_NAME} SOURCE;
`;