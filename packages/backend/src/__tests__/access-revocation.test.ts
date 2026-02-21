/**
 * Property-based test for access revocation
 * Property 35: User Access Revocation
 * Validates: Requirements 8.6, 8.7
 * 
 * Feature: flo-family-calendar, Property 35: User Access Revocation
 */

import * as fc from 'fast-check';
import { UserManagementService } from '../auth/user-management-service';
import { SessionManager } from '../auth/session-manager';
import { PasswordManager } from '../auth/password-manager';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { v4 as uuidv4 } from 'uuid';

// Mock DynamoDB client for testing
class MockDynamoDBClient extends DynamoDBClientWrapper {
  private items: Map<string, any> = new Map();

  constructor() {
    super('test-table');
  }

  async put(item: any): Promise<void> {
    const key = `${item.PK}#${item.SK}`;
    this.items.set(key, item);
  }

  async get(key: Record<string, any>, consistentRead: boolean = false): Promise<any> {
    const keyStr = `${key.PK}#${key.SK}`;
    return this.items.get(keyStr) || null;
  }

  async delete(
    key: Record<string, any>,
    conditionExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<void> {
    const keyStr = `${key.PK}#${key.SK}`;
    this.items.delete(keyStr);
  }

  async query(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: any
  ): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    const results: any[] = [];
    const pk = expressionAttributeValues[':pk'];
    const skPrefix = expressionAttributeValues[':sk'];

    for (const [key, item] of this.items.entries()) {
      if (item.PK === pk && item.SK.startsWith(skPrefix)) {
        results.push(item);
      }
    }

    return { items: results };
  }

  async queryAll(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: any
  ): Promise<any[]> {
    const result = await this.query(keyConditionExpression, expressionAttributeValues, options);
    return result.items;
  }

  // Helper method for tests to scan by token
  async findByToken(token: string): Promise<any[]> {
    const results: any[] = [];
    for (const [key, item] of this.items.entries()) {
      if (item.token === token && item.EntityType === 'SESSION') {
        results.push(item);
      }
    }
    return results;
  }

  clear(): void {
    this.items.clear();
  }
}

