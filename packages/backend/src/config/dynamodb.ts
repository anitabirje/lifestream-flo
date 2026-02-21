import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from './env';

const clientConfig: any = {
  region: config.aws.region,
};

if (config.aws.accessKeyId && config.aws.secretAccessKey) {
  clientConfig.credentials = {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  };
}

if (config.dynamodb.endpoint) {
  clientConfig.endpoint = config.dynamodb.endpoint;
}

const client = new DynamoDBClient(clientConfig);

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const dynamoDBClient = client;
