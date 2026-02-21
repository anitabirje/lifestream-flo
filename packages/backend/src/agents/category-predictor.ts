/**
 * Category Predictor
 * Predicts activity categories with confidence scores and provides reasoning
 */

import { EventForClassification, ClassificationResult } from './event-classifier-agent';
import { ActivityCategory } from '../models/activity-category';
import { ContextAnalyzer, ContextAnalysis } from './context-analyzer';
import { FeedbackLearner, LearnedPattern } from './feedback-learner';

/**
 * Prediction with detailed reasoning
 */
export interface CategoryPrediction {
  category: ActivityCategory;
  confidence: number;
  reasoning: string;
  factors: PredictionFactors;
}

/**
 * Factors contributing to prediction
 */
export interface PredictionFactors {
  keywordMatch: number;
  contextMatch: number;
  learnedPatternMatch: number;
  timeMatch: number;
  locationMatch: number;
}

/**
 * Category Predictor implementation
 */
export class CategoryPredictor {
  private feedbackLearner: FeedbackLearner;
  private confidenceThreshold: number = 0.7;

  constructor(feedbackLearner?: FeedbackLearner) {
    this.feedbackLearner = feedbackLearner || new FeedbackLearner();
  }

  /**
   * Predict category for an event with detailed reasoning
   */
  predictCategory(
    event: EventForClassification,
    categories: ActivityCategory[]
  ): CategoryPrediction {
    const predictions = this.predictCategories(event, categories);
    return predictions[0];
  }

