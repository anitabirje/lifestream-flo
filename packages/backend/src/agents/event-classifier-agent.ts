/**
 * Event Classifier Agent
 * AI agent responsible for automatically categorizing events into activity categories
 * using contextual understanding and machine learning
 */

import { IAgent, AgentTask, AgentResult, AgentStatus } from './types';
import { ActivityCategory, DEFAULT_CATEGORIES } from '../models/activity-category';
import { v4 as uuidv4 } from 'uuid';

/**
 * Classification result with confidence and reasoning
 */
export interface ClassificationResult {
  category: ActivityCategory;
  confidence: number; // 0-1
  requiresUserInput: boolean;
  suggestedAlternatives?: ActivityCategory[];
  reasoning?: string; // AI explanation for classification
}

/**
 * Event structure for classification
 */
export interface EventForClassification {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
}

/**
 * Classification feedback from user corrections
 */
export interface ClassificationFeedback {
  eventId: string;
  assignedCategory: ActivityCategory;
  userSelectedCategory: ActivityCategory;
  timestamp: Date;
  familyMemberId: string;
  eventContext: {
    title: string;
    description?: string;
    time: Date;
  };
}

/**
 * Event classifier agent interface
 */
export interface IEventClassifierAgent extends IAgent {
  /**
   * Classify a single event
   */
  classify(event: EventForClassification, categories: ActivityCategory[]): Promise<ClassificationResult>;

  /**
   * Classify multiple events in batch
   */
  classifyBatch(events: EventForClassification[], categories: ActivityCategory[]): Promise<ClassificationResult[]>;

  /**
   * Learn from user classification corrections
   */
  learnFromFeedback(feedback: ClassificationFeedback): Promise<void>;

  /**
   * Get the confidence threshold for automatic classification
   */
  getConfidenceThreshold(): number;
}

/**
 * AI Event Classifier Agent implementation
 * Uses keyword matching and contextual analysis for classification
 */
export class AIEventClassifier implements IEventClassifierAgent {
  public readonly id: string;
  public readonly type: 'event_classifier' = 'event_classifier';
  public readonly capabilities: string[];
  public status: AgentStatus;

  private confidenceThreshold: number = 0.7; // 70% confidence threshold
  private feedbackHistory: ClassificationFeedback[] = [];
  private categoryKeywordWeights: Map<string, Map<string, number>> = new Map();

  constructor(id?: string) {
    this.id = id || `event-classifier-${uuidv4()}`;
    this.capabilities = [
      'classify_event',
      'batch_classify',
      'learn_from_feedback'
    ];
    this.status = 'idle';
    this.initializeKeywordWeights();
  }

  /**
   * Execute a classification task
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    this.status = 'busy';

    try {
      if (task.type !== 'classify_event') {
        throw new Error(`Unsupported task type: ${task.type}`);
      }

      const { event, categories } = task.payload as {
        event: EventForClassification;
        categories: ActivityCategory[];
      };

      const result = await this.classify(event, categories);

      this.status = 'idle';
      const executionTime = Math.max(1, Date.now() - startTime);
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'success',
        data: result,
        executionTime,
        completedAt: new Date()
      };
    } catch (error) {
      this.status = 'failed';
      const executionTime = Math.max(1, Date.now() - startTime);
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'failed',
        data: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        executionTime,
        completedAt: new Date()
      };
    }
  }

  /**
   * Health check for the event classifier agent
   */
  async healthCheck(): Promise<boolean> {
    try {
      return this.status !== 'offline';
    } catch {
      this.status = 'offline';
      return false;
    }
  }

  /**
   * Classify a single event
   */
  async classify(
    event: EventForClassification,
    categories: ActivityCategory[]
  ): Promise<ClassificationResult> {
    const scores = this.calculateCategoryScores(event, categories);
    const topMatch = scores[0];

    const confidence = topMatch.score;
    const requiresUserInput = confidence < this.confidenceThreshold;

    const suggestedAlternatives = requiresUserInput
      ? scores.slice(1, 3).map(s => s.category)
      : undefined;

    const reasoning = this.generateReasoning(event, topMatch.category, confidence);

    return {
      category: topMatch.category,
      confidence,
      requiresUserInput,
      suggestedAlternatives,
      reasoning
    };
  }

  /**
   * Classify multiple events in batch
   */
  async classifyBatch(
    events: EventForClassification[],
    categories: ActivityCategory[]
  ): Promise<ClassificationResult[]> {
    return Promise.all(
      events.map(event => this.classify(event, categories))
    );
  }

