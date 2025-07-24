# Contributing to SuperRez CLI

Thank you for your interest in contributing to SuperRez CLI! This document provides guidelines and information for contributors.

## 🎯 Project Mission

SuperRez CLI aims to provide a cost-aware AI development assistant that offers 95% cost reduction compared to existing AI CLI tools while maintaining professional-grade functionality.

## 🚀 Quick Start for Contributors

### Development Setup
```bash
# Clone the repository
git clone https://github.com/rezurx/SuperRez-CLI.git
cd SuperRez-CLI

# Install dependencies
npm install

# Build the project
npm run build

# Test the CLI
node dist/index.js --help
```

### Interactive Mode Testing
```bash
# Test interactive mode
node dist/index.js interactive

# Test specific commands
node dist/index.js discover
node dist/index.js analyze --security
```

## 📋 Development Guidelines

### Code Style
- **TypeScript**: All code must be written in TypeScript with proper typing
- **ESLint**: Follow the project's ESLint configuration
- **Comments**: Use clear, concise comments for complex logic
- **Error Handling**: Implement comprehensive error handling with user-friendly messages

### Architecture Principles
- **Local-First**: Prioritize local analysis over API calls
- **Cost-Aware**: Always consider cost implications of new features
- **Modular**: Keep components focused and loosely coupled
- **User Experience**: Maintain professional CLI standards

## 🔧 Project Structure

```
src/
├── commands/          # CLI command handlers
├── core/             # Core functionality
├── interfaces/       # TypeScript interfaces
└── index.ts         # CLI entry point
```

## 🎨 Feature Development

### Adding New Commands
1. Create command handler in `src/commands/`
2. Add command registration in `src/index.ts`
3. Update tab completion in `src/commands/interactive.ts`
4. Add documentation to README.md

### Adding AI Tool Integration
1. Extend `AIOrchestrator` class
2. Add cost tracking in `CostTracker`
3. Update smart routing logic
4. Test with interactive mode

## 🧪 Testing

### Manual Testing Checklist
- [ ] Interactive mode launches correctly
- [ ] Tab completion works for all commands
- [ ] Progress indicators display properly
- [ ] Error handling provides helpful messages
- [ ] Session management functions correctly
- [ ] Budget tracking accurately reflects usage

### Testing Commands
```bash
# Test individual commands
npm run build && node dist/index.js discover
npm run build && node dist/index.js analyze --security
npm run build && node dist/index.js ai --tools

# Test interactive mode
npm run build && node dist/index.js interactive
```

## 📝 Documentation

### Required Documentation
- Update README.md for new features
- Add examples to user documentation
- Update PHASE_5_PROGRESS.md for major changes
- Include inline code comments for complex logic

### Documentation Standards
- Clear, concise explanations
- Practical examples with expected output
- Cost implications for any AI-related features
- Professional tone matching existing documentation

## 🐛 Bug Reports

### Bug Report Template
```markdown
**Description**: Brief description of the issue
**Steps to Reproduce**: 
1. Command run: `superrez ...`
2. Expected behavior: ...
3. Actual behavior: ...

**Environment**:
- OS: Ubuntu/macOS/Windows
- Node.js version: X.X.X
- SuperRez CLI version: X.X.X

**Additional Context**: Any relevant logs or screenshots
```

## ✨ Feature Requests

### Feature Request Template
```markdown
**Feature Description**: Clear description of the proposed feature
**Use Case**: Why this feature would be valuable
**Cost Implications**: How this affects the cost optimization goal
**Implementation Ideas**: Any technical suggestions (optional)
```

## 🎖️ Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes for significant contributions
- Invited to join the SuperRez Discord community

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Discord**: Real-time community support (link in main repository)

## 🏆 Contribution Types

We welcome contributions in these areas:
- **Code**: New features, bug fixes, performance improvements
- **Documentation**: User guides, API documentation, examples
- **Testing**: Manual testing, automated test creation
- **Design**: UI/UX improvements for CLI interface
- **Community**: Helping other users, writing tutorials

## 📜 License

By contributing to SuperRez CLI, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make SuperRez CLI the best cost-aware AI development assistant!** 🚀