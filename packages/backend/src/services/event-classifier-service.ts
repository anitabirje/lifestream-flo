/**
 * Event Classifier Service
 * AI-powered event classification using activity categories
 * Learns from custom categories and user feedback
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { ActivityCategory, categoryFromDynamoDB } from '../models/activity-category';

export interface ClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0-1
  requiresUserInput: boolean;
  suggestedAlternatives?: { categoryId: string; categoryName: string; confidence: number }[];
  reasoning?: string;
}

export interface EventContext {
  title: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export class EventClassifierService {
  private confidenceThreshold = 0.7; // Require user input if confidence < 0.7

  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Classify an event based on its context
   * Uses keyword matching and contextual analysis
   */
  async classifyEvent(
    familyId: string,
    eventContext: EventContext
  ): Promise<ClassificationResult> {
    // Get all categories for the family
    const categories = await this.getCategories(familyId);

    if (categories.length === 0) {
      throw new Error('No categories found for family');
    }

    // Calculate scores for each category
    const scores = categories.map((category) => ({
      category,
      score: this.calculateCategoryScore(eventContext, category),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const topMatch = scores[0];
    const requiresUserInput = topMatch.score < this.confidenceThreshold;

    // Get alternative suggestions (top 3)
    const alternatives = scores
      .slice(1, 4)
      .filter((s) => s.score > 0.3)
      .map((s) => ({
        categoryId: s.category.id,
        categoryName: s.category.name,
        confidence: s.score,
      }));

    return {
      categoryId: topMatch.category.id,
      categoryName: topMatch.category.name,
      confidence: topMatch.score,
      requiresUserInput,
      suggestedAlternatives: alternatives.length > 0 ? alternatives : undefined,
      reasoning: this.generateReasoning(eventContext, topMatch.category, topMatch.score),
    };
  }

  /**
   * Calculate category score based on keyword matching and context
   */
  private calculateCategoryScore(
    eventContext: EventContext,
    category: ActivityCategory
  ): number {
    const text = [
      eventContext.title,
      eventContext.description || '',
      eventContext.location || '',
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    let matchCount = 0;

    // Check keyword matches
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchCount++;
        score += 0.2; // Each keyword match adds 0.2
      }
    }

    // Boost score if multiple keywords match
    if (matchCount > 1) {
      score += 0.1 * (matchCount - 1);
    }

    // Cap score at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate reasoning for classification
   */
  private generateReasoning(
    eventContext: EventContext,
    category: ActivityCategory,
    score: number
  ): string {
    if (score >= 0.7) {
      return `Event classified as "${category.name}" based on strong keyword matches in title and description.`;
    } else if (score >= 0.4) {
      return `Event tentatively classified as "${category.name}" based on partial keyword matches. Please verify.`;
    } else {
      return `Unable to confidently classify event. Please manually select a category.`;
    }
  }

  /**
   * Get all categories for a family
   */
  private async getCategories(familyId: string): Promise<ActivityCategory[]> {
    const items = await this.dataAccess.query(`FAMILY#${familyId}`, 'CATEGORY#');
    return items.map((item) => categoryFromDynamoDB(item as any));
  }

  /**
   * Learn from user feedback
   * Updates category keywords based on user corrections
   */
  async learnFromFeedback(
    familyId: string,
    categoryId: string,
    eventContext: EventContext
  ): Promise<void> {
    // Get the category
    const item = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `CATEGORY#${categoryId}`
    );

    if (!item) {
      return;
    }

    const category = categoryFromDynamoDB(item as any);

    // Extract potential new keywords from event title
    const words = eventContext.title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3); // Only words longer than 3 chars

    // Add new keywords that aren't already in the list
    const newKeywords = words.filter(
      (word) => !category.keywords.some((k) => k.toLowerCase() === word)
    );

    if (newKeywords.length > 0) {
      // Limit to 3 new keywords per feedback
      const keywordsToAdd = newKeywords.slice(0, 3);
      category.keywords.push(...keywordsToAdd);
      category.updatedAt = new Date();

      // Update in database
      const dynamoItem = {
        PK: `FAMILY#${familyId}`,
        SK: `CATEGORY#${categoryId}`,
        EntityType: 'ACTIVITY_CATEGORY',
        id: category.id,
        familyId: category.familyId,
        name: category.name,
        color: category.color,
        icon: category.icon,
        isDefault: category.isDefault,
        keywords: category.keywords,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      };

      await this.dataAccess.putItem(dynamoItem);
    }
  }
}
