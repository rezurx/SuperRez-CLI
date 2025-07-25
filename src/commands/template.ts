import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TemplateEngine, Template } from '../core/TemplateEngine';
import { SessionManager } from '../core/SessionManager';

export async function listTemplates(templateEngine: TemplateEngine): Promise<void> {
    console.log(await templateEngine.getSummary());
}

export async function generateFromTemplate(templateEngine: TemplateEngine, sessionManager: SessionManager, templateName?: string): Promise<void> {
    try {
        let selectedTemplate: Template;
        
        if (templateName) {
            const template = templateEngine.getTemplate(templateName);
            if (!template) {
                console.error(chalk.red(`❌ Template '${templateName}' not found`));
                return;
            }
            selectedTemplate = template;
        } else {
            // Interactive template selection
            const templates = templateEngine.getAvailableTemplates();
            const { template } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'template',
                    message: 'Select a template:',
                    choices: templates.map(t => ({
                        name: `${chalk.bold(t.name)} - ${t.description} (${t.language}${t.framework ? `/${t.framework}` : ''})`,
                        value: t
                    }))
                }
            ]);
            selectedTemplate = template;
        }

        console.log(chalk.cyan(`\n🎨 Generating from template: ${chalk.bold(selectedTemplate.name)}\n`));

        // Collect template variables
        const context: Record<string, any> = {};
        
        for (const variable of selectedTemplate.variables) {
            if (variable.required || !variable.defaultValue) {
                let prompt: any = {
                    name: variable.name,
                    message: `${variable.description}:`,
                    default: variable.defaultValue
                };

                switch (variable.type) {
                    case 'boolean':
                        prompt.type = 'confirm';
                        break;
                    case 'array':
                        prompt.type = 'input';
                        prompt.filter = (input: string) => input.split(',').map(s => s.trim());
                        prompt.message += ' (comma-separated)';
                        break;
                    case 'object':
                        prompt.type = 'input';
                        prompt.filter = (input: string) => {
                            try {
                                return JSON.parse(input);
                            } catch {
                                // Simple key:value parsing
                                const obj: Record<string, string> = {};
                                input.split(',').forEach(pair => {
                                    const [key, value] = pair.split(':').map(s => s.trim());
                                    if (key && value) obj[key] = value;
                                });
                                return obj;
                            }
                        };
                        prompt.message += ' (JSON or key:value pairs)';
                        break;
                    default:
                        prompt.type = 'input';
                }

                const answer = await inquirer.prompt([prompt]);
                context[variable.name] = answer[variable.name];
            } else {
                context[variable.name] = variable.defaultValue;
            }
        }

        // Generate code
        const spinner = ora('Generating code...').start();
        
        try {
            const generatedCode = await templateEngine.generateFromTemplate(selectedTemplate.name, context);
            spinner.stop();
            
            console.log(chalk.green('\n✅ Code generated successfully!\n'));
            console.log(chalk.dim('─'.repeat(60)));
            console.log(generatedCode);
            console.log(chalk.dim('─'.repeat(60)));
            
            // Ask if user wants to save to file
            const { saveToFile } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'saveToFile',
                    message: 'Save to file?',
                    default: true
                }
            ]);
            
            if (saveToFile) {
                await saveGeneratedCode(generatedCode, selectedTemplate, context, sessionManager);
            }
            
        } catch (error) {
            spinner.fail('Failed to generate code');
            console.error(chalk.red(`Error: ${error}`));
        }
        
    } catch (error) {
        console.error(chalk.red(`Template generation failed: ${error}`));
    }
}

async function saveGeneratedCode(code: string, template: Template, context: Record<string, any>, sessionManager: SessionManager): Promise<void> {
    const activeSession = sessionManager.getActiveSession();
    const basePath = activeSession?.projectPath || process.cwd();
    
    // Suggest filename based on template and context
    let suggestedName = '';
    const name = context.name || 'generated';
    
    switch (template.category) {
        case 'component':
            if (template.framework === 'react') {
                suggestedName = `${name}.tsx`;
            } else {
                suggestedName = `${name}.ts`;
            }
            break;
        case 'api':
            if (template.language === 'python') {
                suggestedName = `${name}.py`;
            } else {
                suggestedName = `${name}.ts`;
            }
            break;
        case 'test':
            if (template.language === 'python') {
                suggestedName = `test_${name}.py`;
            } else {
                suggestedName = `${name}.test.ts`;
            }
            break;
        default:
            suggestedName = `${name}.${template.language === 'python' ? 'py' : 'ts'}`;
    }
    
    const { filename } = await inquirer.prompt([
        {
            type: 'input',
            name: 'filename',
            message: 'Filename:',
            default: suggestedName
        }
    ]);
    
    const { filepath } = await inquirer.prompt([
        {
            type: 'input',
            name: 'filepath',
            message: 'Save to path:',
            default: basePath
        }
    ]);
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        const fullPath = path.join(filepath, filename);
        const dir = path.dirname(fullPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, code);
        console.log(chalk.green(`✅ File saved to: ${fullPath}`));
        
    } catch (error) {
        console.error(chalk.red(`❌ Failed to save file: ${error}`));
    }
}

export async function showTemplateInfo(templateEngine: TemplateEngine, templateName: string): Promise<void> {
    const template = templateEngine.getTemplate(templateName);
    
    if (!template) {
        console.error(chalk.red(`❌ Template '${templateName}' not found`));
        return;
    }
    
    console.log(chalk.cyan.bold(`\n📋 Template: ${template.name}\n`));
    console.log(`${chalk.bold('Description:')} ${template.description}`);
    console.log(`${chalk.bold('Category:')} ${template.category}`);
    console.log(`${chalk.bold('Language:')} ${template.language}`);
    if (template.framework) {
        console.log(`${chalk.bold('Framework:')} ${template.framework}`);
    }
    
    if (template.variables.length > 0) {
        console.log(chalk.blue('\n📝 Variables:\n'));
        template.variables.forEach(variable => {
            const required = variable.required ? chalk.red('*') : chalk.gray('(optional)');
            const defaultVal = variable.defaultValue !== undefined ? ` [default: ${JSON.stringify(variable.defaultValue)}]` : '';
            console.log(`  • ${chalk.bold(variable.name)} (${variable.type}) ${required}`);
            console.log(`    ${variable.description}${defaultVal}`);
        });
    }
    
    console.log(chalk.gray('\n💡 Use "superrez template generate ' + templateName + '" to generate code'));
}

export async function manageTemplates(templateEngine: TemplateEngine): Promise<void> {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Template management:',
            choices: [
                { name: '📋 List all templates', value: 'list' },
                { name: '🎨 Generate from template', value: 'generate' },
                { name: '📖 Show template info', value: 'info' },
                { name: '🔍 Analyze project patterns', value: 'analyze' }
            ]
        }
    ]);
    
    switch (action) {
        case 'list':
            await listTemplates(templateEngine);
            break;
        case 'generate':
            await generateFromTemplate(templateEngine, null as any);
            break;
        case 'info':
            const templates = templateEngine.getAvailableTemplates();
            const { template } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'template',
                    message: 'Select template for info:',
                    choices: templates.map(t => ({ name: t.name, value: t.name }))
                }
            ]);
            await showTemplateInfo(templateEngine, template);
            break;
        case 'analyze':
            console.log(chalk.cyan('🔍 Analyzing project patterns...'));
            console.log(chalk.gray('Pattern analysis integrated into template generation'));
            break;
    }
}