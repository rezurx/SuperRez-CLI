import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export interface Template {
  name: string;
  description: string;
  category: string;
  language: string;
  files: TemplateFile[];
}

export interface TemplateFile {
  name: string;
  content: string;
  executable?: boolean;
}

export class TemplateEngine {
  private templates: Template[] = [];

  constructor() {
    this.initializeBuiltInTemplates();
  }

  async listTemplates(): Promise<Template[]> {
    return [...this.templates];
  }

  async generateFromTemplate(templateName: string, targetDir?: string): Promise<void> {
    const template = this.templates.find(t => t.name === templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const outputDir = targetDir || process.cwd();
    
    console.log(chalk.cyan(`📝 Generating ${template.name} template...\n`));
    
    for (const file of template.files) {
      const filePath = path.join(outputDir, file.name);
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));
      
      // Write file
      await fs.writeFile(filePath, file.content, 'utf-8');
      
      // Make executable if needed
      if (file.executable) {
        await fs.chmod(filePath, 0o755);
      }
      
      console.log(chalk.green(`  ✓ Created ${file.name}`));
    }
    
    console.log(chalk.green(`\n✅ ${template.name} template generated successfully!`));
    console.log(chalk.gray(`📁 Location: ${outputDir}`));
  }

  private initializeBuiltInTemplates(): void {
    this.templates = [
      this.createNodeJSExpressTemplate(),
      this.createPythonFlaskTemplate(),
      this.createReactComponentTemplate(),
      this.createCLIToolTemplate(),
      this.createBlockchainContractTemplate(),
      this.createAPIClientTemplate(),
      this.createTradingBotTemplate(),
      this.createDockerTemplate(),
      this.createGitHubActionsTemplate()
    ];
  }

  private createNodeJSExpressTemplate(): Template {
    return {
      name: 'nodejs-express',
      description: 'Node.js Express API server with TypeScript',
      category: 'Backend',
      language: 'TypeScript',
      files: [
        {
          name: 'package.json',
          content: `{
  "name": "express-api-server",
  "version": "1.0.0",
  "description": "Express API server with TypeScript",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.4.5",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "jest": "^29.6.1"
  }
}`
        },
        {
          name: 'src/index.ts',
          content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Express API Server is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});`
        },
        {
          name: 'tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`
        },
        {
          name: '.env.example',
          content: `PORT=3000
NODE_ENV=development
API_KEY=your_api_key_here`
        }
      ]
    };
  }

  private createPythonFlaskTemplate(): Template {
    return {
      name: 'python-flask',
      description: 'Python Flask API with best practices',
      category: 'Backend',
      language: 'Python',
      files: [
        {
          name: 'app.py',
          content: `#!/usr/bin/env python3
"""
Flask API Server
A simple Flask API with best practices
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Flask API Server is running!',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/echo', methods=['POST'])
def echo():
    """Echo endpoint for testing"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    
    return jsonify({
        'echo': data,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal error: {error}')
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])`,
          executable: true
        },
        {
          name: 'requirements.txt',
          content: `Flask==2.3.2
Flask-CORS==4.0.0
python-dotenv==1.0.0
gunicorn==21.2.0`
        },
        {
          name: '.env.example',
          content: `FLASK_DEBUG=False
PORT=5000
SECRET_KEY=your-secret-key-here`
        },
        {
          name: 'run.sh',
          content: `#!/bin/bash
# Development server
export FLASK_ENV=development
export FLASK_DEBUG=True
python app.py`,
          executable: true
        }
      ]
    };
  }

  private createReactComponentTemplate(): Template {
    return {
      name: 'react-component',
      description: 'Modern React component with TypeScript and hooks',
      category: 'Frontend',
      language: 'TypeScript',
      files: [
        {
          name: 'MyComponent.tsx',
          content: `import React, { useState, useEffect } from 'react';
import './MyComponent.css';

interface MyComponentProps {
  title?: string;
  initialValue?: number;
  onValueChange?: (value: number) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({
  title = 'My Component',
  initialValue = 0,
  onValueChange
}) => {
  const [value, setValue] = useState<number>(initialValue);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  const handleIncrement = () => {
    setValue(prev => prev + 1);
  };

  const handleDecrement = () => {
    setValue(prev => prev - 1);
  };

  const handleReset = () => {
    setLoading(true);
    setTimeout(() => {
      setValue(initialValue);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="my-component">
      <h2 className="my-component__title">{title}</h2>
      
      <div className="my-component__counter">
        <span className="my-component__value">{value}</span>
      </div>

      <div className="my-component__controls">
        <button 
          onClick={handleDecrement}
          disabled={loading}
          className="my-component__button my-component__button--decrement"
        >
          -
        </button>
        
        <button 
          onClick={handleReset}
          disabled={loading}
          className="my-component__button my-component__button--reset"
        >
          {loading ? 'Resetting...' : 'Reset'}
        </button>
        
        <button 
          onClick={handleIncrement}
          disabled={loading}
          className="my-component__button my-component__button--increment"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default MyComponent;`
        },
        {
          name: 'MyComponent.css',
          content: `.my-component {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.my-component__title {
  text-align: center;
  color: #333;
  margin-bottom: 1.5rem;
}

.my-component__counter {
  text-align: center;
  margin-bottom: 2rem;
}

.my-component__value {
  font-size: 3rem;
  font-weight: bold;
  color: #2196f3;
}

.my-component__controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.my-component__button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.my-component__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.my-component__button--increment {
  background-color: #4caf50;
  color: white;
}

.my-component__button--increment:hover:not(:disabled) {
  background-color: #45a049;
}

.my-component__button--decrement {
  background-color: #f44336;
  color: white;
}

.my-component__button--decrement:hover:not(:disabled) {
  background-color: #da190b;
}

.my-component__button--reset {
  background-color: #ff9800;
  color: white;
}

.my-component__button--reset:hover:not(:disabled) {
  background-color: #e68900;
}`
        },
        {
          name: 'MyComponent.test.tsx',
          content: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  test('renders with default props', () => {
    render(<MyComponent />);
    expect(screen.getByText('My Component')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('increments value when + button is clicked', () => {
    render(<MyComponent />);
    const incrementButton = screen.getByText('+');
    fireEvent.click(incrementButton);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('decrements value when - button is clicked', () => {
    render(<MyComponent initialValue={5} />);
    const decrementButton = screen.getByText('-');
    fireEvent.click(decrementButton);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('calls onValueChange when value changes', () => {
    const mockOnValueChange = jest.fn();
    render(<MyComponent onValueChange={mockOnValueChange} />);
    
    const incrementButton = screen.getByText('+');
    fireEvent.click(incrementButton);
    
    expect(mockOnValueChange).toHaveBeenCalledWith(1);
  });
});`
        }
      ]
    };
  }

  private createCLIToolTemplate(): Template {
    return {
      name: 'cli-tool',
      description: 'Command-line tool with TypeScript and Commander.js',
      category: 'CLI',
      language: 'TypeScript',
      files: [
        {
          name: 'src/index.ts',
          content: `#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { version } from '../package.json';

const program = new Command();

// ASCII art banner
console.log(
  chalk.cyan(
    figlet.textSync('My CLI Tool', { horizontalLayout: 'full' })
  )
);

program
  .name('my-cli-tool')
  .description('A powerful CLI tool built with TypeScript')
  .version(version);

program
  .command('hello')
  .description('Say hello')
  .option('-n, --name <name>', 'Name to greet', 'World')
  .action((options) => {
    console.log(chalk.green(\`Hello, \${options.name}! 👋\`));
  });

program
  .command('count')
  .description('Count to a number')
  .argument('<number>', 'Number to count to')
  .option('-s, --step <step>', 'Step size', '1')
  .action((number, options) => {
    const target = parseInt(number);
    const step = parseInt(options.step);
    
    if (isNaN(target) || isNaN(step)) {
      console.log(chalk.red('Please provide valid numbers'));
      return;
    }
    
    console.log(chalk.blue(\`Counting to \${target} with step \${step}:\`));
    for (let i = step; i <= target; i += step) {
      console.log(chalk.yellow(i));
    }
  });

program
  .command('analyze')
  .description('Analyze current directory')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.cyan('🔍 Analyzing current directory...'));
    
    // Simulate analysis
    const files = ['file1.js', 'file2.ts', 'file3.py'];
    
    if (options.verbose) {
      console.log(chalk.gray('Found files:'));
      files.forEach(file => console.log(chalk.gray(\`  - \${file}\`)));
    }
    
    console.log(chalk.green(\`✅ Analysis complete! Found \${files.length} files.\`));
  });

program.parse();`
        },
        {
          name: 'package.json',
          content: `{
  "name": "my-cli-tool",
  "version": "1.0.0",
  "description": "A powerful CLI tool built with TypeScript",
  "main": "dist/index.js",
  "bin": {
    "my-cli-tool": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^4.1.2",
    "figlet": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.4.5",
    "@types/figlet": "^1.5.6",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "jest": "^29.6.1"
  },
  "keywords": ["cli", "tool", "typescript"],
  "author": "Your Name",
  "license": "MIT"
}`
        },
        {
          name: 'tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`
        }
      ]
    };
  }

  private createBlockchainContractTemplate(): Template {
    return {
      name: 'solidity-contract',
      description: 'Solidity smart contract with tests and deployment',
      category: 'Blockchain',
      language: 'Solidity',
      files: [
        {
          name: 'contracts/MyToken.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MyToken
 * @dev ERC20 token with additional features
 */
contract MyToken is ERC20, Ownable, Pausable {
    uint256 private constant MAX_SUPPLY = 1000000 * 10**18; // 1 million tokens
    
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Mint new tokens (only minters can call this)
     */
    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        _mint(to, amount);
    }
    
    /**
     * @dev Add a new minter
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove a minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Pause all token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause all token transfers
     */
    function unpause() external onlyOwner {