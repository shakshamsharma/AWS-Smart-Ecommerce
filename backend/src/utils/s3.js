const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUCKET = process.env.S3_BUCKET;
const CDN    = process.env.CDN_URL; // CloudFront domain

async function uploadToS3(file, key) {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000',
  }));
  return CDN ? `${CDN}/${key}` : `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

async function deleteFromS3(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

function keyFromUrl(url) {
  return url.replace(/^https?:\/\/[^/]+\//, '');
}

module.exports = { uploadToS3, deleteFromS3, keyFromUrl };
