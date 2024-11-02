const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

const BUCKET_NAME = 'jsontest-bucket-q';
let lastUploadedFileName = '';

function generateFileHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function deleteFromS3(fileName) {
    const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: fileName });
    await s3.send(command);
    console.log(`File deleted: ${fileName}`);
}

async function updateJsonAndFetchFileReference(userData) {
    const jsonData = JSON.stringify(userData);
    const fileHash = generateFileHash(jsonData);
    const fileName = `${userData.username}_${userData.id}_${fileHash}.json`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: jsonData,
        ContentType: 'application/json',
        CacheControl: 'no-cache',
    });

    await s3.send(command);
    console.log(`File uploaded: ${fileName}`);

    if (lastUploadedFileName && lastUploadedFileName !== fileName) {
        await deleteFromS3(lastUploadedFileName);
    }

    lastUploadedFileName = fileName;
    return fileName;
}

module.exports = { generateFileHash, updateJsonAndFetchFileReference };