describe('Access Revocation Property Tests', () => {
  let mockClient: MockDynamoDBClient;
  let userManagementService: UserManagementService;
  let sessionManager: SessionManager;
  let passwordManager: PasswordManager;

  beforeEach(() => {
    mockClient = new MockDynamoDBClient();
    passwordManager = new PasswordManager();
    sessionManager = new SessionManager(mockClient);
    userManagementService = new UserManagementService(mockClient, passwordManager);
  });

  afterEach(() => {
    mockClient.clear();
  });

  describe('Property 35: User Access Revocation', () => {
    it(
      'should immediately revoke access when a family member is removed',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              familyId: fc.uuid(),
            }),
            async (memberData) => {
              // Add a family member
              const addResult = await userManagementService.addMember({
                email: memberData.email,
                password: memberData.password,
                name: memberData.name,
                familyId: memberData.familyId,
                role: 'member',
              });

              expect(addResult.success).toBe(true);
              expect(addResult.user).toBeDefined();
              const memberId = addResult.user!.id;

              // Create a session for this member
              const session = await sessionManager.createSession(memberId);
              expect(session).toBeDefined();
              expect(session.token).toBeTruthy();

              // Verify session is valid before removal
              const validatedBefore = await sessionManager.validateToken(session.token);
              expect(validatedBefore).not.toBeNull();
              expect(validatedBefore?.userId).toBe(memberId);

              // Remove the family member
              const removeResult = await userManagementService.removeMember(
                memberId,
                memberData.familyId
              );

              expect(removeResult.success).toBe(true);

              // Verify session is immediately invalidated after removal
              const validatedAfter = await sessionManager.validateToken(session.token);
              expect(validatedAfter).toBeNull();

              // Verify member is marked as removed in database
              const getResult = await mockClient.get({
                PK: `FAMILY#${memberData.familyId}`,
                SK: `MEMBER#${memberId}`,
              });
              expect(getResult).toBeDefined();
              expect(getResult.status).toBe('removed');
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );

    it(
      'should prevent removed members from appearing in family member list',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              familyId: fc.uuid(),
              members: fc.array(
                fc.record({
                  email: fc.emailAddress(),
                  password: fc.string({ minLength: 8, maxLength: 20 }),
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                }),
                { minLength: 2, maxLength: 3 }
              ),
            }),
            async (familyData) => {
              // Add multiple family members
              const addedMembers = [];
              for (const memberData of familyData.members) {
                const result = await userManagementService.addMember({
                  email: memberData.email,
                  password: memberData.password,
                  name: memberData.name,
                  familyId: familyData.familyId,
                  role: 'member',
                });
                if (result.success && result.user) {
                  addedMembers.push(result.user);
                }
              }

              // Verify all members are in the list
              const listBefore = await userManagementService.listMembers(familyData.familyId);
              expect(listBefore.success).toBe(true);
              expect(listBefore.members?.length).toBe(addedMembers.length);

              // Remove the first member
              const memberToRemove = addedMembers[0];
              const removeResult = await userManagementService.removeMember(
                memberToRemove.id,
                familyData.familyId
              );
              expect(removeResult.success).toBe(true);

              // Verify removed member is not in the list
              const listAfter = await userManagementService.listMembers(familyData.familyId);
              expect(listAfter.success).toBe(true);
              expect(listAfter.members?.length).toBe(addedMembers.length - 1);

              const removedMemberInList = listAfter.members?.find(
                (m) => m.id === memberToRemove.id
              );
              expect(removedMemberInList).toBeUndefined();

              // Verify other members are still in the list
              for (let i = 1; i < addedMembers.length; i++) {
                const member = addedMembers[i];
                const memberInList = listAfter.members?.find((m) => m.id === member.id);
                expect(memberInList).toBeDefined();
              }
            }
          ),
          { numRuns: 15 }
        );
      },
      30000
    );

    it(
      'should invalidate all sessions when a member is removed',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              familyId: fc.uuid(),
              sessionCount: fc.integer({ min: 1, max: 3 }),
            }),
            async (memberData) => {
              // Add a family member
              const addResult = await userManagementService.addMember({
                email: memberData.email,
                password: memberData.password,
                name: memberData.name,
                familyId: memberData.familyId,
                role: 'member',
              });

              expect(addResult.success).toBe(true);
              const memberId = addResult.user!.id;

              // Create multiple sessions for this member
              const sessions = [];
              for (let i = 0; i < memberData.sessionCount; i++) {
                const session = await sessionManager.createSession(memberId);
                sessions.push(session);
              }

              // Verify all sessions are valid before removal
              for (const session of sessions) {
                const validated = await sessionManager.validateToken(session.token);
                expect(validated).not.toBeNull();
              }

              // Remove the family member
              await userManagementService.removeMember(memberId, memberData.familyId);

              // Verify all sessions are invalidated after removal
              for (const session of sessions) {
                const validated = await sessionManager.validateToken(session.token);
                expect(validated).toBeNull();
              }
            }
          ),
          { numRuns: 15 }
        );
      },
      30000
    );

    it(
      'should preserve data but mark status as removed',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              familyId: fc.uuid(),
            }),
            async (memberData) => {
              // Add a family member
              const addResult = await userManagementService.addMember({
                email: memberData.email,
                password: memberData.password,
                name: memberData.name,
                familyId: memberData.familyId,
                role: 'member',
              });

              expect(addResult.success).toBe(true);
              const memberId = addResult.user!.id;
              const originalEmail = addResult.user!.email;
              const originalName = addResult.user!.name;

              // Remove the family member
              await userManagementService.removeMember(memberId, memberData.familyId);

              // Verify data is preserved but status is changed
              const getResult = await mockClient.get({
                PK: `FAMILY#${memberData.familyId}`,
                SK: `MEMBER#${memberId}`,
              });

              expect(getResult).toBeDefined();
              expect(getResult.status).toBe('removed');
              expect(getResult.email).toBe(originalEmail);
              expect(getResult.name).toBe(originalName);
              expect(getResult.id).toBe(memberId);
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );
  });

  describe('Additional Access Control Tests', () => {
    it('should fail to remove non-existent member', async () => {
      const familyId = uuidv4();
      const nonExistentId = uuidv4();

      const result = await userManagementService.removeMember(nonExistentId, familyId);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should successfully add and list members', async () => {
      const familyId = uuidv4();

      const result1 = await userManagementService.addMember({
        email: 'test1@example.com',
        password: 'password123',
        name: 'Test User 1',
        familyId,
        role: 'member',
      });

      const result2 = await userManagementService.addMember({
        email: 'test2@example.com',
        password: 'password456',
        name: 'Test User 2',
        familyId,
        role: 'admin',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const listResult = await userManagementService.listMembers(familyId);
      expect(listResult.success).toBe(true);
      expect(listResult.members?.length).toBe(2);
    });

    it('should prevent duplicate email addresses in same family', async () => {
      const familyId = uuidv4();
      const email = 'duplicate@example.com';

      const result1 = await userManagementService.addMember({
        email,
        password: 'password123',
        name: 'Test User 1',
        familyId,
        role: 'member',
      });

      const result2 = await userManagementService.addMember({
        email,
        password: 'password456',
        name: 'Test User 2',
        familyId,
        role: 'member',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already exists');
    });
  });
});
