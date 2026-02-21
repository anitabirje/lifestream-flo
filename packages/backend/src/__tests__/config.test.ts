import { config } from '../config/env';

describe('Configuration', () => {
  it('should load environment configuration', () => {
    expect(config).toBeDefined();
    expect(config.aws).toBeDefined();
    expect(config.dynamodb).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.session).toBeDefined();
    expect(config.bcrypt).toBeDefined();
  });

  it('should have valid DynamoDB table name', () => {
    expect(config.dynamodb.tableName).toBe('FamilyCalendar');
  });

  it('should have valid bcrypt rounds', () => {
    expect(config.bcrypt.rounds).toBeGreaterThanOrEqual(12);
  });

  it('should have valid session expiry', () => {
    expect(config.session.expiryDays).toBe(30);
  });
});
