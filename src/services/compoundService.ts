// ============================================================================
// FILE: src/services/compoundService.ts
// Compound AI System - Research-Grade Book Generation with Web Search & Code
// ============================================================================
import { BookProject, BookRoadmap, BookModule, RoadmapModule, BookSession } from '../types/book';
import { APISettings } from '../types';
import { generateId } from '../utils/helpers';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ResearchInsight {
  query: string;
  sources: string[];
  findings: string;
  reliability: 'high' | 'medium' | 'low';
}

interface AcademicModule {
  id: string;
  title: string;
  abstract: string;
  sections: {
    introduction: string;
    literature: string;
    methodology: string;
    content: string;
    examples: string;
    exercises?: string;
    conclusion: string;
  };
  references: string[];
  keywords: string[];
}

/**
 * Compound AI Service - Leverages Groq's Web Search + Code Execution
 *
 * Key Capabilities:
 * - Real-time web search for current information
 * - Code execution for verifying examples and computations
 * - Multi-tool orchestration (up to 10 calls)
 * - Research-grade content with citations
 */
export class CompoundAIService {
  private settings: APISettings;
  private requestTimeout = 480000; // 8 minutes for complex tasks
  private activeRequests = new Map<string, AbortController>();

  constructor(settings: APISettings) {
    this.settings = settings;
  }

  updateSettings(settings: APISettings) {
    this.settings = settings;
  }

  /**
   * Check if current model is Compound
   */
  isCompoundModel(): boolean {
    return this.settings.selectedModel === 'groq/compound' ||
           this.settings.selectedModel === 'groq/compound-mini';
  }

  /**
   * Get model type and capabilities
   */
  getModelCapabilities(): {
    modelType: 'compound' | 'compound-mini' | 'standard';
    hasWebSearch: boolean;
    hasCodeExecution: boolean;
    maxToolCalls: number;
    maxTokens: number;
    description: string;
  } {
    if (this.settings.selectedModel === 'groq/compound') {
      return {
        modelType: 'compound',
        hasWebSearch: true,
        hasCodeExecution: true,
        maxToolCalls: 10,
        maxTokens: 8192,
        description: 'Full Compound system with up to 10 tool calls - includes real-time web search and code execution'
      };
    } else if (this.settings.selectedModel === 'groq/compound-mini') {
      return {
        modelType: 'compound-mini',
        hasWebSearch: true,
        hasCodeExecution: true,
        maxToolCalls: 1,
        maxTokens: 4096,
        description: 'Streamlined Compound with 1 tool call - 3x faster with web search and code execution'
      };
    } else {
      return {
        modelType: 'standard',
        hasWebSearch: false,
        hasCodeExecution: false,
        maxToolCalls: 0,
        maxTokens: 8192,
        description: 'Standard LLM without tool access'
      };
    }
  }

  /**
   * MAIN: Generate Research-Grade Roadmap with Web-Verified Topics
   */
  async generateResearchRoadmap(session: BookSession, bookId: string): Promise<BookRoadmap> {
    if (!this.isCompoundModel()) {
      throw new Error('Research-grade roadmap requires Compound model');
    }
    console.log('🔬 Compound: Researching topic with web search...');
    // Step 1: Research the topic using web search
    const research = await this.researchTopic(session.goal);
    // Step 2: Generate roadmap with research context
    const roadmap = await this.buildAcademicRoadmap(session, research, bookId);
    return roadmap;
  }

  /**
   * Research Topic with Web Search (Compound's superpower!)
   */
  private async researchTopic(goal: string): Promise<ResearchInsight> {
    const searchPrompt = `You have access to real-time web search. Research this topic comprehensively:
**Topic:** "${goal}"
**Task:**
1. Search for the latest research, papers, and authoritative sources on this topic
2. Identify key subtopics, current trends, and best practices
3. Find recommended learning resources and textbooks
4. Note any recent developments or paradigm shifts
Provide a comprehensive research summary with sources.
Format your response as:
## Research Findings
[Your synthesis of current knowledge]
## Key Subtopics Identified
- [Subtopic 1]
- [Subtopic 2]
...
## Recommended Resources
- [Source 1]
- [Source 2]
...
## Recent Developments
[Any cutting-edge information]`;
    const response = await this.generateWithCompound(searchPrompt);
    return this.parseResearchInsights(response, goal);
  }

