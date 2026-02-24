# Bedrock Agent Migration - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the AWS Bedrock Agent migration to production.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- Node.js 18+ and npm installed
- Docker (for containerized deployment)
- Terraform or CloudFormation (for infrastructure as code)

## Infrastructure Setup

### 1. Create IAM Roles

Create the Lambda execution role with the following permissions:

```bash
# Create Lambda execution role
aws iam create-role \
  --role-name bedrock-agent-lambda-role \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name bedrock-agent-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy \
  --role-name bedrock-agent-lambda-role \
  --policy-name bedrock-agent-policy \
  --policy-document file://lambda-policy.json
```

### 2. Create DynamoDB Tables

```bash
# Create agent-executions table
aws dynamodb create-table \
  --table-name agent-executions \
  --attribute-definitions \
    AttributeName=executionId,AttributeType=S \
    AttributeName=agentId,AttributeType=S \
  --key-schema \
    AttributeName=executionId,KeyType=HASH \
    AttributeName=agentId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Create agent-configurations table
aws dynamodb create-table \
  --table-name agent-configurations \
  --attribute-definitions \
    AttributeName=agentId,AttributeType=S \
  --key-schema \
    AttributeName=agentId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 3. Create SNS Topics

```bash
# Create SNS topic for agent events
aws sns create-topic --name agent-execution-events

# Create SNS topic for alarms
aws sns create-topic --name bedrock-agent-alarms
```

### 4. Create CloudWatch Log Groups

```bash
# Create log groups
aws logs create-log-group --log-group-name /aws/lambda/agent-executor
aws logs create-log-group --log-group-name /aws/bedrock/agents

# Set retention policy
aws logs put-retention-policy \
  --log-group-name /aws/lambda/agent-executor \
  --retention-in-days 30
```

## Lambda Deployment

### 1. Build the Application

```bash
cd packages/backend
npm install
npm run build
```

### 2. Package Lambda Functions

```bash
# Create deployment package
zip -r agent-executor.zip dist/ node_modules/

# Create tool Lambda packages
zip -r agent-tool-weather.zip dist/bedrock-agent/tools/weather-tool.js
zip -r agent-tool-calendar.zip dist/bedrock-agent/tools/calendar-tool.js
zip -r agent-tool-classifier.zip dist/bedrock-agent/tools/classifier-tool.js
zip -r agent-tool-parser.zip dist/bedrock-agent/tools/parser-tool.js
zip -r agent-tool-newsletter-parser.zip dist/bedrock-agent/tools/newsletter-parser-tool.js
```

### 3. Deploy Lambda Functions

```bash
# Deploy main handler
aws lambda create-function \
  --function-name agent-executor \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/bedrock-agent-lambda-role \
  --handler dist/bedrock-agent/lambda-handler.handler \
  --zip-file fileb://agent-executor.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{AWS_REGION=us-east-1,LOG_LEVEL=INFO}"

# Deploy tool Lambdas
aws lambda create-function \
  --function-name agent-tool-weather \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/bedrock-agent-lambda-role \
  --handler dist/bedrock-agent/tools/weather-tool.handler \
  --zip-file fileb://agent-tool-weather.zip \
  --timeout 30 \
  --memory-size 256
```

### 4. Configure Environment Variables

```bash
# Set environment variables for Lambda
aws lambda update-function-configuration \
  --function-name agent-executor \
  --environment Variables="{
    AWS_REGION=us-east-1,
    LOG_LEVEL=INFO,
    AGENT_CONFIGURATIONS_TABLE=agent-configurations,
    AGENT_EXECUTIONS_TABLE=agent-executions,
    SNS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:agent-execution-events,
    CLOUDWATCH_NAMESPACE=BedrockAgentMigration
  }"
```

## API Gateway Setup

### 1. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
  --name bedrock-agent-api \
  --description "Bedrock Agent Execution API"
```

### 2. Create Resources and Methods

```bash
# Create /agents resource
aws apigateway create-resource \
  --rest-api-id API_ID \
  --parent-id ROOT_ID \
  --path-part agents

# Create /{agentId} resource
aws apigateway create-resource \
  --rest-api-id API_ID \
  --parent-id AGENTS_RESOURCE_ID \
  --path-part "{agentId}"

# Create /execute method
aws apigateway put-method \
  --rest-api-id API_ID \
  --resource-id AGENT_ID_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE
```

