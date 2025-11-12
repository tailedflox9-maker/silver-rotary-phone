// ============================================================================
// FILE: src/services/compoundService.ts
// Compound AI Models - Advanced Reasoning Service
// ============================================================================

import { BookProject, BookRoadmap, BookModule, RoadmapModule, BookSession } from '../types/book';
import { APISettings } from '../types';
import { generateId } from '../utils/helpers';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface CompoundThinkingStep {
  step: number;
  thought: string;
  reasoning: string;
}

interface CompoundAnalysis {
  complexity: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  learningPath: string[];
  estimatedModules: number;
  thinkingSteps: CompoundThinkingStep[];
}

export class CompoundAIService {
  private settings: APISettings;
  private requestTimeout = 360000;
  private activeRequests = new Map<string, AbortController>();

  constructor(settings: APISettings) {
    this.settings = settings;
  }

  updateSettings(settings: APISettings) {
    this.settings = settings;
  }

  /**
   * Check if current model is a Compound model
   */
  isCompoundModel(): boolean {
    return this.settings.selectedModel.includes('compound');
  }

  /**
   * Get Compound-specific model capabilities
   */
  getModelCapabilities(): {
    hasAdvancedReasoning: boolean;
    hasSelfCorrection: boolean;
    hasChainOfThought: boolean;
    maxTokens: number;
    modelName: string;
  } {
    const isMini = this.settings.selectedModel === 'groq/compound-mini';
    
    return {
      hasAdvancedReasoning: true,
      hasSelfCorrection: true,
      hasChainOfThought: true,
      maxTokens: isMini ? 4096 : 8192,
      modelName: isMini ? 'Compound Mini (Fast)' : 'Compound (Advanced)'
    };
  }

  /**
   * Enhanced Roadmap Generation with Deep Analysis
   */
  async generateEnhancedRoadmap(session: BookSession, bookId: string): Promise<BookRoadmap> {
    if (!this.isCompoundModel()) {
      throw new Error('Enhanced roadmap generation requires a Compound model');
    }

    console.log('🧠 Using Compound AI for enhanced roadmap generation...');

    // Step 1: Deep Analysis of Learning Goal
    const analysis = await this.analyzeLearnignGoal(session);
    
    // Step 2: Generate Roadmap with Analysis Context
    const roadmap = await this.generateRoadmapWithReasoning(session, analysis, bookId);

    return roadmap;
  }

  /**
   * Deep Analysis of Learning Goal
   */
  private async analyzeLearnignGoal(session: BookSession): Promise<CompoundAnalysis> {
    const analysisPrompt = `You are an expert educational content analyzer using advanced reasoning.

**Learning Goal:** "${session.goal}"
**Target Audience:** ${session.targetAudience || 'general learners'}
**Complexity Level:** ${session.complexityLevel || 'intermediate'}
${session.reasoning ? `**Motivation:** ${session.reasoning}` : ''}

**TASK - Think Step-by-Step:**

1. **Analyze Complexity:** 
   - What prerequisite knowledge is needed?
   - Is this beginner, intermediate, or advanced material?
   - What makes this topic challenging?

2. **Identify Prerequisites:**
   - What foundational concepts must be understood first?
   - What skills or knowledge gaps might learners have?

3. **Design Learning Path:**
   - What's the logical progression from basics to advanced?
   - What dependencies exist between topics?
   - What's the optimal module count (8-20)?

4. **Estimate Scope:**
   - How many modules would be ideal?
   - What depth of coverage is appropriate?

**OUTPUT FORMAT (JSON):**
\`\`\`json
{
  "thinkingSteps": [
    {
      "step": 1,
      "thought": "First, I need to...",
      "reasoning": "This is important because..."
    }
  ],
  "complexity": "intermediate",
  "prerequisites": ["Topic 1", "Topic 2"],
  "learningPath": ["Foundation", "Core Concepts", "Advanced"],
  "estimatedModules": 12
}
\`\`\`

Think carefully and respond ONLY with valid JSON.`;

    const response = await this.generateWithGroq(analysisPrompt);
    return this.parseAnalysisResponse(response);
  }

