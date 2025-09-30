# GitHub Copilot Instructions for RERUM History Component

## Project Overview

This repository contains a web component for displaying historical versions and changes of RERUM objects. RERUM is a research platform for managing cultural heritage data and digital scholarly editions.

## Technology Stack

- Web Components (Custom Elements)
- JavaScript/TypeScript
- HTML/CSS

## Code Style and Standards

### General Guidelines

- Follow modern JavaScript best practices (ES6+)
- Use meaningful variable and function names that clearly express intent
- Keep functions small and focused on a single responsibility
- Write self-documenting code with comments only when necessary to explain "why" not "what"

### Web Component Specific

- Follow Web Components v1 specification
- Use Shadow DOM for encapsulation when appropriate
- Ensure components are accessible (ARIA attributes, semantic HTML)
- Make components reusable and configurable via attributes/properties
- Emit custom events for component interactions

### Code Organization

- Keep component logic modular and testable
- Separate presentation from business logic
- Use descriptive class and method names following camelCase convention
- Group related functionality together

## Testing

- Write unit tests for core component functionality
- Test component lifecycle methods
- Test event handling and custom events
- Ensure accessibility compliance

## Documentation

- Document public APIs and component attributes
- Include usage examples in README
- Document custom events emitted by components
- Keep inline code comments minimal but meaningful

## Dependencies

- Minimize external dependencies
- Prefer vanilla JavaScript when possible
- Justify any new dependencies added

## Browser Compatibility

- Support modern browsers (last 2 versions)
- Test in Chrome, Firefox, Safari, and Edge
- Use polyfills only when necessary and document them

## Performance

- Optimize for rendering performance
- Avoid unnecessary DOM manipulation
- Use event delegation when appropriate
- Lazy load resources when possible

## License

This project is licensed under the MIT License. Ensure all contributions comply with this license.
