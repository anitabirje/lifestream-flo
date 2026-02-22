/**
 * Agent Definitions for AWS Bedrock Agents
 * Defines all 10 agent types with their configurations, tools, and parameters
 * Validates: Requirements 10.1 through 10.10
 */

export interface AgentDefinition {
  agentId: string;
  agentName: string;
  agentType: string;
  description: string;
  foundationModel: string;
  tools: Array<{
    toolName: string;
    description: string;
    lambdaArn: string;
    inputSchema: Record<string, unknown>;
  }>;
  parameters: {
    temperature: number;
    maxTokens: number;
  };
  enabled: boolean;
}

/**
 * WeatherAgent - Fetches weather data and generates weather-related insights
 * Validates: Requirement 10.1
 */
export const WEATHER_AGENT: AgentDefinition = {
  agentId: 'weather-agent',
  agentName: 'WeatherAgent',
  agentType: 'WeatherAgent',
  description: 'Fetches weather data and generates weather-related insights',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'weather-tool',
      description: 'Fetches current weather conditions and forecasts for a location',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-weather',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'Location for weather data (city, coordinates, etc.)',
          },
          units: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature units',
          },
          forecastDays: {
            type: 'number',
            description: 'Number of forecast days (1-10)',
          },
        },
        required: ['location'],
      },
    },
  ],
  parameters: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * CalendarQueryAgent - Queries calendar data and extracts event information
 * Validates: Requirement 10.2
 */
export const CALENDAR_QUERY_AGENT: AgentDefinition = {
  agentId: 'calendar-query-agent',
  agentName: 'CalendarQueryAgent',
  agentType: 'CalendarQueryAgent',
  description: 'Queries calendar data and extracts event information',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'calendar-tool',
      description: 'Queries calendar events with filtering and date range support',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-calendar',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in ISO 8601 format',
          },
          endDate: {
            type: 'string',
            description: 'End date in ISO 8601 format',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Event categories to filter by',
          },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Attendee emails to filter by',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
  ],
  parameters: {
    temperature: 0.5,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * EventClassifierAgent - Classifies events into predefined categories
 * Validates: Requirement 10.3
 */
export const EVENT_CLASSIFIER_AGENT: AgentDefinition = {
  agentId: 'event-classifier-agent',
  agentName: 'EventClassifierAgent',
  agentType: 'EventClassifierAgent',
  description: 'Classifies events into predefined categories',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'classifier-tool',
      description: 'Classifies events into categories with confidence scores',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-classifier',
      inputSchema: {
        type: 'object',
        properties: {
          eventTitle: {
            type: 'string',
            description: 'Event title to classify',
          },
          eventDescription: {
            type: 'string',
            description: 'Event description for context',
          },
          availableCategories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available categories to classify into',
          },
        },
        required: ['eventTitle', 'availableCategories'],
      },
    },
  ],
  parameters: {
    temperature: 0.3,
    maxTokens: 1024,
  },
  enabled: true,
};

/**
 * EventParserAgent - Parses event data from various formats
 * Validates: Requirement 10.4
 */
export const EVENT_PARSER_AGENT: AgentDefinition = {
  agentId: 'event-parser-agent',
  agentName: 'EventParserAgent',
  agentType: 'EventParserAgent',
  description: 'Parses event data from various formats',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'parser-tool',
      description: 'Parses event data from various formats into structured objects',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-parser',
      inputSchema: {
        type: 'object',
        properties: {
          eventData: {
            type: 'string',
            description: 'Event data in various formats (text, JSON, etc.)',
          },
          format: {
            type: 'string',
            enum: ['text', 'json', 'ical', 'csv'],
            description: 'Format of the event data',
          },
        },
        required: ['eventData'],
      },
    },
  ],
  parameters: {
    temperature: 0.5,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * SchoolNewsletterParserAgent - Parses school newsletter content
 * Validates: Requirement 10.5
 */
export const SCHOOL_NEWSLETTER_PARSER_AGENT: AgentDefinition = {
  agentId: 'school-newsletter-parser-agent',
  agentName: 'SchoolNewsletterParserAgent',
  agentType: 'SchoolNewsletterParserAgent',
  description: 'Parses school newsletter content and extracts key information',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'newsletter-parser-tool',
      description: 'Parses newsletter content and extracts events, dates, and important information',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-newsletter-parser',
      inputSchema: {
        type: 'object',
        properties: {
          newsletterContent: {
            type: 'string',
            description: 'Newsletter content to parse',
          },
          schoolName: {
            type: 'string',
            description: 'Name of the school for context',
          },
        },
        required: ['newsletterContent'],
      },
    },
  ],
  parameters: {
    temperature: 0.6,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * ContextAnalyzer - Analyzes context and relationships between data
 * Validates: Requirement 10.6
 */
export const CONTEXT_ANALYZER: AgentDefinition = {
  agentId: 'context-analyzer',
  agentName: 'ContextAnalyzer',
  agentType: 'ContextAnalyzer',
  description: 'Analyzes context and relationships between data',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'calendar-tool',
      description: 'Queries calendar events for context analysis',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-calendar',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['startDate', 'endDate'],
      },
    },
    {
      toolName: 'weather-tool',
      description: 'Fetches weather data for context analysis',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-weather',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
        required: ['location'],
      },
    },
  ],
  parameters: {
    temperature: 0.7,
    maxTokens: 3000,
  },
  enabled: true,
};

