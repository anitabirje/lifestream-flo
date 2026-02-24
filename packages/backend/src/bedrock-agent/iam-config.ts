/**
 * IAM Roles and Permissions Configuration
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

/**
 * Lambda Execution Role Policy
 * Permissions required for the main agent executor Lambda function
 */
export const LAMBDA_EXECUTION_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'BedrockInvoke',
      Effect: 'Allow',
      Action: ['bedrock:InvokeAgent', 'bedrock:InvokeModel'],
      Resource: 'arn:aws:bedrock:*:*:agent/*',
    },
    {
      Sid: 'DynamoDBAccess',
      Effect: 'Allow',
      Action: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      Resource: [
        'arn:aws:dynamodb:*:*:table/agent-executions',
        'arn:aws:dynamodb:*:*:table/agent-configurations',
        'arn:aws:dynamodb:*:*:table/agent-executions/index/*',
      ],
    },
    {
      Sid: 'SNSPublish',
      Effect: 'Allow',
      Action: ['sns:Publish'],
      Resource: 'arn:aws:sns:*:*:agent-*',
    },
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: 'arn:aws:logs:*:*:*',
    },
    {
      Sid: 'CloudWatchMetrics',
      Effect: 'Allow',
      Action: ['cloudwatch:PutMetricData'],
      Resource: '*',
    },
    {
      Sid: 'LambdaToolInvoke',
      Effect: 'Allow',
      Action: ['lambda:InvokeFunction'],
      Resource: 'arn:aws:lambda:*:*:function:agent-tool-*',
    },
  ],
};

/**
 * Bedrock Agent Execution Role Policy
 * Permissions required for Bedrock Agents to invoke tools and models
 */
export const BEDROCK_AGENT_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'LambdaToolInvoke',
      Effect: 'Allow',
      Action: ['lambda:InvokeFunction'],
      Resource: 'arn:aws:lambda:*:*:function:agent-tool-*',
    },
    {
      Sid: 'BedrockModelInvoke',
      Effect: 'Allow',
      Action: ['bedrock:InvokeModel'],
      Resource: 'arn:aws:bedrock:*:*:foundation-model/*',
    },
  ],
};

/**
 * Calendar Tool Lambda Role Policy
 * Minimal permissions for calendar tool
 */
export const CALENDAR_TOOL_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DynamoDBRead',
      Effect: 'Allow',
      Action: ['dynamodb:GetItem', 'dynamodb:Query'],
      Resource: 'arn:aws:dynamodb:*:*:table/calendar-events',
    },
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/agent-tool-calendar*',
    },
  ],
};

/**
 * Weather Tool Lambda Role Policy
 * Minimal permissions for weather tool
 */
export const WEATHER_TOOL_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/agent-tool-weather*',
    },
  ],
};

/**
 * Classifier Tool Lambda Role Policy
 * Minimal permissions for classifier tool
 */
export const CLASSIFIER_TOOL_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DynamoDBRead',
      Effect: 'Allow',
      Action: ['dynamodb:GetItem', 'dynamodb:Query'],
      Resource: 'arn:aws:dynamodb:*:*:table/activity-categories',
    },
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/agent-tool-classifier*',
    },
  ],
};

/**
 * Parser Tool Lambda Role Policy
 * Minimal permissions for parser tool
 */
export const PARSER_TOOL_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/agent-tool-parser*',
    },
  ],
};

/**
 * Newsletter Parser Tool Lambda Role Policy
 * Minimal permissions for newsletter parser tool
 */
export const NEWSLETTER_PARSER_TOOL_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/agent-tool-newsletter-parser*',
    },
  ],
};

/**
 * Trust policy for Lambda execution role
 * Allows Lambda service to assume the role
 */
export const LAMBDA_TRUST_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com',
      },
      Action: 'sts:AssumeRole',
    },
  ],
};

/**
 * Trust policy for Bedrock Agent execution role
 * Allows Bedrock service to assume the role
 */
