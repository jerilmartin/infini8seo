# Contributing to Content Factory

Thank you for your interest in contributing to Content Factory! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow best practices

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Logs or error messages

### Suggesting Enhancements

1. Check existing feature requests
2. Create an issue with:
   - Clear use case
   - Proposed solution
   - Alternative approaches considered
   - Impact on existing functionality

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/content-factory.git
   cd content-factory
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Run the application
   docker-compose up

   # Test manually
   # Add automated tests (when available)
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Follow commit message conventions:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template
   - Link related issues

## Development Guidelines

### Code Style

**JavaScript/Node.js:**
- Use ES6+ features
- Use async/await for asynchronous code
- Destructure imports: `const { func } = require('module')`
- Use meaningful variable names
- Keep functions small and focused

**React/Next.js:**
- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components under 200 lines
- Use TypeScript types properly

**File Naming:**
- Components: PascalCase (`MyComponent.tsx`)
- Utilities: camelCase (`helperFunction.js`)
- Constants: UPPER_SNAKE_CASE (`API_URL`)

### Project Structure

```
agenticai/
├── server/              # Express API Gateway
│   └── index.js
├── worker/              # BullMQ Worker Process
│   ├── index.js
│   ├── phaseA.js       # Research phase
│   └── phaseB.js       # Content generation phase
├── models/              # MongoDB schemas
│   ├── Job.js
│   └── Content.js
├── config/              # Configuration files
│   ├── database.js
│   └── redis.js
├── utils/               # Utility functions
│   └── logger.js
├── client/              # Next.js frontend
│   ├── app/
│   ├── components/
│   └── public/
├── scripts/             # Helper scripts
└── logs/                # Application logs
```

### Adding New Features

#### Adding a New API Endpoint

1. Add route in `server/index.js`
2. Add validation
3. Add error handling
4. Update API documentation in README
5. Test the endpoint

#### Adding New Worker Phases

1. Create new file in `worker/` directory
2. Export main function
3. Import in `worker/index.js`
4. Add to job processing pipeline
5. Update Job schema if needed
6. Document the phase

#### Adding Frontend Pages

1. Create page in `client/app/`
2. Add necessary components
3. Implement data fetching
4. Add loading and error states
5. Style with Tailwind CSS
6. Test responsiveness

### Testing

**Manual Testing Checklist:**
- [ ] API endpoints return correct responses
- [ ] Worker processes jobs successfully
- [ ] Frontend displays data correctly
- [ ] Error states are handled gracefully
- [ ] Mobile responsive design works
- [ ] Loading states are shown appropriately

**Automated Tests (Future):**
```bash
npm test
```

### Documentation

Update documentation when:
- Adding new features
- Changing API endpoints
- Modifying environment variables
- Changing deployment process
- Adding dependencies

Files to update:
- `README.md` - Main documentation
- `SETUP_GUIDE.md` - Installation steps
- `DEPLOYMENT.md` - Deployment instructions
- `API.md` - API reference (if created)

## Areas for Contribution

### High Priority

1. **Testing**
   - Add unit tests for API endpoints
   - Add integration tests for worker
   - Add E2E tests for full pipeline
   - Add frontend component tests

2. **Authentication**
   - User registration/login
   - JWT token management
   - API key authentication
   - Rate limiting per user

3. **Payment Integration**
   - Stripe integration
   - Subscription management
   - Usage tracking
   - Billing dashboard

4. **Admin Dashboard**
   - User management
   - Job monitoring
   - Analytics and statistics
   - System health metrics

### Medium Priority

5. **Content Improvements**
   - Support for different content types (LinkedIn posts, tweets, etc.)
   - Custom content templates
   - AI model selection
   - Multi-language support

6. **Export Features**
   - Export as PDF
   - Export to WordPress
   - Export to Medium
   - Bulk export as ZIP

7. **Optimization**
   - Caching layer (Redis)
   - Database query optimization
   - Image optimization
   - Code splitting

### Low Priority

8. **UI/UX Enhancements**
   - Dark mode
   - Customizable themes
   - Drag-and-drop interface
   - Rich text editor

9. **Integrations**
   - Zapier integration
   - Webhook support
   - API webhooks
   - Third-party CMS integration

## Code Review Process

1. Automated checks must pass (when implemented)
2. At least one maintainer must approve
3. All conversations must be resolved
4. Branch must be up to date with main

## Getting Help

- **Questions:** Open a Discussion
- **Bugs:** Create an Issue
- **Chat:** Join Discord (if available)
- **Email:** Contact maintainers

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Content Factory! 🎉

