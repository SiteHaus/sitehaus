import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  accountId: process.env.R2_ACCOUNT_ID ?? '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  bucketName: process.env.R2_BUCKET_NAME ?? 'sitehaus-assets',
  /** Max upload size in bytes (default 50MB) */
  maxFileSize: parseInt(process.env.MAX_UPLOAD_SIZE ?? '52428800', 10),
}));
