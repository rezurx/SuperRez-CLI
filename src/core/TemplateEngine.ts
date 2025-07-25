import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import chalk from 'chalk';
import { SessionManager } from './SessionManager';
import { AIOrchestrator } from './AIOrchestrator';

export interface Template {
    name: string;
    description: string;
    category: 'component' | 'api' | 'utility' | 'test' | 'config';
    language: string;
    framework?: string;
    template: string;
    variables: TemplateVariable[];
}

export interface TemplateVariable {
    name: string;
    type: 'string' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    defaultValue?: any;
}

export interface CodePatterns {
    imports: string[];
    exportPattern: string;
    functionPattern: string;
    classPattern: string;
    indentation: string;
    quotes: 'single' | 'double';
    semicolons: boolean;
}

export interface TemplateContext {
    projectName: string;
    projectPath: string;
    language: string;
    framework?: string;
    patterns: CodePatterns;
    customVariables: Record<string, any>;
}

export class TemplateEngine {
    private templates: Map<string, Template> = new Map();

    constructor(
        private sessionManager: SessionManager,
        private aiOrchestrator: AIOrchestrator
    ) {
        this.initializeBuiltInTemplates();
        this.registerHandlebarsHelpers();
    }

    private initializeBuiltInTemplates(): void {
        const builtInTemplates: Template[] = [
            {
                name: 'react-component',
                description: 'React functional component with TypeScript',
                category: 'component',
                language: 'typescript',
                framework: 'react',
                template: `import React from 'react';
{{#if useStyles}}
import styles from './{{pascalCase name}}.module.css';
{{/if}}

interface {{pascalCase name}}Props {
{{#each props}}
  {{@key}}: {{this}};
{{/each}}
}

const {{pascalCase name}}: React.FC<{{pascalCase name}}Props> = ({ {{#each props}}{{@key}}{{#unless @last}}, {{/unless}}{{/each}} }) => {
  return (
    <div{{#if useStyles}} className={styles.container}{{/if}}>
      <h2>{{name}}</h2>
      {/* Component implementation */}
    </div>
  );
};

export default {{pascalCase name}};`,
                variables: [
                    { name: 'name', type: 'string', description: 'Component name', required: true },
                    { name: 'props', type: 'object', description: 'Component props', required: false, defaultValue: {} },
                    { name: 'useStyles', type: 'boolean', description: 'Include CSS modules', required: false, defaultValue: false }
                ]
            },
            {
                name: 'express-route',
                description: 'Express.js API route with validation',
                category: 'api',
                language: 'typescript',
                framework: 'express',
                template: `import { Request, Response, Router } from 'express';
{{#if useValidation}}
import { body, validationResult } from 'express-validator';
{{/if}}

const router = Router();

{{#if useValidation}}
const validate{{pascalCase name}} = [
{{#each validation}}
  body('{{@key}}').{{this}},
{{/each}}
];
{{/if}}

router.{{method}}('{{path}}'{{#if useValidation}}, validate{{pascalCase name}}{{/if}}, async (req: Request, res: Response) => {
  try {
{{#if useValidation}}
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
{{/if}}

    // {{description}}
    {{#if method 'get'}}
    const data = {}; // Fetch data logic here
    res.json(data);
    {{else}}
    const result = {}; // Process request logic here
    res.status(201).json(result);
    {{/if}}
  } catch (error) {
    console.error('Error in {{name}}:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;`,
                variables: [
                    { name: 'name', type: 'string', description: 'Route name', required: true },
                    { name: 'path', type: 'string', description: 'Route path', required: true },
                    { name: 'method', type: 'string', description: 'HTTP method', required: true, defaultValue: 'get' },
                    { name: 'description', type: 'string', description: 'Route description', required: false },
                    { name: 'useValidation', type: 'boolean', description: 'Include validation', required: false, defaultValue: false },
                    { name: 'validation', type: 'object', description: 'Validation rules', required: false, defaultValue: {} }
                ]
            },
            {
                name: 'jest-test',
                description: 'Jest test file with setup',
                category: 'test',
                language: 'typescript',
                framework: 'jest',
                template: `import { {{#each imports}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} } from '{{modulePath}}';

describe('{{testSuite}}', () => {
{{#if useSetup}}
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });
{{/if}}

{{#each testCases}}
  {{#if async}}it{{else}}it{{/if}}('{{description}}', {{#if async}}async {{/if}}() => {
    // Arrange
    {{#if arrange}}{{arrange}}{{else}}// Setup test data{{/if}}
    
    // Act
    {{#if act}}{{act}}{{else}}// Execute the code under test{{/if}}
    
    // Assert
    {{#if assert}}{{assert}}{{else}}// Verify the results{{/if}}
  });

{{/each}}
});`,
                variables: [
                    { name: 'testSuite', type: 'string', description: 'Test suite name', required: true },
                    { name: 'modulePath', type: 'string', description: 'Module to test', required: true },
                    { name: 'imports', type: 'array', description: 'Functions to import', required: true },
                    { name: 'useSetup', type: 'boolean', description: 'Include setup/teardown', required: false, defaultValue: false },
                    { name: 'testCases', type: 'array', description: 'Test cases', required: true }
                ]
            },
            {
                name: 'fastapi-endpoint',
                description: 'FastAPI endpoint with Pydantic models',
                category: 'api',
                language: 'python',
                framework: 'fastapi',
                template: `from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

{{#if useModel}}
class {{pascalCase name}}Request(BaseModel):
{{#each requestFields}}
    {{@key}}: {{this}}
{{/each}}

class {{pascalCase name}}Response(BaseModel):
{{#each responseFields}}
    {{@key}}: {{this}}
{{/each}}
{{/if}}

@router.{{method}}("{{path}}")
async def {{snakeCase name}}(
{{#if useModel}}
    {{#if hasBody}}request: {{pascalCase name}}Request,{{/if}}
{{/if}}
{{#each pathParams}}
    {{@key}}: {{this}},
{{/each}}
{{#each queryParams}}
    {{@key}}: {{this}} = None,
{{/each}}
) -> {{#if useModel}}{{pascalCase name}}Response{{else}}dict{{/if}}:
    """
    {{description}}
    """
    try:
        # Implementation here
        {{#if method 'get'}}
        return {"message": "GET {{name}} endpoint"}
        {{else}}
        return {"message": "{{method}} {{name}} endpoint", "data": {}}
        {{/if}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`,
                variables: [
                    { name: 'name', type: 'string', description: 'Endpoint name', required: true },
                    { name: 'path', type: 'string', description: 'Endpoint path', required: true },
                    { name: 'method', type: 'string', description: 'HTTP method', required: true, defaultValue: 'get' },
                    { name: 'description', type: 'string', description: 'Endpoint description', required: false },
                    { name: 'useModel', type: 'boolean', description: 'Use Pydantic models', required: false, defaultValue: true },
                    { name: 'requestFields', type: 'object', description: 'Request model fields', required: false, defaultValue: {} },
                    { name: 'responseFields', type: 'object', description: 'Response model fields', required: false, defaultValue: {} },
                    { name: 'pathParams', type: 'object', description: 'Path parameters', required: false, defaultValue: {} },
                    { name: 'queryParams', type: 'object', description: 'Query parameters', required: false, defaultValue: {} }
                ]
            },
            {
                name: 'vue-component',
                description: 'Vue 3 composition API component',
                category: 'component',
                language: 'typescript',
                framework: 'vue',
                template: `<template>
  <div class="{{kebabCase name}}">
    <h2>{{name}}</h2>
    <!-- Component template -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed{{#if useComposables}}, {{composables}}{{/if}} } from 'vue';
{{#if useProps}}

interface Props {
{{#each props}}
  {{@key}}: {{this}};
{{/each}}
}

const props = defineProps<Props>();
{{/if}}
{{#if useEmits}}

interface Emits {
{{#each emits}}
  {{@key}}: [{{this}}];
{{/each}}
}

const emit = defineEmits<Emits>();
{{/if}}

// Reactive state
const state = ref({
  // Component state here
});

// Computed properties
const computedValue = computed(() => {
  // Computed logic here
  return state.value;
});

// Methods
const handleAction = () => {
  // Method implementation
};
</script>

<style scoped>
.{{kebabCase name}} {
  /* Component styles */
}
</style>`,
                variables: [
                    { name: 'name', type: 'string', description: 'Component name', required: true },
                    { name: 'useProps', type: 'boolean', description: 'Include props', required: false, defaultValue: false },
                    { name: 'props', type: 'object', description: 'Component props', required: false, defaultValue: {} },
                    { name: 'useEmits', type: 'boolean', description: 'Include emits', required: false, defaultValue: false },
                    { name: 'emits', type: 'object', description: 'Component emits', required: false, defaultValue: {} },
                    { name: 'useComposables', type: 'boolean', description: 'Include composables', required: false, defaultValue: false },
                    { name: 'composables', type: 'string', description: 'Composables to import', required: false, defaultValue: '' }
                ]
            },
            {
                name: 'golang-handler',
                description: 'Go HTTP handler with middleware',
                category: 'api',
                language: 'go',
                framework: 'gin',
                template: `package {{packageName}}

import (
	"net/http"
	"github.com/gin-gonic/gin"
{{#if useValidation}}
	"github.com/go-playground/validator/v10"
{{/if}}
)

{{#if useModel}}
type {{pascalCase name}}Request struct {
{{#each requestFields}}
	{{pascalCase @key}} {{this}} \`json:"{{@key}}" {{#if ../useValidation}}validate:"required"{{/if}}\`
{{/each}}
}

type {{pascalCase name}}Response struct {
{{#each responseFields}}
	{{pascalCase @key}} {{this}} \`json:"{{@key}}"\`
{{/each}}
}
{{/if}}

func {{pascalCase name}}Handler(c *gin.Context) {
{{#if useModel}}
	var req {{pascalCase name}}Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

{{#if useValidation}}
	validate := validator.New()
	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
{{/if}}
{{/if}}

	// {{description}}
	{{#if method 'GET'}}
	response := {{#if useModel}}{{pascalCase name}}Response{}{{else}}gin.H{"message": "GET {{name}} handler"}{{/if}}
	c.JSON(http.StatusOK, response)
	{{else}}
	response := {{#if useModel}}{{pascalCase name}}Response{}{{else}}gin.H{"message": "{{method}} {{name}} handler", "data": gin.H{}}{{/if}}
	c.JSON(http.StatusCreated, response)
	{{/if}}
}`,
                variables: [
                    { name: 'name', type: 'string', description: 'Handler name', required: true },
                    { name: 'packageName', type: 'string', description: 'Package name', required: true, defaultValue: 'main' },
                    { name: 'method', type: 'string', description: 'HTTP method', required: true, defaultValue: 'GET' },
                    { name: 'description', type: 'string', description: 'Handler description', required: false },
                    { name: 'useModel', type: 'boolean', description: 'Use request/response models', required: false, defaultValue: true },
                    { name: 'useValidation', type: 'boolean', description: 'Include validation', required: false, defaultValue: false },
                    { name: 'requestFields', type: 'object', description: 'Request fields', required: false, defaultValue: {} },
                    { name: 'responseFields', type: 'object', description: 'Response fields', required: false, defaultValue: {} }
                ]
            },
            {
                name: 'dockerfile',
                description: 'Multi-stage Dockerfile for Node.js apps',
                category: 'config',
                language: 'dockerfile',
                template: `# Multi-stage build for {{appName}}
FROM node:{{nodeVersion}}-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

{{#if buildStep}}
# Build application
RUN npm run build
{{/if}}

# Production stage
FROM node:{{nodeVersion}}-alpine as production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
{{#if buildStep}}
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
{{/if}}
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

{{#if includeHealthcheck}}
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:{{port}}/health || exit 1
{{/if}}

# Switch to non-root user
USER appuser

# Expose port
EXPOSE {{port}}

# Start application
CMD ["dumb-init", "node", "{{#if buildStep}}dist/{{/if}}{{entrypoint}}"]`,
                variables: [
                    { name: 'appName', type: 'string', description: 'Application name', required: true },
                    { name: 'nodeVersion', type: 'string', description: 'Node.js version', required: false, defaultValue: '18' },
                    { name: 'port', type: 'string', description: 'Application port', required: false, defaultValue: '3000' },
                    { name: 'entrypoint', type: 'string', description: 'Entry point file', required: false, defaultValue: 'index.js' },
                    { name: 'buildStep', type: 'boolean', description: 'Include build step', required: false, defaultValue: false },
                    { name: 'includeHealthcheck', type: 'boolean', description: 'Include health check', required: false, defaultValue: false }
                ]
            },
            {
                name: 'python-class',
                description: 'Python class with type hints and docstrings',
                category: 'utility',
                language: 'python',
                template: `from typing import {{#if useGenerics}}TypeVar, Generic, {{/if}}Optional, List, Dict, Any
{{#if useDataclass}}
from dataclasses import dataclass
{{/if}}
{{#if useABC}}
from abc import ABC, abstractmethod
{{/if}}

{{#if useGenerics}}
T = TypeVar('T')
{{/if}}

{{#if useDataclass}}
@dataclass
{{/if}}
class {{pascalCase name}}{{#if useGenerics}}(Generic[T]){{/if}}{{#if useABC}}(ABC){{/if}}:
    """
    {{description}}
    
    {{#if attributes}}
    Attributes:
    {{#each attributes}}
        {{@key}} ({{this}}): {{@key}} description
    {{/each}}
    {{/if}}
    """
    
    def __init__(self{{#each attributes}}, {{@key}}: {{this}}{{/each}}):
        """
        Initialize {{name}}.
        
        Args:
        {{#each attributes}}
            {{@key}} ({{this}}): {{@key}} description
        {{/each}}
        """
        {{#each attributes}}
        self.{{@key}} = {{@key}}
        {{/each}}
    
    {{#if useMethods}}
    {{#each methods}}
    {{#if isAbstract}}@abstractmethod{{/if}}
    def {{@key}}(self{{#if ../args}}, {{../args}}{{/if}}) -> {{returnType}}:
        """
        {{description}}
        
        {{#if ../args}}
        Args:
            {{../args}}: Argument description
        {{/if}}
        
        Returns:
            {{returnType}}: Return description
        """
        {{#if isAbstract}}
        pass
        {{else}}
        # Method implementation
        return {{#if returnType 'None'}}None{{else}}{{defaultReturn}}{{/if}}
        {{/if}}
    
    {{/each}}
    {{/if}}
    
    def __str__(self) -> str:
        """String representation of {{name}}."""
        return f"{{name}}({{#each attributes}}{{@key}}={self.{{@key}}}{{#unless @last}}, {{/unless}}{{/each}})"
    
    def __repr__(self) -> str:
        """Developer representation of {{name}}."""
        return self.__str__()`,
                variables: [
                    { name: 'name', type: 'string', description: 'Class name', required: true },
                    { name: 'description', type: 'string', description: 'Class description', required: false },
                    { name: 'attributes', type: 'object', description: 'Class attributes with types', required: false, defaultValue: {} },
                    { name: 'useDataclass', type: 'boolean', description: 'Use @dataclass decorator', required: false, defaultValue: false },
                    { name: 'useGenerics', type: 'boolean', description: 'Include generic types', required: false, defaultValue: false },
                    { name: 'useABC', type: 'boolean', description: 'Inherit from ABC', required: false, defaultValue: false },
                    { name: 'useMethods', type: 'boolean', description: 'Include custom methods', required: false, defaultValue: false },
                    { name: 'methods', type: 'object', description: 'Custom methods', required: false, defaultValue: {} }
                ]
            }
        ];

        builtInTemplates.forEach(template => {
            this.templates.set(template.name, template);
        });
    }