  /**
   * Generate Roadmap with Reasoning Context
   */
  private async generateRoadmapWithReasoning(
    session: BookSession, 
    analysis: CompoundAnalysis,
    bookId: string
  ): Promise<BookRoadmap> {
    const roadmapPrompt = `You have analyzed this learning goal and identified key insights. Now create a comprehensive roadmap.

**Learning Goal:** "${session.goal}"
**Analysis Results:**
- Complexity: ${analysis.complexity}
- Prerequisites: ${analysis.prerequisites.join(', ')}
- Learning Path: ${analysis.learningPath.join(' → ')}
- Recommended Modules: ${analysis.estimatedModules}

**Your Thinking Process:**
${analysis.thinkingSteps.map((s, i) => `${i + 1}. ${s.thought}\n   → ${s.reasoning}`).join('\n')}

**TASK - Create Structured Roadmap:**

Generate ${analysis.estimatedModules} modules that:
1. Build logically from foundations to advanced topics
2. Address identified prerequisites early
3. Follow the optimal learning path
4. Include clear, actionable learning objectives (3-5 per module)
5. Estimate realistic completion times

**OUTPUT FORMAT (JSON):**
\`\`\`json
{
  "modules": [
    {
      "title": "Module Title",
      "objectives": ["Objective 1", "Objective 2", "Objective 3"],
      "estimatedTime": "2-3 hours"
    }
  ],
  "estimatedReadingTime": "25-30 hours",
  "difficultyLevel": "${analysis.complexity}"
}
\`\`\`

Return ONLY valid JSON. Make each module title clear and descriptive.`;

    const response = await this.generateWithGroq(roadmapPrompt, bookId);
    return this.parseRoadmapResponse(response, session, analysis.complexity);
  }

  /**
   * Enhanced Module Generation with Self-Review
   */
  async generateEnhancedModule(
    book: BookProject,
    roadmapModule: RoadmapModule,
    session: BookSession,
    previousModules: BookModule[]
  ): Promise<BookModule> {
    if (!this.isCompoundModel()) {
      throw new Error('Enhanced module generation requires a Compound model');
    }

    console.log(`🧠 Generating module with Compound reasoning: ${roadmapModule.title}`);

    // Step 1: Generate with reasoning prompts
    const content = await this.generateModuleWithReasoning(
      roadmapModule, 
      session, 
      previousModules,
      book.modules.length + 1,
      book.roadmap?.totalModules || 0
    );

    // Step 2: Self-review and improve
    const improvedContent = await this.selfReviewContent(content, roadmapModule.title);

    // Step 3: Create module object
    const wordCount = improvedContent.split(/\s+/).filter(w => w.length > 0).length;

    return {
      id: generateId(),
      roadmapModuleId: roadmapModule.id,
      title: roadmapModule.title,
      content: improvedContent,
      wordCount,
      status: 'completed',
      generatedAt: new Date()
    };
  }