  /**
   * Predict categories ranked by confidence
   */
  predictCategories(
    event: EventForClassification,
    categories: ActivityCategory[]
  ): CategoryPrediction[] {
    const context = ContextAnalyzer.analyzeContext(event);
    const predictions: CategoryPrediction[] = [];

    for (const category of categories) {
      const factors = this.calculatePredictionFactors(event, category, context);
      const confidence = this.calculateConfidence(factors);
      const reasoning = this.generateReasoning(event, category, factors, confidence);

      predictions.push({
        category,
        confidence,
        reasoning,
        factors
      });
    }

    // Sort by confidence descending
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate prediction factors for a category
   */
  private calculatePredictionFactors(
    event: EventForClassification,
    category: ActivityCategory,
    context: ContextAnalysis
  ): PredictionFactors {
    const keywordMatch = this.calculateKeywordMatch(event, category);
    const contextMatch = this.calculateContextMatch(context, category);
    const learnedPatternMatch = this.calculateLearnedPatternMatch(event, category);
    const timeMatch = this.calculateTimeMatch(context, category);
    const locationMatch = this.calculateLocationMatch(context, category);

    return {
      keywordMatch,
      contextMatch,
      learnedPatternMatch,
      timeMatch,
      locationMatch
    };
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordMatch(event: EventForClassification, category: ActivityCategory): number {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    let matches = 0;

    for (const keyword of category.keywords) {
      if (eventText.includes(keyword.toLowerCase())) {
        matches += 1;
      }
    }

    return Math.min(1, matches / Math.max(1, category.keywords.length));
  }

  /**
   * Calculate context matching score
   */
  private calculateContextMatch(context: ContextAnalysis, category: ActivityCategory): number {
    let score = 0;
    let factors = 0;

    // Work category context
    if (category.name === 'Work') {
      if (context.timeContext.isBusinessHours) score += 0.3;
      if (!context.timeContext.isWeekend) score += 0.2;
      if (context.locationContext.isWork) score += 0.3;
      if (context.attendeeContext.likelyWorkEvent) score += 0.2;
      factors = 4;
    }

    // Family Time category context
    if (category.name === 'Family Time') {
      if (context.timeContext.isWeekend) score += 0.25;
      if (context.timeContext.timeOfDay === 'evening') score += 0.25;
      if (context.locationContext.isHome) score += 0.25;
      if (context.attendeeContext.likelyFamilyEvent) score += 0.25;
      factors = 4;
    }

    // Health/Fitness category context
    if (category.name === 'Health/Fitness') {
      if (context.locationContext.isSports) score += 0.4;
      if (context.timeContext.timeOfDay === 'morning' || context.timeContext.timeOfDay === 'evening') {
        score += 0.3;
      }
      if (context.timeContext.duration >= 0.5) score += 0.3;
      factors = 3;
    }

    // Upskilling category context
    if (category.name === 'Upskilling') {
      if (context.locationContext.isSchool) score += 0.3;
      if (context.timeContext.duration >= 1) score += 0.3;
      if (context.descriptionContext.hasDescription) score += 0.2;
      if (context.descriptionContext.keywords.length > 0) score += 0.2;
      factors = 4;
    }

    // Relaxation category context
    if (category.name === 'Relaxation') {
      if (context.timeContext.timeOfDay === 'evening' || context.timeContext.timeOfDay === 'night') {
        score += 0.3;
      }
      if (context.descriptionContext.sentiment === 'positive') score += 0.3;
      if (!context.timeContext.isBusinessHours) score += 0.2;
      factors = 3;
    }

    return factors > 0 ? Math.min(1, score / factors) : 0;
  }

  /**
   * Calculate learned pattern matching score
   */
  private calculateLearnedPatternMatch(
    event: EventForClassification,
    category: ActivityCategory
  ): number {
    const patterns = this.feedbackLearner.getPatternsForCategory(category.name);
    if (patterns.length === 0) {
      return 0;
    }

    const eventKeywords = this.extractKeywords(event.title, event.description);
    let bestMatch = 0;

    for (const pattern of patterns) {
      const overlap = eventKeywords.filter(k => pattern.keywords.includes(k)).length;
      const matchScore = (overlap / Math.max(1, pattern.keywords.length)) * pattern.confidence;
      bestMatch = Math.max(bestMatch, matchScore);
    }

    return bestMatch;
  }

  /**
   * Calculate time matching score
   */
  private calculateTimeMatch(context: ContextAnalysis, category: ActivityCategory): number {
    let score = 0;

    if (category.name === 'Work' && context.timeContext.isBusinessHours) {
      score = 0.3;
    } else if (category.name === 'Health/Fitness' && (context.timeContext.timeOfDay === 'morning' || context.timeContext.timeOfDay === 'evening')) {
      score = 0.3;
    } else if (category.name === 'Family Time' && (context.timeContext.timeOfDay === 'evening' || context.timeContext.isWeekend)) {
      score = 0.3;
    } else if (category.name === 'Relaxation' && (context.timeContext.timeOfDay === 'evening' || context.timeContext.timeOfDay === 'night')) {
      score = 0.3;
    }

    return score;
  }

  /**
   * Calculate location matching score
   */
  private calculateLocationMatch(context: ContextAnalysis, category: ActivityCategory): number {
    let score = 0;

    if (category.name === 'Work' && context.locationContext.isWork) {
      score = 0.3;
    } else if (category.name === 'Family Time' && context.locationContext.isHome) {
      score = 0.3;
    } else if (category.name === 'Health/Fitness' && context.locationContext.isSports) {
      score = 0.3;
    } else if (category.name === 'Upskilling' && context.locationContext.isSchool) {
      score = 0.3;
    }

    return score;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(factors: PredictionFactors): number {
    const weights = {
      keywordMatch: 0.3,
      contextMatch: 0.3,
      learnedPatternMatch: 0.2,
      timeMatch: 0.1,
      locationMatch: 0.1
    };

    const confidence =
      factors.keywordMatch * weights.keywordMatch +
      factors.contextMatch * weights.contextMatch +
      factors.learnedPatternMatch * weights.learnedPatternMatch +
      factors.timeMatch * weights.timeMatch +
      factors.locationMatch * weights.locationMatch;

    return Math.min(1, confidence);
  }

  /**
   * Generate detailed reasoning for prediction
   */
  private generateReasoning(
    event: EventForClassification,
    category: ActivityCategory,
    factors: PredictionFactors,
    confidence: number
  ): string {
    const confidencePercent = Math.round(confidence * 100);
    const reasons: string[] = [];

    // Add reasons based on factors
    if (factors.keywordMatch > 0.5) {
      reasons.push(`keyword match (${Math.round(factors.keywordMatch * 100)}%)`);
    }

    if (factors.contextMatch > 0.5) {
      reasons.push(`contextual analysis (${Math.round(factors.contextMatch * 100)}%)`);
    }

    if (factors.learnedPatternMatch > 0.5) {
      reasons.push(`learned patterns (${Math.round(factors.learnedPatternMatch * 100)}%)`);
    }

    if (factors.timeMatch > 0) {
      reasons.push(`time of day`);
    }

    if (factors.locationMatch > 0) {
      reasons.push(`location`);
    }

    const reasonsText = reasons.length > 0 ? reasons.join(', ') : 'contextual analysis';

    return `Predicted as ${category.name} (${confidencePercent}% confidence) based on ${reasonsText}`;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    const words = text.split(/\s+/);
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been'
    ];

    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .filter((word, index, self) => self.indexOf(word) === index); // Remove duplicates
  }

  /**
   * Set confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Get confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  /**
   * Get feedback learner
   */
  getFeedbackLearner(): FeedbackLearner {
    return this.feedbackLearner;
  }
}