/**
 * FeedbackLearner - Learns from user feedback to improve predictions
 * Validates: Requirement 10.7
 */
export const FEEDBACK_LEARNER: AgentDefinition = {
  agentId: 'feedback-learner',
  agentName: 'FeedbackLearner',
  agentType: 'FeedbackLearner',
  description: 'Learns from user feedback to improve predictions',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'classifier-tool',
      description: 'Classifies events based on learned patterns',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-classifier',
      inputSchema: {
        type: 'object',
        properties: {
          eventTitle: { type: 'string' },
          eventDescription: { type: 'string' },
          availableCategories: {
            type: 'array',
            items: { type: 'string' },
          },
          userFeedback: {
            type: 'string',
            description: 'User feedback on previous classifications',
          },
        },
        required: ['eventTitle', 'availableCategories'],
      },
    },
  ],
  parameters: {
    temperature: 0.6,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * CategoryPredictor - Predicts categories for new items
 * Validates: Requirement 10.8
 */
export const CATEGORY_PREDICTOR: AgentDefinition = {
  agentId: 'category-predictor',
  agentName: 'CategoryPredictor',
  agentType: 'CategoryPredictor',
  description: 'Predicts categories for new items based on historical data',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'classifier-tool',
      description: 'Predicts categories with confidence scores',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-classifier',
      inputSchema: {
        type: 'object',
        properties: {
          eventTitle: { type: 'string' },
          eventDescription: { type: 'string' },
          availableCategories: {
            type: 'array',
            items: { type: 'string' },
          },
          historicalData: {
            type: 'array',
            description: 'Historical categorization data for learning',
          },
        },
        required: ['eventTitle', 'availableCategories'],
      },
    },
  ],
  parameters: {
    temperature: 0.4,
    maxTokens: 1024,
  },
  enabled: true,
};

/**
 * WeatherEventAssociator - Associates weather events with calendar events
 * Validates: Requirement 10.9
 */
export const WEATHER_EVENT_ASSOCIATOR: AgentDefinition = {
  agentId: 'weather-event-associator',
  agentName: 'WeatherEventAssociator',
  agentType: 'WeatherEventAssociator',
  description: 'Associates weather events with calendar events',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'calendar-tool',
      description: 'Queries calendar events',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-calendar',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['startDate', 'endDate'],
      },
    },
    {
      toolName: 'weather-tool',
      description: 'Fetches weather data',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-weather',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          forecastDays: { type: 'number' },
        },
        required: ['location'],
      },
    },
  ],
  parameters: {
    temperature: 0.6,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * WeatherReminderGenerator - Generates reminders based on weather conditions
 * Validates: Requirement 10.10
 */
export const WEATHER_REMINDER_GENERATOR: AgentDefinition = {
  agentId: 'weather-reminder-generator',
  agentName: 'WeatherReminderGenerator',
  agentType: 'WeatherReminderGenerator',
  description: 'Generates reminders based on weather conditions and calendar events',
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  tools: [
    {
      toolName: 'weather-tool',
      description: 'Fetches weather data for reminder generation',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-weather',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          forecastDays: { type: 'number' },
        },
        required: ['location'],
      },
    },
    {
      toolName: 'calendar-tool',
      description: 'Queries calendar events for reminder context',
      lambdaArn: 'arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:agent-tool-calendar',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  ],
  parameters: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  enabled: true,
};

/**
 * Get all agent definitions
 */
export function getAllAgentDefinitions(): AgentDefinition[] {
  return [
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
  ];
}

/**
 * Get agent definition by ID
 */
export function getAgentDefinitionById(agentId: string): AgentDefinition | undefined {
  return getAllAgentDefinitions().find((agent) => agent.agentId === agentId);
}

/**
 * Get agent definition by type
 */
export function getAgentDefinitionByType(agentType: string): AgentDefinition | undefined {
  return getAllAgentDefinitions().find((agent) => agent.agentType === agentType);
}

/**
 * Validate agent definition
 */
export function validateAgentDefinition(agent: AgentDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!agent.agentId) errors.push('agentId is required');
  if (!agent.agentName) errors.push('agentName is required');
  if (!agent.agentType) errors.push('agentType is required');
  if (!agent.description) errors.push('description is required');
  if (!agent.foundationModel) errors.push('foundationModel is required');
  if (!Array.isArray(agent.tools) || agent.tools.length === 0) {
    errors.push('tools array is required and must not be empty');
  }
  if (!agent.parameters) errors.push('parameters is required');
  if (agent.parameters.temperature < 0 || agent.parameters.temperature > 1) {
    errors.push('temperature must be between 0 and 1');
  }
  if (agent.parameters.maxTokens < 1 || agent.parameters.maxTokens > 4096) {
    errors.push('maxTokens must be between 1 and 4096');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
