/**
 * Unit tests for IAM roles and permissions
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { describe, it, expect } from '@jest/globals';
import {
  LAMBDA_EXECUTION_ROLE_POLICY,
  BEDROCK_AGENT_ROLE_POLICY,
  CALENDAR_TOOL_ROLE_POLICY,
  WEATHER_TOOL_ROLE_POLICY,
  CLASSIFIER_TOOL_ROLE_POLICY,
  PARSER_TOOL_ROLE_POLICY,
  NEWSLETTER_PARSER_TOOL_ROLE_POLICY,
  LAMBDA_TRUST_POLICY,
  BEDROCK_AGENT_TRUST_POLICY,
  getIAMRoleConfigs,
  validateLeastPrivilege,
  getRoleArn,
  getPolicyArn,
} from '../iam-config';

describe('IAM Configuration', () => {
  describe('Lambda Execution Role Policy', () => {
    it('should have Bedrock permissions', () => {
      const bedrock = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'BedrockInvoke'
      );
      expect(bedrock).toBeDefined();
      expect(bedrock?.Action).toContain('bedrock:InvokeAgent');
      expect(bedrock?.Action).toContain('bedrock:InvokeModel');
    });

    it('should have DynamoDB permissions', () => {
      const dynamodb = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'DynamoDBAccess'
      );
      expect(dynamodb).toBeDefined();
      expect(dynamodb?.Action).toContain('dynamodb:GetItem');
      expect(dynamodb?.Action).toContain('dynamodb:PutItem');
      expect(dynamodb?.Action).toContain('dynamodb:Query');
    });

    it('should have SNS permissions', () => {
      const sns = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'SNSPublish'
      );
      expect(sns).toBeDefined();
      expect(sns?.Action).toContain('sns:Publish');
    });

    it('should have CloudWatch Logs permissions', () => {
      const logs = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'CloudWatchLogs'
      );
      expect(logs).toBeDefined();
      expect(logs?.Action).toContain('logs:CreateLogGroup');
      expect(logs?.Action).toContain('logs:CreateLogStream');
      expect(logs?.Action).toContain('logs:PutLogEvents');
    });

    it('should have CloudWatch Metrics permissions', () => {
      const metrics = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'CloudWatchMetrics'
      );
      expect(metrics).toBeDefined();
      expect(metrics?.Action).toContain('cloudwatch:PutMetricData');
    });

    it('should have Lambda tool invocation permissions', () => {
      const lambda = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'LambdaToolInvoke'
      );
      expect(lambda).toBeDefined();
      expect(lambda?.Action).toContain('lambda:InvokeFunction');
    });

    it('should restrict DynamoDB to specific tables', () => {
      const dynamodb = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'DynamoDBAccess'
      );
      const resources = dynamodb?.Resource as string[];
      expect(resources).toContain('arn:aws:dynamodb:*:*:table/agent-executions');
      expect(resources).toContain('arn:aws:dynamodb:*:*:table/agent-configurations');
    });

    it('should restrict SNS to agent topics', () => {
      const sns = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'SNSPublish'
      );
      expect(sns?.Resource).toContain('arn:aws:sns:*:*:agent-*');
    });

    it('should restrict Lambda to agent tools', () => {
      const lambda = LAMBDA_EXECUTION_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'LambdaToolInvoke'
      );
      expect(lambda?.Resource).toContain('arn:aws:lambda:*:*:function:agent-tool-*');
    });
  });

  describe('Bedrock Agent Role Policy', () => {
    it('should have Lambda tool invocation permissions', () => {
      const lambda = BEDROCK_AGENT_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'LambdaToolInvoke'
      );
      expect(lambda).toBeDefined();
      expect(lambda?.Action).toContain('lambda:InvokeFunction');
    });

    it('should have Bedrock model invocation permissions', () => {
      const bedrock = BEDROCK_AGENT_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'BedrockModelInvoke'
      );
      expect(bedrock).toBeDefined();
      expect(bedrock?.Action).toContain('bedrock:InvokeModel');
    });

    it('should restrict Lambda to agent tools', () => {
      const lambda = BEDROCK_AGENT_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'LambdaToolInvoke'
      );
      expect(lambda?.Resource).toContain('arn:aws:lambda:*:*:function:agent-tool-*');
    });

    it('should restrict Bedrock to foundation models', () => {
      const bedrock = BEDROCK_AGENT_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'BedrockModelInvoke'
      );
      expect(bedrock?.Resource).toContain('arn:aws:bedrock:*:*:foundation-model/*');
    });
  });

  describe('Tool Lambda Role Policies', () => {
    it('should have minimal permissions for calendar tool', () => {
      const statements = CALENDAR_TOOL_ROLE_POLICY.Statement;
      expect(statements.length).toBeLessThanOrEqual(2);
    });

    it('should have minimal permissions for weather tool', () => {
      const statements = WEATHER_TOOL_ROLE_POLICY.Statement;
      expect(statements.length).toBeLessThanOrEqual(1);
    });

    it('should have minimal permissions for classifier tool', () => {
      const statements = CLASSIFIER_TOOL_ROLE_POLICY.Statement;
      expect(statements.length).toBeLessThanOrEqual(2);
    });

    it('should have minimal permissions for parser tool', () => {
      const statements = PARSER_TOOL_ROLE_POLICY.Statement;
      expect(statements.length).toBeLessThanOrEqual(1);
    });

    it('should have minimal permissions for newsletter parser tool', () => {
      const statements = NEWSLETTER_PARSER_TOOL_ROLE_POLICY.Statement;
      expect(statements.length).toBeLessThanOrEqual(1);
    });

    it('calendar tool should restrict to calendar-events table', () => {
      const dynamodb = CALENDAR_TOOL_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'DynamoDBRead'
      );
      expect(dynamodb?.Resource).toContain('arn:aws:dynamodb:*:*:table/calendar-events');
    });

    it('classifier tool should restrict to activity-categories table', () => {
      const dynamodb = CLASSIFIER_TOOL_ROLE_POLICY.Statement.find(
        (s: any) => s.Sid === 'DynamoDBRead'
      );
      expect(dynamodb?.Resource).toContain('arn:aws:dynamodb:*:*:table/activity-categories');
    });
  });

  describe('Trust Policies', () => {
    it('Lambda trust policy should allow Lambda service', () => {
      const statement = LAMBDA_TRUST_POLICY.Statement[0];
      expect(statement.Principal).toHaveProperty('Service', 'lambda.amazonaws.com');
      expect(statement.Action).toBe('sts:AssumeRole');
    });

    it('Bedrock Agent trust policy should allow Bedrock service', () => {
      const statement = BEDROCK_AGENT_TRUST_POLICY.Statement[0];
      expect(statement.Principal).toHaveProperty('Service', 'bedrock.amazonaws.com');
      expect(statement.Action).toBe('sts:AssumeRole');
    });
  });

  describe('IAM Role Configurations', () => {
    it('should return all role configurations', () => {
      const configs = getIAMRoleConfigs();
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should include Lambda execution role', () => {
      const configs = getIAMRoleConfigs();
      const lambdaRole = configs.find((c) => c.roleName === 'bedrock-agent-lambda-role');
      expect(lambdaRole).toBeDefined();
    });

    it('should include Bedrock Agent role', () => {
      const configs = getIAMRoleConfigs();
      const bedrockRole = configs.find((c) => c.roleName === 'bedrock-agent-execution-role');
      expect(bedrockRole).toBeDefined();
    });

    it('should include all tool roles', () => {
      const configs = getIAMRoleConfigs();
      const toolRoles = configs.filter((c) => c.roleName.startsWith('agent-tool-'));
      expect(toolRoles.length).toBeGreaterThanOrEqual(5);
    });

    it('each role should have trust policy', () => {
      const configs = getIAMRoleConfigs();
      for (const config of configs) {
        expect(config.trustPolicy).toBeDefined();
        expect(config.trustPolicy.Statement).toBeDefined();
      }
    });

    it('each role should have inline policy', () => {
      const configs = getIAMRoleConfigs();
      for (const config of configs) {
        expect(config.inlinePolicy).toBeDefined();
        expect(config.inlinePolicy.Statement).toBeDefined();
      }
    });

    it('each role should have description', () => {
      const configs = getIAMRoleConfigs();
      for (const config of configs) {
        expect(config.description).toBeDefined();
        expect(config.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Least Privilege Validation', () => {
    it('should validate Lambda execution role policy', () => {
      const result = validateLeastPrivilege(LAMBDA_EXECUTION_ROLE_POLICY);
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should validate Bedrock Agent role policy', () => {
      const result = validateLeastPrivilege(BEDROCK_AGENT_ROLE_POLICY);
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should validate all tool role policies', () => {
      const policies = [
        CALENDAR_TOOL_ROLE_POLICY,
        WEATHER_TOOL_ROLE_POLICY,
        CLASSIFIER_TOOL_ROLE_POLICY,
        PARSER_TOOL_ROLE_POLICY,
        NEWSLETTER_PARSER_TOOL_ROLE_POLICY,
      ];

      for (const policy of policies) {
        const result = validateLeastPrivilege(policy);
        expect(result.valid).toBe(true);
      }
    });

    it('should detect overly permissive policies', () => {
      const badPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
          },
        ],
      };

      const result = validateLeastPrivilege(badPolicy);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect wildcard resources with disallowed actions', () => {
      const badPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: 'dynamodb:*',
            Resource: '*',
          },
        ],
      };

      const result = validateLeastPrivilege(badPolicy);
      expect(result.valid).toBe(false);
    });
  });

  describe('ARN Generation', () => {
    it('should generate correct role ARN', () => {
      const arn = getRoleArn('123456789012', 'us-east-1', 'test-role');
      expect(arn).toBe('arn:aws:iam::123456789012:role/test-role');
    });

    it('should generate correct policy ARN', () => {
      const arn = getPolicyArn('123456789012', 'test-policy');
      expect(arn).toBe('arn:aws:iam::123456789012:policy/test-policy');
    });

    it('should handle different account IDs', () => {
      const arn1 = getRoleArn('111111111111', 'us-east-1', 'role');
      const arn2 = getRoleArn('999999999999', 'us-east-1', 'role');
      expect(arn1).not.toBe(arn2);
    });
  });

  describe('Policy Structure', () => {
    it('all policies should have Version field', () => {
      const policies = [
        LAMBDA_EXECUTION_ROLE_POLICY,
        BEDROCK_AGENT_ROLE_POLICY,
        CALENDAR_TOOL_ROLE_POLICY,
        WEATHER_TOOL_ROLE_POLICY,
        CLASSIFIER_TOOL_ROLE_POLICY,
        PARSER_TOOL_ROLE_POLICY,
        NEWSLETTER_PARSER_TOOL_ROLE_POLICY,
      ];

      for (const policy of policies) {
        expect(policy.Version).toBe('2012-10-17');
      }
    });

    it('all policies should have Statement array', () => {
      const policies = [
        LAMBDA_EXECUTION_ROLE_POLICY,
        BEDROCK_AGENT_ROLE_POLICY,
        CALENDAR_TOOL_ROLE_POLICY,
        WEATHER_TOOL_ROLE_POLICY,
        CLASSIFIER_TOOL_ROLE_POLICY,
        PARSER_TOOL_ROLE_POLICY,
        NEWSLETTER_PARSER_TOOL_ROLE_POLICY,
      ];

      for (const policy of policies) {
        expect(Array.isArray(policy.Statement)).toBe(true);
        expect(policy.Statement.length).toBeGreaterThan(0);
      }
    });

    it('all statements should have Effect field', () => {
      const policies = [
        LAMBDA_EXECUTION_ROLE_POLICY,
        BEDROCK_AGENT_ROLE_POLICY,
      ];

      for (const policy of policies) {
        for (const statement of policy.Statement as any[]) {
          expect(statement.Effect).toBeDefined();
          expect(['Allow', 'Deny']).toContain(statement.Effect);
        }
      }
    });

    it('all statements should have Action field', () => {
      const policies = [
        LAMBDA_EXECUTION_ROLE_POLICY,
        BEDROCK_AGENT_ROLE_POLICY,
      ];

      for (const policy of policies) {
        for (const statement of policy.Statement as any[]) {
          expect(statement.Action).toBeDefined();
        }
      }
    });

    it('all statements should have Resource field', () => {
      const policies = [
        LAMBDA_EXECUTION_ROLE_POLICY,
        BEDROCK_AGENT_ROLE_POLICY,
      ];

      for (const policy of policies) {
        for (const statement of policy.Statement as any[]) {
          expect(statement.Resource).toBeDefined();
        }
      }
    });
  });
});
