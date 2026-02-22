/**
 * Checkpoint Tests - Verify all core components are functional
 * Task 12: Ensure all core components are functional
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllAgentDefinitions, validateAgentDefinition } from '../agent-definitions';
import {
  formatSuccessResponse,
  formatErrorResponse,
  formatHTTPResponse,
} from '../response-formatter';
import { validateAgentExecutionRequest } from '../request-validator';
import { StructuredLogger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

describe('Checkpoint - Core Components Verification', () => {
  describe('Lambda Handler Component', () => {
    it('should accept valid agent execution requests', () => {
      const request = {
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        input: { location: 'Seattle' },
      };

      const validation = validateAgentExecutionRequest(request);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid agent execution requests', () => {
      const request = {
        agentId: '',
        agentType: 'WeatherAgent',
        input: {},
      };

      const validation = validateAgentExecutionRequest(request);
      expect(validation.valid).toBe(false);
    });

    it('should format success responses correctly', () => {
      const response = formatSuccessResponse(
        uuidv4(),
        'weather-agent',
        { temperature: 72 },
        {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          modelUsed: 'claude-3-sonnet',
        }
      );

      expect(response.status).toBe('success');
      expect(response.result).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it('should format error responses correctly', () => {
      const response = formatErrorResponse(
        uuidv4(),
        'weather-agent',
        'Test error',
        'TEST_ERROR'
      );

      expect(response.status).toBe('failure');
      expect(response.error).toBeDefined();
    });

    it('should format HTTP responses correctly', () => {
      const httpResponse = formatHTTPResponse(200, {
        status: 'success',
        result: {},
      });

      expect(httpResponse.statusCode).toBe(200);
      expect(httpResponse.headers).toBeDefined();
      expect(httpResponse.body).toBeDefined();
    });
  });

  describe('Bedrock Agent Integration Component', () => {
    it('should have all 10 agent types defined', () => {
      const agents = getAllAgentDefinitions();
      expect(agents.length).toBe(10);
    });

    it('should have WeatherAgent defined', () => {
      const agents = getAllAgentDefinitions();
      const weatherAgent = agents.find((a) => a.agentType === 'WeatherAgent');
      expect(weatherAgent).toBeDefined();
      expect(weatherAgent?.enabled).toBe(true);
    });

    it('should have CalendarQueryAgent defined', () => {
      const agents = getAllAgentDefinitions();
      const calendarAgent = agents.find((a) => a.agentType === 'CalendarQueryAgent');
      expect(calendarAgent).toBeDefined();
      expect(calendarAgent?.enabled).toBe(true);
    });

    it('should have EventClassifierAgent defined', () => {
      const agents = getAllAgentDefinitions();
      const classifierAgent = agents.find((a) => a.agentType === 'EventClassifierAgent');
      expect(classifierAgent).toBeDefined();
      expect(classifierAgent?.enabled).toBe(true);
    });

    it('should have EventParserAgent defined', () => {
      const agents = getAllAgentDefinitions();
      const parserAgent = agents.find((a) => a.agentType === 'EventParserAgent');
      expect(parserAgent).toBeDefined();
      expect(parserAgent?.enabled).toBe(true);
    });

    it('should have SchoolNewsletterParserAgent defined', () => {
      const agents = getAllAgentDefinitions();
      const newsletterAgent = agents.find((a) => a.agentType === 'SchoolNewsletterParserAgent');
      expect(newsletterAgent).toBeDefined();
      expect(newsletterAgent?.enabled).toBe(true);
    });

    it('should have ContextAnalyzer defined', () => {
      const agents = getAllAgentDefinitions();
      const contextAgent = agents.find((a) => a.agentType === 'ContextAnalyzer');
      expect(contextAgent).toBeDefined();
      expect(contextAgent?.enabled).toBe(true);
    });

    it('should have FeedbackLearner defined', () => {
      const agents = getAllAgentDefinitions();
      const feedbackAgent = agents.find((a) => a.agentType === 'FeedbackLearner');
      expect(feedbackAgent).toBeDefined();
      expect(feedbackAgent?.enabled).toBe(true);
    });

    it('should have CategoryPredictor defined', () => {
      const agents = getAllAgentDefinitions();
      const predictorAgent = agents.find((a) => a.agentType === 'CategoryPredictor');
      expect(predictorAgent).toBeDefined();
      expect(predictorAgent?.enabled).toBe(true);
    });

    it('should have WeatherEventAssociator defined', () => {
      const agents = getAllAgentDefinitions();
      const associatorAgent = agents.find((a) => a.agentType === 'WeatherEventAssociator');
      expect(associatorAgent).toBeDefined();
      expect(associatorAgent?.enabled).toBe(true);
    });

    it('should have WeatherReminderGenerator defined', () => {
      const agents = getAllAgentDefinitions();
      const reminderAgent = agents.find((a) => a.agentType === 'WeatherReminderGenerator');
      expect(reminderAgent).toBeDefined();
      expect(reminderAgent?.enabled).toBe(true);
    });

    it('should have valid tool configurations for all agents', () => {
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        expect(agent.tools.length).toBeGreaterThan(0);
        agent.tools.forEach((tool) => {
          expect(tool.toolName).toBeDefined();
          expect(tool.description).toBeDefined();
          expect(tool.lambdaArn).toBeDefined();
          expect(tool.inputSchema).toBeDefined();
        });
      });
    });
  });

  describe('Tool Lambda Functions Component', () => {
    it('should have calendar-tool defined', () => {
      const agents = getAllAgentDefinitions();
      const hasCalendarTool = agents.some((a) =>
        a.tools.some((t) => t.toolName === 'calendar-tool')
      );
      expect(hasCalendarTool).toBe(true);
    });

    it('should have weather-tool defined', () => {
      const agents = getAllAgentDefinitions();
      const hasWeatherTool = agents.some((a) =>
        a.tools.some((t) => t.toolName === 'weather-tool')
      );
      expect(hasWeatherTool).toBe(true);
    });

    it('should have classifier-tool defined', () => {
      const agents = getAllAgentDefinitions();
      const hasClassifierTool = agents.some((a) =>
        a.tools.some((t) => t.toolName === 'classifier-tool')
      );
      expect(hasClassifierTool).toBe(true);
    });

    it('should have parser-tool defined', () => {
      const agents = getAllAgentDefinitions();
      const hasParserTool = agents.some((a) =>
        a.tools.some((t) => t.toolName === 'parser-tool')
      );
      expect(hasParserTool).toBe(true);
    });

    it('should have newsletter-parser-tool defined', () => {
      const agents = getAllAgentDefinitions();
      const hasNewsletterTool = agents.some((a) =>
        a.tools.some((t) => t.toolName === 'newsletter-parser-tool')
      );
      expect(hasNewsletterTool).toBe(true);
    });
  });

  describe('DynamoDB Persistence Component', () => {
    it('should have agent execution record structure', () => {
      // Verify that agent definitions can be persisted
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        const validation = validateAgentDefinition(agent);
        expect(validation.valid).toBe(true);
      });
    });

    it('should support agent configuration storage', () => {
      const agents = getAllAgentDefinitions();
      expect(agents.length).toBeGreaterThan(0);
      agents.forEach((agent) => {
        expect(agent.agentId).toBeDefined();
        expect(agent.agentType).toBeDefined();
        expect(agent.foundationModel).toBeDefined();
      });
    });
  });

  describe('SNS Event Publishing Component', () => {
    it('should format execution events correctly', () => {
      const response = formatSuccessResponse(
        uuidv4(),
        'weather-agent',
        { temperature: 72 },
        {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          modelUsed: 'claude-3-sonnet',
        }
      );

      expect(response.executionId).toBeDefined();
      expect(response.agentId).toBeDefined();
      expect(response.status).toBeDefined();
      expect(response.result).toBeDefined();
    });
  });

  describe('CloudWatch Logging Component', () => {
    it('should create logger instances', () => {
      const logger = new StructuredLogger();
      expect(logger).toBeDefined();
      expect(logger.getCorrelationId()).toBeDefined();
    });

    it('should support structured logging', () => {
      const logger = new StructuredLogger();
      expect(() => {
        logger.info('Test message', { key: 'value' });
        logger.warn('Test warning', { key: 'value' });
        logger.debug('Test debug', { key: 'value' });
      }).not.toThrow();
    });

    it('should support error logging', () => {
      const logger = new StructuredLogger();
      const error = new Error('Test error');
      expect(() => {
        logger.error('Test error message', error);
      }).not.toThrow();
    });
  });

  describe('CloudWatch Metrics Component', () => {
    it('should have metrics publisher module', async () => {
      // Verify metrics publisher is available
      const { publishMetric } = await import('../metrics-publisher');
      expect(publishMetric).toBeDefined();
    });

    it('should have alarms configuration module', async () => {
      // Verify alarms configuration is available
      const { createOrUpdateAlarm } = await import('../cloudwatch-alarms');
      expect(createOrUpdateAlarm).toBeDefined();
    });

    it('should have log group configuration module', async () => {
      // Verify log group configuration is available
      const { createLogGroup } = await import('../log-group-config');
      expect(createLogGroup).toBeDefined();
    });
  });

  describe('IAM and Security Component', () => {
    it('should have IAM configuration defined', async () => {
      const { getIAMRoleConfigs } = await import('../iam-config');
      const configs = getIAMRoleConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });
  });

  describe('Overall System Integration', () => {
    it('should have all required modules exported', async () => {
      const bedrockAgent = await import('../index');
      expect(bedrockAgent.getAllAgentDefinitions).toBeDefined();
      expect(bedrockAgent.validateAgentExecutionRequest).toBeDefined();
      expect(bedrockAgent.formatSuccessResponse).toBeDefined();
      expect(bedrockAgent.StructuredLogger).toBeDefined();
    });

    it('should support end-to-end request flow', () => {
      // Verify request validation
      const request = {
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        input: { location: 'Seattle' },
      };

      const validation = validateAgentExecutionRequest(request);
      expect(validation.valid).toBe(true);

      // Verify response formatting
      const response = formatSuccessResponse(
        uuidv4(),
        request.agentId,
        { temperature: 72 },
        {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          modelUsed: 'claude-3-sonnet',
        }
      );

      expect(response.status).toBe('success');
      expect(response.agentId).toBe(request.agentId);
    });
  });
});