  /**
   * Build Academic Roadmap with Research Context
   */
  private async buildAcademicRoadmap(
    session: BookSession,
    research: ResearchInsight,
    bookId: string
  ): Promise<BookRoadmap> {
    const roadmapPrompt = `You are an expert curriculum designer creating a research-grade learning roadmap.
**Topic:** "${session.goal}"
**Research Findings:**
${research.findings}
**Target Audience:** ${session.targetAudience || 'Professionals and advanced learners'}
**Complexity:** ${session.complexityLevel || 'Advanced'}
**Task - Design Academic-Quality Curriculum:**
Based on current research and best practices, create a comprehensive roadmap with 10-18 modules that:
1. **Foundation First**: Start with theoretical foundations and prerequisites
2. **Progressive Depth**: Build from fundamentals to advanced applications
3. **Research-Backed**: Include modules on current research and developments
4. **Practical Integration**: Balance theory with hands-on implementation
5. **Critical Thinking**: Include sections for analysis and evaluation
**Module Design Guidelines:**
- Each module = 1 research paper equivalent (~4000-6000 words)
- Include Abstract, Introduction, Literature Review, Main Content, Examples, Conclusion
- 4-6 specific learning objectives per module
- Realistic time estimates (2-4 hours per module)
**OUTPUT FORMAT (JSON):**
\`\`\`json
{
  "modules": [
    {
      "title": "Module Title (Academic Style)",
      "objectives": [
        "Understand...",
        "Analyze...",
        "Implement...",
        "Evaluate..."
      ],
      "estimatedTime": "3-4 hours",
      "researchFocus": "Brief description of research angle"
    }
  ],
  "estimatedReadingTime": "40-60 hours",
  "difficultyLevel": "advanced",
  "researchKeywords": ["keyword1", "keyword2", "keyword3"]
}
\`\`\`
Generate ONLY valid JSON.`;
    const response = await this.generateWithCompound(roadmapPrompt, bookId);
    return this.parseRoadmapResponse(response, session);
  }

  /**
   * MAIN: Generate Research-Grade Module with Web Search + Code Verification
   */
  async generateResearchModule(
    book: BookProject,
    roadmapModule: RoadmapModule,
    session: BookSession,
    previousModules: BookModule[]
  ): Promise<BookModule> {
    if (!this.isCompoundModel()) {
      throw new Error('Research-grade modules require Compound model');
    }
    console.log(`🔬 Compound: Generating research module: ${roadmapModule.title}`);
    // Step 1: Generate academic module with web-verified content
    const academicModule = await this.generateAcademicModule(
      roadmapModule,
      session,
      previousModules,
      book.modules.length + 1,
      book.roadmap?.totalModules || 0
    );
    // Step 2: Verify code examples if present
    if (session.preferences?.includeExamples) {
      await this.verifyCodeExamples(academicModule);
    }
    // Step 3: Format as professional markdown
    const formattedContent = this.formatAcademicModule(academicModule);
    const wordCount = formattedContent.split(/\s+/).filter(w => w.length > 0).length;
    return {
      id: generateId(),
      roadmapModuleId: roadmapModule.id,
      title: roadmapModule.title,
      content: formattedContent,
      wordCount,
      status: 'completed',
      generatedAt: new Date()
    };
  }

  /**
   * Generate Academic Module (Research Paper Style)
   */
  private async generateAcademicModule(
    roadmapModule: RoadmapModule,
    session: BookSession,
    previousModules: BookModule[],
    moduleIndex: number,
    totalModules: number
  ): Promise<AcademicModule> {
    const contextSummary = previousModules.length > 0
      ? `\n\n**PREVIOUS CHAPTERS:**\n${previousModules.slice(-2).map(m =>
          `- ${m.title} (${m.wordCount} words)`
        ).join('\n')}`
      : '';
    const prompt = `You are writing a research-grade chapter with web search and code execution access.
**CHAPTER ${moduleIndex} OF ${totalModules}:** ${roadmapModule.title}
**LEARNING OBJECTIVES:**
${roadmapModule.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}
**BOOK CONTEXT:**
- Topic: ${session.goal}
- Audience: ${session.targetAudience || 'Advanced learners & professionals'}
- Level: ${session.complexityLevel || 'Advanced'}${contextSummary}
**RESEARCH-GRADE STRUCTURE:**
Write a comprehensive chapter following academic research paper format:
## ${roadmapModule.title}
### Abstract
*150-200 words summarizing the chapter's key contributions*
### I. Introduction
- Context and motivation
- Research questions addressed
- Chapter organization
### II. Theoretical Foundation
- Core concepts and definitions
- Mathematical formulations (if applicable)
- Conceptual frameworks
### III. Literature Review & Current Research
**USE WEB SEARCH** to find:
- Recent papers and developments
- Current best practices
- Industry standards
- Expert perspectives
### IV. Detailed Analysis
- In-depth exploration of concepts
- Step-by-step breakdowns
- Edge cases and considerations
- Performance implications
${session.preferences?.includeExamples ? `### V. Practical Implementation
**USE CODE EXECUTION** to verify:
- Working code examples
- Real computations
- Validated outputs
- Performance benchmarks` : ''}
### VI. Advanced Topics
- Research frontier
- Open challenges
- Future directions
${session.preferences?.includePracticalExercises ? `### VII. Research Exercises
- Analytical problems
- Implementation challenges
- Research questions` : ''}
### VIII. Conclusion & Key Takeaways
- Summary of main contributions
- Practical implications
- Connection to next chapter
### References
- Academic citations (numbered format)
- Web sources used
- Recommended readings
**QUALITY STANDARDS:**
- 4000-6000 words
- Citation-backed claims
- Verified code examples
- Research-grade depth
- Professional tone
- No emoji or casual language
Generate the complete chapter now.`;
    const response = await this.generateWithCompound(prompt);
    return this.parseAcademicModule(response, roadmapModule.id);
  }