### 3. Integrate with Lambda

```bash
# Create Lambda integration
aws apigateway put-integration \
  --rest-api-id API_ID \
  --resource-id AGENT_ID_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:ACCOUNT_ID:function:agent-executor/invocations
```

## Monitoring and Alarms

### 1. Create CloudWatch Alarms

```bash
# Agent execution failure rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name AgentExecutionFailureRate \
  --alarm-description "Alert when agent execution failure rate exceeds 5%" \
  --metric-name AgentExecutionFailure \
  --namespace BedrockAgentMigration \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:bedrock-agent-alarms
```

### 2. Configure Log Insights Queries

```
# Query for execution errors
fields @timestamp, @message, agentId, status
| filter status = "failure"
| stats count() by agentId

# Query for performance metrics
fields @timestamp, duration
| stats avg(duration), max(duration), pct(duration, 95) by bin(5m)
```

## Testing Deployment

### 1. Test Agent Execution

```bash
# Test weather agent
curl -X POST https://API_ENDPOINT/agents/weather-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "weather-agent",
    "agentType": "WeatherAgent",
    "input": {"location": "Seattle"}
  }'
```

### 2. Verify DynamoDB Persistence

```bash
# Query execution records
aws dynamodb query \
  --table-name agent-executions \
  --key-condition-expression "executionId = :id" \
  --expression-attribute-values '{":id":{"S":"EXECUTION_ID"}}'
```

### 3. Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /aws/lambda/agent-executor --follow
```

## Rollback Procedure

### 1. Revert Lambda Functions

```bash
# Update function code to previous version
aws lambda update-function-code \
  --function-name agent-executor \
  --zip-file fileb://agent-executor-previous.zip
```

### 2. Verify Rollback

```bash
# Test agent execution
curl -X POST https://API_ENDPOINT/agents/weather-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "weather-agent",
    "agentType": "WeatherAgent",
    "input": {"location": "Seattle"}
  }'
```

## Performance Tuning

### 1. Lambda Configuration

- **Memory**: 512 MB (adjust based on load testing results)
- **Timeout**: 60 seconds (adjust based on agent execution time)
- **Concurrency**: Set reserved concurrency to handle peak load

### 2. DynamoDB Configuration

- **Billing Mode**: PAY_PER_REQUEST (for variable load)
- **Global Secondary Indexes**: Create for common query patterns
- **TTL**: Enable for automatic cleanup of old execution records

### 3. API Gateway Configuration

- **Throttling**: Set rate limits to prevent abuse
- **Caching**: Enable caching for frequently accessed resources
- **CORS**: Configure for cross-origin requests

## Security Considerations

### 1. IAM Least Privilege

- Lambda execution role has minimal required permissions
- Tool Lambda functions have separate roles with specific permissions
- Bedrock Agent role restricted to specific models and actions

### 2. Encryption

- Enable encryption at rest for DynamoDB tables
- Enable encryption in transit for all API calls
- Use AWS Secrets Manager for sensitive configuration

### 3. Audit Logging

- Enable CloudTrail for API calls
- Enable DynamoDB Streams for data changes
- Configure CloudWatch Logs for application logs

## Maintenance

### 1. Regular Updates

- Update Lambda runtime to latest Node.js version
- Update AWS SDK dependencies
- Apply security patches

### 2. Monitoring

- Review CloudWatch metrics daily
- Check alarm status
- Review error logs for issues

### 3. Backup and Recovery

- Enable DynamoDB point-in-time recovery
- Regular backups of configuration data
- Document recovery procedures

## Support and Troubleshooting

### Common Issues

1. **Lambda Timeout**: Increase timeout or optimize agent logic
2. **DynamoDB Throttling**: Enable auto-scaling or increase provisioned capacity
3. **Bedrock Rate Limiting**: Implement exponential backoff retry logic
4. **Cold Start Latency**: Use Lambda provisioned concurrency

### Getting Help

- Check CloudWatch Logs for error messages
- Review AWS documentation for service limits
- Contact AWS Support for infrastructure issues
