/**
 * Feedback Learner
 * Learns from user classification corrections to improve classification accuracy over time
 */

import { ClassificationFeedback } from './event-classifier-agent';
import { ActivityCategory } from '../models/activity-category';

/**
 * Learned pattern from feedback
 */
export interface LearnedPattern {
  keywords: string[];
  category: ActivityCategory;
  confidence: number;
  occurrences: number;
  lastUpdated: Date;
}

/**
 * Learning statistics
 */
export interface LearningStatistics {
  totalFeedbackItems: number;
  patternsLearned: number;
  accuracyImprovement: number; // percentage
  lastUpdated: Date;
}

/**
 * Feedback Learner implementation
 */
export class FeedbackLearner {
  private learnedPatterns: Map<string, LearnedPattern[]> = new Map();
  private feedbackHistory: ClassificationFeedback[] = [];
  private initialAccuracy: number = 0.7; // Baseline accuracy
  private currentAccuracy: number = 0.7;

  /**
   * Learn from a single feedback item
   */
  learnFromFeedback(feedback: ClassificationFeedback): void {
    this.feedbackHistory.push(feedback);

    const categoryName = feedback.userSelectedCategory.name;
    const keywords = this.extractKeywords(
      feedback.eventContext.title,
      feedback.eventContext.description
    );

    // Get or create patterns for this category
    if (!this.learnedPatterns.has(categoryName)) {
      this.learnedPatterns.set(categoryName, []);
    }

    const patterns = this.learnedPatterns.get(categoryName)!;

    // Check if pattern already exists
    let existingPattern = patterns.find(p =>
      this.patternsMatch(p.keywords, keywords)
    );

    if (existingPattern) {
      // Update existing pattern
      existingPattern.occurrences += 1;
      existingPattern.confidence = Math.min(1, existingPattern.confidence + 0.05);
      existingPattern.lastUpdated = new Date();
    } else {
      // Create new pattern
      const newPattern: LearnedPattern = {
        keywords,
        category: feedback.userSelectedCategory,
        confidence: 0.6, // Start with moderate confidence
        occurrences: 1,
        lastUpdated: new Date()
      };
      patterns.push(newPattern);
    }

    // Update accuracy based on feedback
    this.updateAccuracy();
  }

  /**
   * Learn from multiple feedback items
   */
  learnFromFeedbackBatch(feedbackItems: ClassificationFeedback[]): void {
    for (const feedback of feedbackItems) {
      this.learnFromFeedback(feedback);
    }
  }

  /**
   * Get learned patterns for a category
   */
  getPatternsForCategory(categoryName: string): LearnedPattern[] {
    return this.learnedPatterns.get(categoryName) || [];
  }

  /**
   * Get all learned patterns
   */
  getAllPatterns(): Map<string, LearnedPattern[]> {
    return new Map(this.learnedPatterns);
  }

  /**
   * Get learning statistics
   */
  getStatistics(): LearningStatistics {
    const totalPatterns = Array.from(this.learnedPatterns.values()).reduce(
      (sum, patterns) => sum + patterns.length,
      0
    );

    const accuracyImprovement = ((this.currentAccuracy - this.initialAccuracy) / this.initialAccuracy) * 100;

    return {
      totalFeedbackItems: this.feedbackHistory.length,
      patternsLearned: totalPatterns,
      accuracyImprovement: Math.max(0, accuracyImprovement),
      lastUpdated: new Date()
    };
  }

  /**
   * Get feedback history
   */
  getFeedbackHistory(): ClassificationFeedback[] {
    return [...this.feedbackHistory];
  }

  /**
   * Get feedback for a specific category
   */
  getFeedbackForCategory(categoryName: string): ClassificationFeedback[] {
    return this.feedbackHistory.filter(f => f.userSelectedCategory.name === categoryName);
  }