  /**
   * Learn from user classification corrections
   */
  async learnFromFeedback(feedback: ClassificationFeedback): Promise<void> {
    this.feedbackHistory.push(feedback);

    // Update keyword weights based on feedback
    const categoryName = feedback.userSelectedCategory.name;
    const keywords = this.extractKeywords(feedback.eventContext.title, feedback.eventContext.description);

    if (!this.categoryKeywordWeights.has(categoryName)) {
      this.categoryKeywordWeights.set(categoryName, new Map());
    }

    const weights = this.categoryKeywordWeights.get(categoryName)!;
    for (const keyword of keywords) {
      const currentWeight = weights.get(keyword) || 0;
      weights.set(keyword, currentWeight + 0.1); // Increment weight for correct classification
    }
  }

  /**
   * Get the confidence threshold for automatic classification
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  /**
   * Set the confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Calculate scores for each category
   */
  private calculateCategoryScores(
    event: EventForClassification,
    categories: ActivityCategory[]
  ): Array<{ category: ActivityCategory; score: number }> {
    const scores = categories.map(category => {
      const score = this.calculateCategoryScore(event, category);
      return { category, score };
    });

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate score for a specific category
   */
  private calculateCategoryScore(
    event: EventForClassification,
    category: ActivityCategory
  ): number {
    let score = 0;

    // Extract keywords from event
    const eventKeywords = this.extractKeywords(event.title, event.description);
    const eventText = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase();

    // Match against category keywords
    for (const keyword of category.keywords) {
      if (eventText.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    }

    // Check for keyword matches in event keywords
    for (const eventKeyword of eventKeywords) {
      for (const categoryKeyword of category.keywords) {
        if (eventKeyword.toLowerCase() === categoryKeyword.toLowerCase()) {
          score += 0.15;
        }
      }
    }

    // Apply learned weights from feedback
    const learnedWeights = this.categoryKeywordWeights.get(category.name);
    if (learnedWeights) {
      for (const eventKeyword of eventKeywords) {
        const weight = learnedWeights.get(eventKeyword) || 0;
        score += weight * 0.1;
      }
    }

    // Time-based heuristics
    const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60); // hours
    const hour = event.startTime.getHours();

    // Work events typically during business hours
    if (category.name === 'Work' && hour >= 8 && hour <= 18) {
      score += 0.1;
    }

    // Health/Fitness events often early morning or evening
    if (category.name === 'Health/Fitness' && (hour < 8 || hour > 17)) {
      score += 0.1;
    }

    // Family Time events often in evening or weekends
    if (category.name === 'Family Time' && (hour >= 17 || this.isWeekend(event.startTime))) {
      score += 0.1;
    }

    // Upskilling events often have specific keywords
    if (category.name === 'Upskilling' && duration >= 1) {
      score += 0.05;
    }

    // Normalize score to 0-1 range
    return Math.min(1, score);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    // Simple keyword extraction - split by spaces and filter
    return text
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isCommonWord(word));
  }

  /**
   * Check if word is a common word to filter out
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'with', 'from', 'that', 'this', 'have', 'will', 'your'];
    return commonWords.includes(word);
  }

  /**
   * Check if date is weekend
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Generate reasoning for classification
   */
  private generateReasoning(
    event: EventForClassification,
    category: ActivityCategory,
    confidence: number
  ): string {
    const confidencePercent = Math.round(confidence * 100);
    const eventKeywords = this.extractKeywords(event.title, event.description);
    const matchedKeywords = eventKeywords.filter(kw =>
      category.keywords.some(ck => ck.toLowerCase() === kw.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      return `Classified as ${category.name} (${confidencePercent}% confidence) based on keywords: ${matchedKeywords.join(', ')}`;
    }

    return `Classified as ${category.name} (${confidencePercent}% confidence) based on contextual analysis`;
  }

  /**
   * Initialize keyword weights from default categories
   */
  private initializeKeywordWeights(): void {
    for (const category of DEFAULT_CATEGORIES) {
      const weights = new Map<string, number>();
      for (const keyword of category.keywords) {
        weights.set(keyword, 1.0); // Base weight for default keywords
      }
      this.categoryKeywordWeights.set(category.name, weights);
    }
  }

  /**
   * Get feedback history for analysis
   */
  getFeedbackHistory(): ClassificationFeedback[] {
    return [...this.feedbackHistory];
  }

  /**
   * Clear feedback history
   */
  clearFeedbackHistory(): void {
    this.feedbackHistory = [];
  }
}
