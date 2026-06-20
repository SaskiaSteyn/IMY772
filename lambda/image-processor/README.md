# MicroTrack Image Processor (AWS Lambda)

Serverless image processing. An S3 `ObjectCreated` event under `profile-images/`
triggers this function, which generates a 64×64 avatar thumbnail (via `jimp`,
pure-JS) and writes it to `thumbnails/` in the same bucket.

Demonstrates: AWS Lambda (serverless processing) reacting to real-time S3 events
to perform image processing. Credentials come from the `microtrack-lambda-role`
execution role; `@aws-sdk/*` v3 is provided by the Node 20 runtime, so only
`jimp` is bundled.

## Deploy (us-east-1, profile `microtrack`)

```bash
cd lambda/image-processor
npm install --omit=dev
zip -r function.zip index.js node_modules package.json

ROLE_ARN=$(aws iam get-role --role-name microtrack-lambda-role --query 'Role.Arn' --output text --profile microtrack)

aws lambda create-function --function-name microtrack-image-processor \
  --runtime nodejs20.x --role "$ROLE_ARN" --handler index.handler \
  --zip-file fileb://function.zip --timeout 30 --memory-size 512 \
  --region us-east-1 --profile microtrack

# allow S3 to invoke it
aws lambda add-permission --function-name microtrack-image-processor \
  --statement-id s3invoke --action lambda:InvokeFunction \
  --principal s3.amazonaws.com --source-arn arn:aws:s3:::microtrack-images \
  --region us-east-1 --profile microtrack

# wire the S3 -> Lambda notification (prefix profile-images/)
aws s3api put-bucket-notification-configuration --bucket microtrack-images \
  --notification-configuration file://s3-notification.json \
  --region us-east-1 --profile microtrack
```

Update code later with:
`aws lambda update-function-code --function-name microtrack-image-processor --zip-file fileb://function.zip`
