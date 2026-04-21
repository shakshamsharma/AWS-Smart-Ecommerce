const multer   = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

const upload = multer({
  storage: process.env.NODE_ENV === 'production'
    ? multerS3({
        s3,
        bucket: process.env.S3_BUCKET,
        key: (req, file, cb) => {
          cb(null, `products/${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
      })
    : multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
});

module.exports = upload;
