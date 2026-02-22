/**
 * Tests for Agent Definitions
 * Validates: Requirements 10.1 through 10.10
 */

import { describe, it, expect } from 'vitest';
import {
  WEATHER_AGENT,
  CALENDAR_QUERY_AGENT,
  EVENT_CLASSIFIER_AGENT,
  EVENT_PARSER_AGENT,
  SCHOOL_NEWSLETTER_PARSER_AGENT,
  CONTEXT_ANALYZER,
  FEEDBACK_LEARNER,
  CATEGORY_PREDICTOR,
  WEATHER_EVENT_ASSOCIATOR,
  WEATHER_REMINDER_GENERATOR,
  getAllAgentDefinitions,
  getAgentDefinitionById,
  getAgentDefinitionByType,
  validateAgentDefinition,
} from '../agent-definitions';

describe('Agent Definitions', () => {
  describe('WeatherAgent', () => {
    it('should have valid WeatherAgent definition', () => {
      expect(WEATHER_AGENT.agentId).toBe('weather-agent');
      expect(WEATHER_AGENT.agentType).toBe('WeatherAgent');
      expect(WEATHER_AGENT.enabled).toBe(true);
      expect(WEATHER_AGENT.tools.length).toBeGreaterThan(0);
    });

    it('should have weather-tool in WeatherAgent', () => {
      const tool = WEATHER_AGENT.tools.find((t) => t.toolName === 'weather-tool');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema).toBeDefined();
    });
  });

  describe('CalendarQueryAgent', () => {
    it('should have valid CalendarQueryAgent definition', () => {
      expect(CALENDAR_QUERY_AGENT.agentId).toBe('calendar-query-agent');
      expect(CALENDAR_QUERY_AGENT.agentType).toBe('CalendarQueryAgent');
      expect(CALENDAR_QUERY_AGENT.enabled).toBe(true);
    });

    it('should have calendar-tool in CalendarQueryAgent', () => {
      const tool = CALENDAR_QUERY_AGENT.tools.find((t) => t.toolName === 'calendar-tool');
      expect(tool).toBeDefined();
    });
  });

  describe('EventClassifierAgent', () => {
    it('should have valid EventClassifierAgent definition', () => {
      expect(EVENT_CLASSIFIER_AGENT.agentId).toBe('event-classifier-agent');
      expect(EVENT_CLASSIFIER_AGENT.agentType).toBe('EventClassifierAgent');
      expect(EVENT_CLASSIFIER_AGENT.enabled).toBe(true);
    });

    it('should have classifier-tool in EventClassifierAgent', () => {
      const tool = EVENT_CLASSIFIER_AGENT.tools.find((t) => t.toolName === 'classifier-tool');
      expect(tool).toBeDefined();
    });
  });

  describe('EventParserAgent', () => {
    it('should have valid EventParserAgent definition', () => {
      expect(EVENT_PARSER_AGENT.agentId).toBe('event-parser-agent');
      expect(EVENT_PARSER_AGENT.agentType).toBe('EventParserAgent');
      expect(EVENT_PARSER_AGENT.enabled).toBe(true);
    });

    it('should have parser-tool in EventParserAgent', () => {
      const tool = EVENT_PARSER_AGENT.tools.find((t) => t.toolName === 'parser-tool');
      expect(tool).toBeDefined();
    });
  });

  describe('SchoolNewsletterParserAgent', () => {
    it('should have valid SchoolNewsletterParserAgent definition', () => {
      expect(SCHOOL_NEWSLETTER_PARSER_AGENT.agentId).toBe('school-newsletter-parser-agent');
      expect(SCHOOL_NEWSLETTER_PARSER_AGENT.agentType).toBe('SchoolNewsletterParserAgent');
      expect(SCHOOL_NEWSLETTER_PARSER_AGENT.enabled).toBe(true);
    });

    it('should have newsletter-parser-tool', () => {
      const tool = SCHOOL_NEWSLETTER_PARSER_AGENT.tools.find(
        (t) => t.toolName === 'newsletter-parser-tool'
      );
      expect(tool).toBeDefined();
    });
  });

  describe('ContextAnalyzer', () => {
    it('should have valid ContextAnalyzer definition', () => {
      expect(CONTEXT_ANALYZER.agentId).toBe('context-analyzer');
      expect(CONTEXT_ANALYZER.agentType).toBe('ContextAnalyzer');
      expect(CONTEXT_ANALYZER.enabled).toBe(true);
    });

    it('should have multiple tools', () => {
      expect(CONTEXT_ANALYZER.tools.length).toBeGreaterThan(1);
    });
  });

  describe('FeedbackLearner', () => {
    it('should have valid FeedbackLearner definition', () => {
      expect(FEEDBACK_LEARNER.agentId).toBe('feedback-learner');
      expect(FEEDBACK_LEARNER.agentType).toBe('FeedbackLearner');
      expect(FEEDBACK_LEARNER.enabled).toBe(true);
    });
  });

  describe('CategoryPredictor', () => {
    it('should have valid CategoryPredictor definition', () => {
      expect(CATEGORY_PREDICTOR.agentId).toBe('category-predictor');
      expect(CATEGORY_PREDICTOR.agentType).toBe('CategoryPredictor');
      expect(CATEGORY_PREDICTOR.enabled).toBe(true);
    });
  });

  describe('WeatherEventAssociator', () => {
    it('should have valid WeatherEventAssociator definition', () => {
      expect(WEATHER_EVENT_ASSOCIATOR.agentId).toBe('weather-event-associator');
      expect(WEATHER_EVENT_ASSOCIATOR.agentType).toBe('WeatherEventAssociator');
      expect(WEATHER_EVENT_ASSOCIATOR.enabled).toBe(true);
    });

    it('should have calendar and weather tools', () => {
      const calendarTool = WEATHER_EVENT_ASSOCIATOR.tools.find((t) => t.toolName === 'calendar-tool');
      const weatherTool = WEATHER_EVENT_ASSOCIATOR.tools.find((t) => t.toolName === 'weather-tool');
      expect(calendarTool).toBeDefined();
      expect(weatherTool).toBeDefined();
    });
  });

  describe('WeatherReminderGenerator', () => {
    it('should have valid WeatherReminderGenerator definition', () => {
      expect(WEATHER_REMINDER_GENERATOR.agentId).toBe('weather-reminder-generator');
      expect(WEATHER_REMINDER_GENERATOR.agentType).toBe('WeatherReminderGenerator');
      expect(WEATHER_REMINDER_GENERATOR.enabled).toBe(true);
    });

    it('should have multiple tools', () => {
      expect(WEATHER_REMINDER_GENERATOR.tools.length).toBeGreaterThan(1);
    });
  });

  describe('getAllAgentDefinitions', () => {
    it('should return all 10 agent definitions', () => {
      const agents = getAllAgentDefinitions();
      expect(agents.length).toBe(10);
    });

    it('should include all agent types', () => {
      const agents = getAllAgentDefinitions();
      const types = agents.map((a) => a.agentType);
      expect(types).toContain('WeatherAgent');
      expect(types).toContain('CalendarQueryAgent');
      expect(types).toContain('EventClassifierAgent');
      expect(types).toContain('EventParserAgent');
      expect(types).toContain('SchoolNewsletterParserAgent');
      expect(types).toContain('ContextAnalyzer');
      expect(types).toContain('FeedbackLearner');
      expect(types).toContain('CategoryPredictor');
      expect(types).toContain('WeatherEventAssociator');
      expect(types).toContain('WeatherReminderGenerator');
    });
  });

  describe('getAgentDefinitionById', () => {
    it('should return agent by ID', () => {
      const agent = getAgentDefinitionById('weather-agent');
      expect(agent).toBeDefined();
      expect(agent?.agentType).toBe('WeatherAgent');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = getAgentDefinitionById('non-existent-agent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAgentDefinitionByType', () => {
    it('should return agent by type', () => {
      const agent = getAgentDefinitionByType('WeatherAgent');
      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe('weather-agent');
    });

    it('should return undefined for non-existent type', () => {
      const agent = getAgentDefinitionByType('NonExistentAgent');
      expect(agent).toBeUndefined();
    });
  });

  describe('validateAgentDefinition', () => {
    it('should validate valid agent definition', () => {
      const validation = validateAgentDefinition(WEATHER_AGENT);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject agent with missing agentId', () => {
      const invalidAgent = { ...WEATHER_AGENT, agentId: '' };
      const validation = validateAgentDefinition(invalidAgent);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject agent with invalid temperature', () => {
      const invalidAgent = { ...WEATHER_AGENT, parameters: { ...WEATHER_AGENT.parameters, temperature: 1.5 } };
      const validation = validateAgentDefinition(invalidAgent);
      expect(validation.valid).toBe(false);
    });

    it('should reject agent with invalid maxTokens', () => {
      const invalidAgent = { ...WEATHER_AGENT, parameters: { ...WEATHER_AGENT.parameters, maxTokens: 5000 } };
      const validation = validateAgentDefinition(invalidAgent);
      expect(validation.valid).toBe(false);
    });

    it('should reject agent with empty tools', () => {
      const invalidAgent = { ...WEATHER_AGENT, tools: [] };
      const validation = validateAgentDefinition(invalidAgent);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Agent Parameters', () => {
    it('should have valid temperature values', () => {
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        expect(agent.parameters.temperature).toBeGreaterThanOrEqual(0);
        expect(agent.parameters.temperature).toBeLessThanOrEqual(1);
      });
    });

    it('should have valid maxTokens values', () => {
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        expect(agent.parameters.maxTokens).toBeGreaterThan(0);
        expect(agent.parameters.maxTokens).toBeLessThanOrEqual(4096);
      });
    });

    it('should have foundation model specified', () => {
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        expect(agent.foundationModel).toBeDefined();
        expect(agent.foundationModel.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Agent Tools', () => {
    it('should have valid tool schemas', () => {
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        agent.tools.forEach((tool) => {
          expect(tool.toolName).toBeDefined();
          expect(tool.description).toBeDefined();
          expect(tool.lambdaArn).toBeDefined();
          expect(tool.inputSchema).toBeDefined();
        });
      });
    });

    it('should have unique tool names within agent', () => {
      const agents = getAllAgentDefinitions();
      agents.forEach((agent) => {
        const toolNames = agent.tools.map((t) => t.toolName);
        const uniqueNames = new Set(toolNames);
        expect(uniqueNames.size).toBe(toolNames.length);
      });
    });
  });
});