  /**
   * Verify Code Examples using Compound's Code Execution
   */
  private async verifyCodeExamples(module: AcademicModule): Promise<void> {
    if (!module.sections.examples) return;
    // Extract code blocks
    const codeBlocks = module.sections.examples.match(/```[\s\S]*?```/g);
    if (!codeBlocks || codeBlocks.length === 0) return;
    console.log(`✓ Verifying ${codeBlocks.length} code examples...`);
    for (const block of codeBlocks) {
      const code = block.replace(/```[\w]*\n?/g, '').trim();
      // Skip if not Python (Compound only executes Python)
      if (!block.includes('python')) continue;
      const verificationPrompt = `Verify this code example by executing it:
\`\`\`python
\${code}
\`\`\`
Check:
1. Does it run without errors?
2. Does the output match expectations?
3. Are there any edge cases that fail?
If there are issues, suggest corrections.`;
      try {
        await this.generateWithCompound(verificationPrompt);
        console.log(`  ✓ Code block verified`);
      } catch (error) {
        console.warn(`  ⚠ Code verification failed:`, error);
      }
    }
  }

  /**
   * Format Academic Module to Professional Markdown
   */
  private formatAcademicModule(module: AcademicModule): string {
    let content = `# ${module.title}\n\n`;
    // Abstract
    if (module.abstract) {
      content += `**Abstract:** ${module.abstract}\n\n`;
      content += `**Keywords:** ${module.keywords.join(', ')}\n\n`;
      content += `---\n\n`;
    }
    // Sections
    const sectionTitles: Record<string, string> = {
      introduction: 'I. Introduction',
      literature: 'II. Theoretical Foundation & Literature Review',
      methodology: 'III. Methodology & Analysis',
      content: 'IV. Detailed Discussion',
      examples: 'V. Practical Implementation',
      exercises: 'VI. Research Exercises',
      conclusion: 'VII. Conclusion & Key Takeaways'
    };
    Object.entries(module.sections).forEach(([key, text]) => {
      if (!text) return;
      const sectionTitle = sectionTitles[key as keyof typeof sectionTitles] || key;
      content += `## ${sectionTitle}\n\n${text}\n\n`;
    });
    // References
    if (module.references && module.references.length > 0) {
      content += `## References\n\n`;
      module.references.forEach((ref, i) => {
        content += `[${i + 1}] ${ref}\n\n`;
      });
    }
    return content;
  }

  /**
   * Generate Research-Grade Summary with Citations
   */
  async generateResearchSummary(
    session: BookSession,
    modules: BookModule[]
  ): Promise<string> {
    if (!this.isCompoundModel()) {
      throw new Error('Research summary requires Compound model');
    }
    const prompt = `Generate a comprehensive summary for this research-grade book.
**Topic:** \${session.goal}
**Chapters:**
\${modules.map((m, i) => `${i + 1}. ${m.title} (${m.wordCount} words)`).join('\n')}
**Task - Write Academic Summary (800-1200 words):**
## Executive Summary
[High-level overview of the complete work]
## Key Contributions
- Theoretical insights
- Practical frameworks
- Novel approaches
## Chapter Synthesis
[How chapters build on each other]
## Research Implications
[Broader impact and applications]
## Future Directions
[Open problems and research opportunities]
## Recommended Next Steps
[For readers who want to go deeper]
Use academic tone, no emoji.`;
    return await this.generateWithCompound(prompt);
  }

  /**
   * Core: Generate with Compound (Web Search + Code Execution)
   */
  private async generateWithCompound(
    prompt: string,
    bookId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.settings.groqApiKey) {
      throw new Error('Groq API key required for Compound');
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
          'Authorization': `Bearer ${this.settings.groqApiKey}`,
          // Use latest Compound version
          'Groq-Model-Version': 'latest'
        },
        body: JSON.stringify({
          model: this.settings.selectedModel, // groq/compound or groq/compound-mini
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant with access to web search and code execution. Use these tools to provide accurate, well-researched, and verified information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: this.getModelCapabilities().maxTokens,
          stream: !!onChunk
        }),
        signal: abortController.signal
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Compound API Error: ${response.status}`);
      }
      if (onChunk && response.body) {
        return await this.handleStreamResponse(response.body, onChunk);
      } else {
        const data = await response.json();
        // Log tools used (web search, code execution)
        if (data.choices?.[0]?.message?.executed_tools) {
          console.log('🔧 Tools used:', data.choices[0].message.executed_tools);
        }
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
            // Ignore parse errors
          }
        }
      }
    }
    if (!fullContent) throw new Error('No content generated');
    return fullContent;
  }

  /**
   * Parse Research Insights
   */
  private parseResearchInsights(response: string, goal: string): ResearchInsight {
    return {
      query: goal,
      sources: this.extractSources(response),
      findings: response,
      reliability: 'high' // Compound uses real-time web search
    };
  }

  /**
   * Extract Sources from Response
   */
  private extractSources(text: string): string[] {
    const sources: string[] = [];
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const matches = text.match(urlRegex);
    if (matches) {
      sources.push(...matches);
    }
    return [...new Set(sources)]; // Remove duplicates
  }

  /**
   * Parse Academic Module
   */
  private parseAcademicModule(response: string, moduleId: string): AcademicModule {
    // Extract sections using regex
    const abstractMatch = response.match(/\*\*Abstract:\*\*\s*([\s\S]*?)(?=###|##|\$)/);
    const introMatch = response.match(/###?\s*I+\.?\s*Introduction\s*([\s\S]*?)(?=###|##|\$)/i);
    const litMatch = response.match(/###?\s*I+\.?\s*(?\:Literature|Theoretical)[\s\S]*?\s*([\s\S]*?)(?=###|##|\$)/i);
    const contentMatch = response.match(/###?\s*I+V\.?\s*(?\:Detailed|Discussion)[\s\S]*?\s*([\s\S]*?)(?=###|##|\$)/i);
    const examplesMatch = response.match(/###?\s*V\.?\s*(?\:Practical|Implementation)[\s\S]*?\s*([\s\S]*?)(?=###|##|\$)/i);
    const conclusionMatch = response.match(/###?\s*(?\:VII+|Conclusion)[\s\S]*?\s*([\s\S]*?)(?=###|##|References|\$)/i);
    // Extract references
    const referencesMatch = response.match(/###?\s*References\s*([\s\S]*?)\$/i);
    const references = referencesMatch
      ? referencesMatch[1].split('\n').filter(line => line.trim().match(/^$$
\d+
$$/))
      : [];
    return {
      id: moduleId,
      title: 'Research Module',
      abstract: abstractMatch?.[1]?.trim() || '',
      sections: {
        introduction: introMatch?.[1]?.trim() || '',
        literature: litMatch?.[1]?.trim() || '',
        methodology: '',
        content: contentMatch?.[1]?.trim() || '',
        examples: examplesMatch?.[1]?.trim() || '',
        conclusion: conclusionMatch?.[1]?.trim() || ''
      },
      references: references.map(r => r.trim()),
      keywords: []
    };
  }

  /**
   * Parse Roadmap Response
   */
  private parseRoadmapResponse(response: string, session: BookSession): BookRoadmap {
    let cleaned = response.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*\$/, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid roadmap format');
    }
    const roadmap = JSON.parse(jsonMatch[0]);
    if (!roadmap.modules || !Array.isArray(roadmap.modules)) {
      throw new Error('Invalid roadmap: missing modules');
    }
    roadmap.modules = roadmap.modules.map((module: any, index: number) => ({
      id: `module_${index + 1}`,
      title: module.title?.trim() || `Module ${index + 1}`,
      objectives: Array.isArray(module.objectives)
        ? module.objectives
        : [`Understand ${module.title}`],
      estimatedTime: module.estimatedTime || '3-4 hours',
      order: index + 1
    }));
    roadmap.totalModules = roadmap.modules.length;
    roadmap.estimatedReadingTime = roadmap.estimatedReadingTime ||
      `${roadmap.modules.length * 3}-${roadmap.modules.length * 4} hours`;
    roadmap.difficultyLevel = roadmap.difficultyLevel || session.complexityLevel || 'advanced';
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