  /**
   * Generate Module with Advanced Reasoning
   */
  private async generateModuleWithReasoning(
    roadmapModule: RoadmapModule,
    session: BookSession,
    previousModules: BookModule[],
    moduleIndex: number,
    totalModules: number
  ): Promise<string> {
    const contextSummary = previousModules.length > 0
      ? `\n\n**PREVIOUS MODULES CONTEXT:**\n${previousModules.slice(-2).map(m =>
          `- ${m.title}: ${m.content.substring(0, 200)}...`
        ).join('\n')}`
      : '';

    const prompt = `You are writing Chapter ${moduleIndex} of ${totalModules} for a comprehensive guide.

**CHAPTER TITLE:** ${roadmapModule.title}

**LEARNING OBJECTIVES:**
${roadmapModule.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**BOOK CONTEXT:**
- Overall Goal: ${session.goal}
- Target Audience: ${session.targetAudience || 'general learners'}
- Complexity: ${session.complexityLevel || 'intermediate'}
${session.reasoning ? `- Book Purpose: ${session.reasoning}` : ''}${contextSummary}

**🧠 REASONING PROCESS (Think Before Writing):**

Before generating content, consider:
1. **Reader's Current Knowledge:** What do they know from previous chapters?
2. **Common Misconceptions:** What mistakes do learners typically make here?
3. **Prerequisite Check:** Is there foundational knowledge needed?
4. **Practical Relevance:** How does this apply to real-world scenarios?
5. **Progressive Complexity:** Start simple, build to advanced concepts

**WRITING REQUIREMENTS:**

📝 **Structure:**
## ${roadmapModule.title}

### Introduction
- Set context and relevance
- Preview what will be learned
- Connect to previous knowledge

### Core Concepts
- Break down complex ideas into digestible parts
- Use analogies and metaphors
- Provide clear definitions

### Detailed Explanation
- Deep dive into each concept
- Explain the "why" behind the "what"
- Address common questions

${session.preferences?.includeExamples ? `### Practical Examples
- Real-world applications
- Step-by-step demonstrations
- Common use cases` : ''}

${session.preferences?.includePracticalExercises ? `### Practice Exercises
- Hands-on activities
- Progressive difficulty
- Solutions or hints` : ''}

### Key Takeaways
- Summarize main points
- Highlight critical insights
- Preview next chapter

**📏 LENGTH:** 2500-4000 words
**✍️ TONE:** Clear, engaging, educational
**🎯 FOCUS:** Deep understanding over surface coverage

Write the complete chapter now:`;

    return await this.generateWithGroq(prompt);
  }

  /**
   * Self-Review and Improve Content
   */
  private async selfReviewContent(content: string, moduleTitle: string): Promise<string> {
    console.log(`🔍 Self-reviewing: ${moduleTitle}...`);

    const reviewPrompt = `You are a quality assurance expert reviewing educational content.

**MODULE:** ${moduleTitle}

**CONTENT TO REVIEW:**
${content.substring(0, 5000)}${content.length > 5000 ? '\n... (content continues)' : ''}

**REVIEW CHECKLIST:**

1. ✅ **Accuracy:** Are facts and explanations correct?
2. ✅ **Clarity:** Is language clear and jargon explained?
3. ✅ **Flow:** Does content progress logically?
4. ✅ **Completeness:** Are all objectives addressed?
5. ✅ **Examples:** Are examples helpful and accurate?
6. ✅ **Engagement:** Is the tone appropriate and engaging?

**ANALYSIS:**
- Identify any factual errors
- Note unclear explanations
- Spot logical gaps
- Check for missing context

**OUTPUT:**

If content is high-quality (minor or no issues):
\`\`\`
APPROVED
Minor suggestions: [list any small improvements]
\`\`\`

If significant issues found:
\`\`\`
REVISED VERSION:
[Provide improved version with corrections]
\`\`\`

Perform thorough review now:`;

    try {
      const review = await this.generateWithGroq(reviewPrompt);
      
      if (review.includes('APPROVED')) {
        console.log(`✓ Module approved by self-review`);
        return content;
      } else if (review.includes('REVISED VERSION:')) {
        console.log(`✓ Module improved through self-review`);
        const revised = review.split('REVISED VERSION:')[1]?.trim();
        return revised || content;
      } else {
        console.log(`⚠️ Review inconclusive, keeping original`);
        return content;
      }
    } catch (error) {
      console.warn('Self-review failed, using original content');
      return content;
    }
  }

  /**
   * Generate Summary with Deep Insights
   */
  async generateEnhancedSummary(
    session: BookSession, 
    modules: BookModule[]
  ): Promise<string> {
    if (!this.isCompoundModel()) {
      throw new Error('Enhanced summary requires a Compound model');
    }

    const prompt = `You are creating a comprehensive book summary with deep insights.

**BOOK GOAL:** ${session.goal}

**CHAPTERS COVERED:**
${modules.map((m, i) => `${i + 1}. ${m.title} (${m.wordCount} words)`).join('\n')}

**TASK - Create Multi-Level Summary:**

Think about what the reader has learned across this entire journey:

1. **High-Level Synthesis:**
   - What's the big picture?
   - How do all chapters connect?
   - What transformation has occurred?

2. **Key Insights:**
   - Most important takeaways
   - Unexpected discoveries
   - Critical concepts to remember

3. **Practical Application:**
   - How to use this knowledge
   - Next steps for the reader
   - Resources for continued learning

4. **Reflection Prompts:**
   - Questions for the reader to consider
   - Ways to assess their understanding

**FORMAT:**
Write 800-1200 words in markdown with ## headers.

Begin with congratulations, then provide the structured summary above.`;

    return await this.generateWithGroq(prompt);
  }

