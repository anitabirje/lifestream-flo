import { docClient } from '../config/dynamodb';

describe('DynamoDB Client', () => {
  it('should create DynamoDB document client', () => {
    expect(docClient).toBeDefined();
  });

  it('should have marshalling options configured', () => {
    expect(docClient.config).toBeDefined();
  });
});
