import dotenv from 'dotenv';

dotenv.config();

export const config = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  dynamodb: {
    tableName: process.env.DYNAMODB_TABLE_NAME || 'FamilyCalendar',
    endpoint: process.env.DYNAMODB_ENDPOINT,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
  },
  session: {
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    expiryDays: parseInt(process.env.SESSION_EXPIRY_DAYS || '30', 10),
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:support@flo-calendar.com',
  },
};