  /**
   * Core: Generate with Groq API (Compound Models)
   */
  private async generateWithGroq(
    prompt: string, 
    bookId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.settings.groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    const requestId = bookId || generateId();
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    const timeoutId = setTimeout(() => {
      abortController.abort();
      this.activeRequests.delete(requestId);
    }, this.requestTimeout);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.groqApiKey}`
        },
        body: JSON.stringify({
          model: this.settings.selectedModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: this.getModelCapabilities().maxTokens,
          stream: !!onChunk
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Groq API Error: ${response.status}`);
      }

      if (onChunk && response.body) {
        return await this.handleStreamResponse(response.body, onChunk);
      } else {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || '';
      }
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Handle Streaming Response
   */
  private async handleStreamResponse(
    body: ReadableStream<Uint8Array>, 
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.substring(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            const textPart = data?.choices?.[0]?.delta?.content || '';
            if (textPart) {
              fullContent += textPart;
              onChunk(textPart);
            }
          } catch (parseError) {
            // Ignore parse errors in stream
          }
        }
      }
    }

    if (!fullContent) throw new Error('No content generated');
    return fullContent;
  }

  /**
   * Parse Analysis Response
   */
  private parseAnalysisResponse(response: string): CompoundAnalysis {
    let cleaned = response.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '');

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid analysis response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      complexity: parsed.complexity || 'intermediate',
      prerequisites: parsed.prerequisites || [],
      learningPath: parsed.learningPath || [],
      estimatedModules: parsed.estimatedModules || 10,
      thinkingSteps: parsed.thinkingSteps || []
    };
  }

  /**
   * Parse Roadmap Response
   */
  private parseRoadmapResponse(
    response: string, 
    session: BookSession,
    complexity: 'beginner' | 'intermediate' | 'advanced'
  ): BookRoadmap {
    let cleaned = response.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '');

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid roadmap response format');
    }

    const roadmap = JSON.parse(jsonMatch[0]);

    if (!roadmap.modules || !Array.isArray(roadmap.modules)) {
      throw new Error('Invalid roadmap: missing modules array');
    }

    roadmap.modules = roadmap.modules.map((module: any, index: number) => ({
      id: `module_${index + 1}`,
      title: module.title?.trim() || `Module ${index + 1}`,
      objectives: Array.isArray(module.objectives) 
        ? module.objectives 
        : [`Learn ${module.title}`],
      estimatedTime: module.estimatedTime || '2-3 hours',
      order: index + 1
    }));

    roadmap.totalModules = roadmap.modules.length;
    roadmap.estimatedReadingTime = roadmap.estimatedReadingTime || 
      `${roadmap.modules.length * 2}-${roadmap.modules.length * 3} hours`;
    roadmap.difficultyLevel = complexity;

    return roadmap;
  }

  /**
   * Cancel Active Requests
   */
  cancelActiveRequests(bookId?: string): void {
    if (bookId) {
      const controller = this.activeRequests.get(bookId);
      if (controller) {
        controller.abort();
        this.activeRequests.delete(bookId);
      }
    } else {
      this.activeRequests.forEach(controller => controller.abort());
      this.activeRequests.clear();
    }
  }
}

// Singleton instance
let compoundServiceInstance: CompoundAIService | null = null;

export function getCompoundService(settings: APISettings): CompoundAIService {
  if (!compoundServiceInstance) {
    compoundServiceInstance = new CompoundAIService(settings);
  } else {
    compoundServiceInstance.updateSettings(settings);
  }
  return compoundServiceInstance;
}

export const compoundService = {
  getInstance: getCompoundService
};
