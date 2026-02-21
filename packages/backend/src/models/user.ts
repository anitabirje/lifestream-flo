/**
 * User and Session data models for authentication
 * Implements DynamoDB single-table design patterns
 */

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  familyId: string;
  role: 'admin' | 'member';
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

// DynamoDB representations
export interface UserDynamoDBItem {
  PK: string; // FAMILY#<familyId>
  SK: string; // MEMBER#<memberId>
  EntityType: 'FAMILY_MEMBER';
  id: string;
  familyId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  joinedAt: string; // ISO 8601
  lastLoginAt?: string; // ISO 8601
  status: 'active' | 'inactive' | 'removed';
}

export interface SessionDynamoDBItem {
  PK: string; // USER#<userId>
  SK: string; // SESSION#<sessionToken>
  EntityType: 'SESSION';
  id: string;
  userId: string;
  token: string;
  expiresAt: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  TTL: number; // Unix timestamp for DynamoDB TTL
}

/**
 * Convert User domain model to DynamoDB item
 */
export function userToDynamoDB(user: User): UserDynamoDBItem {
  return {
    PK: `FAMILY#${user.familyId}`,
    SK: `MEMBER#${user.id}`,
    EntityType: 'FAMILY_MEMBER',
    id: user.id,
    familyId: user.familyId,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.lastLoginAt?.toISOString() || user.createdAt.toISOString(),
    joinedAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
    status: 'active',
  };
}

/**
 * Convert DynamoDB item to User domain model
 */
export function userFromDynamoDB(item: UserDynamoDBItem): User {
  return {
    id: item.id,
    email: item.email,
    name: item.name,
    passwordHash: item.passwordHash,
    familyId: item.familyId,
    role: item.role,
    createdAt: new Date(item.createdAt),
    lastLoginAt: item.lastLoginAt ? new Date(item.lastLoginAt) : undefined,
  };
}

/**
 * Convert Session domain model to DynamoDB item
 */
export function sessionToDynamoDB(session: Session): SessionDynamoDBItem {
  return {
    PK: `USER#${session.userId}`,
    SK: `SESSION#${session.token}`,
    EntityType: 'SESSION',
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.lastActivityAt.toISOString(), // Use lastActivityAt as updatedAt
    lastActivityAt: session.lastActivityAt.toISOString(),
    TTL: Math.floor(session.expiresAt.getTime() / 1000), // Convert to Unix timestamp
  };
}

/**
 * Convert DynamoDB item to Session domain model
 */
export function sessionFromDynamoDB(item: SessionDynamoDBItem): Session {
  return {
    id: item.id,
    userId: item.userId,
    token: item.token,
    expiresAt: new Date(item.expiresAt),
    createdAt: new Date(item.createdAt),
    lastActivityAt: new Date(item.lastActivityAt),
  };
}