export const BEDROCK_AGENT_TRUST_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'bedrock.amazonaws.com',
      },
      Action: 'sts:AssumeRole',
    },
  ],
};

/**
 * IAM Role Configuration
 */
export interface IAMRoleConfig {
  roleName: string;
  trustPolicy: Record<string, unknown>;
  inlinePolicy: Record<string, unknown>;
  description: string;
}

/**
 * Get all IAM role configurations
 */
export function getIAMRoleConfigs(): IAMRoleConfig[] {
  return [
    {
      roleName: 'bedrock-agent-lambda-role',
      trustPolicy: LAMBDA_TRUST_POLICY,
      inlinePolicy: LAMBDA_EXECUTION_ROLE_POLICY,
      description: 'Execution role for Bedrock Agent Lambda handler',
    },
    {
      roleName: 'bedrock-agent-execution-role',
      trustPolicy: BEDROCK_AGENT_TRUST_POLICY,
      inlinePolicy: BEDROCK_AGENT_ROLE_POLICY,
      description: 'Execution role for Bedrock Agents',
    },
    {
      roleName: 'agent-tool-calendar-role',
      trustPolicy: LAMBDA_TRUST_POLICY,
      inlinePolicy: CALENDAR_TOOL_ROLE_POLICY,
      description: 'Execution role for Calendar Tool Lambda',
    },
    {
      roleName: 'agent-tool-weather-role',
      trustPolicy: LAMBDA_TRUST_POLICY,
      inlinePolicy: WEATHER_TOOL_ROLE_POLICY,
      description: 'Execution role for Weather Tool Lambda',
    },
    {
      roleName: 'agent-tool-classifier-role',
      trustPolicy: LAMBDA_TRUST_POLICY,
      inlinePolicy: CLASSIFIER_TOOL_ROLE_POLICY,
      description: 'Execution role for Classifier Tool Lambda',
    },
    {
      roleName: 'agent-tool-parser-role',
      trustPolicy: LAMBDA_TRUST_POLICY,
      inlinePolicy: PARSER_TOOL_ROLE_POLICY,
      description: 'Execution role for Parser Tool Lambda',
    },
    {
      roleName: 'agent-tool-newsletter-parser-role',
      trustPolicy: LAMBDA_TRUST_POLICY,
      inlinePolicy: NEWSLETTER_PARSER_TOOL_ROLE_POLICY,
      description: 'Execution role for Newsletter Parser Tool Lambda',
    },
  ];
}

/**
 * Validate IAM policy for least privilege
 */
export function validateLeastPrivilege(policy: Record<string, unknown>): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for wildcard resources (except where necessary)
  const statements = (policy.Statement as any[]) || [];
  for (const statement of statements) {
    if (statement.Resource === '*') {
      // Allow wildcards only for specific actions
      const allowedWildcardActions = [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'cloudwatch:PutMetricData',
        'bedrock:InvokeModel',
      ];

      const actions = Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action];
      const hasDisallowedAction = actions.some(
        (action: string) => !allowedWildcardActions.includes(action)
      );

      if (hasDisallowedAction) {
        issues.push(
          `Wildcard resource (*) used with action: ${actions.join(', ')}`
        );
      }
    }
  }

  // Check for overly permissive actions
  for (const statement of statements) {
    const actions = Array.isArray(statement.Action)
      ? statement.Action
      : [statement.Action];

    for (const action of actions) {
      if (action === '*' || action.endsWith(':*')) {
        issues.push(`Overly permissive action: ${action}`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get role ARN from role name
 */
export function getRoleArn(
  accountId: string,
  region: string,
  roleName: string
): string {
  return `arn:aws:iam::${accountId}:role/${roleName}`;
}

/**
 * Get policy ARN from policy name
 */
export function getPolicyArn(
  accountId: string,
  policyName: string
): string {
  return `arn:aws:iam::${accountId}:policy/${policyName}`;
}