  /**
   * Get most common keywords for a category
   */
  getMostCommonKeywords(categoryName: string, limit: number = 10): string[] {
    const patterns = this.getPatternsForCategory(categoryName);
    const keywordFrequency = new Map<string, number>();

    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        const count = keywordFrequency.get(keyword) || 0;
        keywordFrequency.set(keyword, count + pattern.occurrences);
      }
    }

    return Array.from(keywordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
  }

  /**
   * Get high-confidence patterns (confidence >= 0.8)
   */
  getHighConfidencePatterns(): LearnedPattern[] {
    const allPatterns: LearnedPattern[] = [];
    for (const patterns of this.learnedPatterns.values()) {
      allPatterns.push(...patterns);
    }
    return allPatterns.filter(p => p.confidence >= 0.8);
  }

  /**
   * Clear all learned patterns
   */
  clearPatterns(): void {
    this.learnedPatterns.clear();
    this.feedbackHistory = [];
    this.currentAccuracy = this.initialAccuracy;
  }

  /**
   * Export learned patterns for persistence
   */
  exportPatterns(): string {
    const patternsData = Array.from(this.learnedPatterns.entries()).map(([category, patterns]) => ({
      category,
      patterns: patterns.map(p => ({
        keywords: p.keywords,
        categoryName: p.category.name,
        confidence: p.confidence,
        occurrences: p.occurrences,
        lastUpdated: p.lastUpdated.toISOString()
      }))
    }));

    return JSON.stringify(patternsData, null, 2);
  }

  /**
   * Import learned patterns from persistence
   */
  importPatterns(jsonData: string, categoryMap: Map<string, ActivityCategory>): void {
    try {
      const patternsData = JSON.parse(jsonData);

      for (const categoryData of patternsData) {
        const patterns: LearnedPattern[] = categoryData.patterns.map((p: any) => {
          const category = categoryMap.get(p.categoryName);
          if (!category) {
            throw new Error(`Category not found: ${p.categoryName}`);
          }

          return {
            keywords: p.keywords,
            category,
            confidence: p.confidence,
            occurrences: p.occurrences,
            lastUpdated: new Date(p.lastUpdated)
          };
        });

        this.learnedPatterns.set(categoryData.category, patterns);
      }
    } catch (error) {
      throw new Error(`Failed to import patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Check if two keyword sets match
   */
  private patternsMatch(keywords1: string[], keywords2: string[]): boolean {
    if (keywords1.length === 0 || keywords2.length === 0) {
      return false;
    }

    // Check if there's significant overlap
    const overlap = keywords1.filter(k => keywords2.includes(k)).length;
    const minLength = Math.min(keywords1.length, keywords2.length);

    return overlap / minLength >= 0.5; // 50% overlap threshold
  }

  /**
   * Update accuracy based on feedback
   */
  private updateAccuracy(): void {
    if (this.feedbackHistory.length === 0) {
      return;
    }

    // Calculate accuracy based on pattern confidence
    let totalConfidence = 0;
    for (const patterns of this.learnedPatterns.values()) {
      for (const pattern of patterns) {
        totalConfidence += pattern.confidence * pattern.occurrences;
      }
    }

    const totalOccurrences = this.feedbackHistory.length;
    this.currentAccuracy = Math.min(1, totalConfidence / totalOccurrences);
  }

  /**
   * Get accuracy improvement percentage
   */
  getAccuracyImprovement(): number {
    return ((this.currentAccuracy - this.initialAccuracy) / this.initialAccuracy) * 100;
  }

  /**
   * Get current accuracy
   */
  getCurrentAccuracy(): number {
    return this.currentAccuracy;
  }

  /**
   * Set initial accuracy baseline
   */
  setInitialAccuracy(accuracy: number): void {
    if (accuracy < 0 || accuracy > 1) {
      throw new Error('Accuracy must be between 0 and 1');
    }
    this.initialAccuracy = accuracy;
    this.currentAccuracy = accuracy;
  }
}
