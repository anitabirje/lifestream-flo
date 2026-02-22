# Bedrock Agent Migration - Operational Runbook

## Overview

This runbook provides operational procedures for managing the Bedrock Agent system in production.

## Daily Operations

### 1. Health Check

**Frequency**: Every 4 hours

```bash
# Check Lambda function status
aws lambda get-function --function-name agent-executor

# Check DynamoDB table status
aws dynamodb describe-table --table-name agent-executions

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-names AgentExecutionFailureRate
```

### 2. Monitor Key Metrics

**Metrics to Monitor**:
- Agent execution success rate (target: > 95%)
- Average execution latency (target: < 2 seconds)
- Tool invocation error rate (target: < 5%)
- DynamoDB read/write latency (target: < 100ms)

**CloudWatch Queries**:
```
# Success rate
fields status
| stats count() as total, count(status="success") as successful
| fields (successful/total)*100 as success_rate

# Average latency
fields duration
| stats avg(duration) as avg_latency
```

### 3. Review Error Logs

**Frequency**: Daily

```bash
# Query for errors in the last 24 hours
aws logs filter-log-events \
  --log-group-name /aws/lambda/agent-executor \
  --filter-pattern "ERROR" \
  --start-time $(date -d '24 hours ago' +%s)000
```

## Troubleshooting

### Issue: High Agent Execution Failure Rate

**Symptoms**:
- Agent execution success rate drops below 90%
- CloudWatch alarm "AgentExecutionFailureRate" triggered

**Diagnosis**:
```bash
# Check recent errors
aws logs tail /aws/lambda/agent-executor --follow --filter-pattern "ERROR"

# Check Bedrock service status
aws bedrock describe-foundation-models

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=agent-executions \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**Resolution**:
1. Check if Bedrock service is experiencing issues
2. Verify DynamoDB capacity is sufficient
3. Check Lambda function logs for specific errors
4. If Bedrock unavailable, activate fallback mechanisms
5. Increase Lambda memory/timeout if needed

### Issue: High Latency

**Symptoms**:
- Average execution latency exceeds 5 seconds
- CloudWatch alarm "LambdaDurationHigh" triggered

**Diagnosis**:
```bash
# Check Lambda duration metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=agent-executor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check Bedrock latency
aws cloudwatch get-metric-statistics \
  --namespace BedrockAgentMigration \
  --metric-name BedrockLatency \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

**Resolution**:
1. Increase Lambda memory allocation
2. Check if Bedrock is experiencing rate limiting
3. Optimize agent logic to reduce execution time
4. Check DynamoDB latency
5. Consider using Lambda provisioned concurrency

### Issue: DynamoDB Throttling

**Symptoms**:
- DynamoDB write failures
- CloudWatch alarm "DynamoDBThrottling" triggered

**Diagnosis**:
```bash
# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=agent-executions \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=agent-executions \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Resolution**:
1. If using provisioned billing, increase write capacity
2. If using on-demand billing, check for hot partitions
3. Implement exponential backoff retry logic
4. Consider enabling DynamoDB auto-scaling
5. Review data model for optimization opportunities

### Issue: Bedrock Rate Limiting

**Symptoms**:
- Bedrock API returns 429 (Too Many Requests)
- Execution failures with rate limit errors

**Diagnosis**:
```bash
# Check Bedrock latency metrics
aws cloudwatch get-metric-statistics \
  --namespace BedrockAgentMigration \
  --metric-name BedrockLatency \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check error logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/agent-executor \
  --filter-pattern "429"
```

**Resolution**:
1. Implement exponential backoff retry logic (already implemented)
2. Reduce concurrent requests to Bedrock
3. Request quota increase from AWS
4. Implement request queuing mechanism
5. Consider using different Bedrock models with higher quotas

## Maintenance Tasks

### Weekly Tasks

1. **Review CloudWatch Alarms**
   ```bash
   aws cloudwatch describe-alarms --state-value ALARM
   ```

2. **Check DynamoDB Capacity**
   ```bash
   aws dynamodb describe-table --table-name agent-executions
   ```

3. **Review Error Logs**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/agent-executor \
     --filter-pattern "ERROR" \
     --start-time $(date -d '7 days ago' +%s)000
   ```

### Monthly Tasks

1. **Update Lambda Runtime**
   - Check for new Node.js LTS versions
   - Test in staging environment
   - Deploy to production

2. **Review and Optimize Costs**
   - Check Lambda invocation costs
   - Review DynamoDB usage
   - Optimize data retention policies

3. **Security Audit**
   - Review IAM permissions
   - Check for unused resources
   - Verify encryption settings

### Quarterly Tasks

1. **Disaster Recovery Drill**
   - Test backup and recovery procedures
   - Verify RTO/RPO targets
   - Document lessons learned

2. **Performance Optimization**
   - Analyze execution patterns
   - Identify bottlenecks
   - Implement optimizations

3. **Capacity Planning**
   - Review growth trends
   - Forecast future capacity needs
   - Plan infrastructure upgrades

## Configuration Management

### Updating Agent Configuration

```bash
# Update agent parameters
aws dynamodb update-item \
  --table-name agent-configurations \
  --key '{"agentId":{"S":"weather-agent"}}' \
  --update-expression "SET #params = :params" \
  --expression-attribute-names '{"#params":"parameters"}' \
  --expression-attribute-values '{":params":{"M":{"temperature":{"N":"0.8"},"maxTokens":{"N":"3000"}}}}'
```

### Enabling/Disabling Agents

```bash
# Disable agent
aws dynamodb update-item \
  --table-name agent-configurations \
  --key '{"agentId":{"S":"weather-agent"}}' \
  --update-expression "SET enabled = :enabled" \
  --expression-attribute-values '{":enabled":{"BOOL":false}}'

# Enable agent
aws dynamodb update-item \
  --table-name agent-configurations \
  --key '{"agentId":{"S":"weather-agent"}}' \
  --update-expression "SET enabled = :enabled" \
  --expression-attribute-values '{":enabled":{"BOOL":true}}'
```

## Incident Response

### Incident Severity Levels

- **Critical**: System unavailable, > 50% failure rate
- **High**: Degraded performance, 20-50% failure rate
- **Medium**: Minor issues, < 20% failure rate
- **Low**: Non-critical issues, no user impact

### Critical Incident Response

1. **Immediate Actions** (0-5 minutes)
   - Acknowledge incident
   - Assess impact
   - Notify on-call team

2. **Investigation** (5-15 minutes)
   - Check CloudWatch logs
   - Review metrics
   - Identify root cause

3. **Mitigation** (15-30 minutes)
   - Implement temporary fix
   - Activate fallback mechanisms
   - Communicate status

4. **Resolution** (30+ minutes)
   - Implement permanent fix
   - Deploy to production
   - Verify resolution

5. **Post-Incident** (24 hours)
   - Document incident
   - Conduct root cause analysis
   - Implement preventive measures

## Escalation Procedures

### Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Senior engineer
3. **Level 3**: Engineering manager
4. **Level 4**: AWS support (if infrastructure issue)

### Contact Information

- On-call: [Slack channel or phone number]
- Senior Engineer: [Contact info]
- Manager: [Contact info]
- AWS Support: [Support plan details]

## Documentation

### Key Documents

- Deployment Guide: `DEPLOYMENT_GUIDE.md`
- API Documentation: `API_DOCUMENTATION.md`
- Architecture Diagram: `ARCHITECTURE.md`
- Troubleshooting Guide: This document

### Updating Documentation

- Update when procedures change
- Include examples and commands
- Keep runbooks current
- Review quarterly