    private registerHandlebarsHelpers(): void {
        Handlebars.registerHelper('pascalCase', (str: string) => {
            return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return word.toUpperCase();
            }).replace(/\s+/g, '');
        });

        Handlebars.registerHelper('camelCase', (str: string) => {
            const pascal = str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            }).replace(/\s+/g, '');
            return pascal;
        });

        Handlebars.registerHelper('kebabCase', (str: string) => {
            return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        });

        Handlebars.registerHelper('snakeCase', (str: string) => {
            return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        });

        Handlebars.registerHelper('if', function(this: any, conditional, options) {
            if (arguments.length < 2)
                throw new Error("Handlebars Helper 'if' needs 1 parameter");

            if (conditional) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });
    }

    async generateFromTemplate(templateName: string, customContext?: Record<string, any>): Promise<string> {
        const template = this.templates.get(templateName);
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        const context = await this.buildTemplateContext(customContext);
        const compiledTemplate = Handlebars.compile(template.template);
        
        // Merge template variables with context
        const templateContext = {
            ...context,
            ...customContext
        };

        return compiledTemplate(templateContext);
    }

    async analyzeCodePatterns(projectPath: string): Promise<CodePatterns> {
        const patterns: CodePatterns = {
            imports: [],
            exportPattern: 'export default',
            functionPattern: 'function',
            classPattern: 'class',
            indentation: '  ',
            quotes: 'single',
            semicolons: true
        };

        try {
            // Find code files to analyze
            const files = await this.findCodeFiles(projectPath, ['.ts', '.js', '.tsx', '.jsx', '.py']);
            
            if (files.length > 0) {
                const sampleFile = fs.readFileSync(files[0], 'utf8');
                
                // Detect indentation
                const indentMatch = sampleFile.match(/^(\s+)/m);
                if (indentMatch) {
                    patterns.indentation = indentMatch[1];
                }
                
                // Detect quotes
                const singleQuotes = (sampleFile.match(/'/g) || []).length;
                const doubleQuotes = (sampleFile.match(/"/g) || []).length;
                patterns.quotes = singleQuotes > doubleQuotes ? 'single' : 'double';
                
                // Detect semicolons
                patterns.semicolons = sampleFile.includes(';');
                
                // Detect export pattern
                if (sampleFile.includes('export default')) {
                    patterns.exportPattern = 'export default';
                } else if (sampleFile.includes('module.exports')) {
                    patterns.exportPattern = 'module.exports';
                }
                
                // Detect function pattern
                if (sampleFile.includes('const ') && sampleFile.includes(' => ')) {
                    patterns.functionPattern = 'arrow';
                } else if (sampleFile.includes('function ')) {
                    patterns.functionPattern = 'function';
                }
            }
        } catch (error) {
            console.warn(chalk.yellow(`Warning: Could not analyze code patterns: ${error}`));
        }

        return patterns;
    }

    private async findCodeFiles(dir: string, extensions: string[]): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    files.push(...await this.findCodeFiles(fullPath, extensions));
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            // Ignore directory access errors
        }
        
        return files.slice(0, 10); // Limit to first 10 files for performance
    }

    private async buildTemplateContext(customContext?: Record<string, any>): Promise<TemplateContext> {
        const activeSession = this.sessionManager.getActiveSession();
        
        const context: TemplateContext = {
            projectName: activeSession?.projectName || 'unknown',
            projectPath: activeSession?.projectPath || process.cwd(),
            language: 'typescript',
            patterns: {
                imports: [],
                exportPattern: 'export default',
                functionPattern: 'function',
                classPattern: 'class',
                indentation: '  ',
                quotes: 'single',
                semicolons: true
            },
            customVariables: customContext || {}
        };

        if (activeSession?.projectPath) {
            context.patterns = await this.analyzeCodePatterns(activeSession.projectPath);
        }

        return context;
    }

    getAvailableTemplates(): Template[] {
        return Array.from(this.templates.values());
    }

    getTemplate(name: string): Template | undefined {
        return this.templates.get(name);
    }

    registerCustomTemplate(template: Template): void {
        this.templates.set(template.name, template);
    }

    async getSummary(): Promise<string> {
        const templates = this.getAvailableTemplates();
        
        let summary = chalk.cyan.bold('🎨 Template Engine Status\n');
        summary += chalk.green(`\n✅ ${templates.length} templates available:\n`);
        
        const categories = ['component', 'api', 'utility', 'test', 'config'] as const;
        
        categories.forEach(category => {
            const categoryTemplates = templates.filter(t => t.category === category);
            if (categoryTemplates.length > 0) {
                summary += chalk.blue(`\n📁 ${category.toUpperCase()}:\n`);
                categoryTemplates.forEach(template => {
                    const framework = template.framework ? ` (${template.framework})` : '';
                    summary += `  • ${chalk.bold(template.name)} - ${template.description}${framework}\n`;
                });
            }
        });
        
        summary += chalk.gray('\n💡 Use "superrez template generate <name>" to generate code from templates');
        
        return summary;
    }
}