# Changelog

All notable changes to the AI Voice Call System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-03-18

### Added
- Server status monitoring with 1-second refresh interval
- Pulsing animation for online server status
- Animations for UI elements (fade-in, slide-in, bounce, glow)
- Animation delays for staggered loading effects
- Immediate saving to localStorage for critical operations
- Console logging for localStorage operations to help with debugging
- Default selection of oldest agent when loading the application

### Fixed
- AgentSelector now closes when "Create New Agent" is clicked
- Fixed persistence issues with agents and saved recipients in localStorage
- Corrected Plivo API call status checking in api_controller.py
- Fixed system prompt text alignment in Call Status view
- Improved fullscreen display by fixing window sizing
- Added robust error handling for localStorage operations
- Protected against overwriting existing data with empty arrays

### Changed
- Enhanced handleSelectAgent to open agent form when clicking on agent name
- Updated Sidebar component with server status monitoring
- Improved localStorage implementation with proper data validation
- Modified getCallStatus function to handle errors properly

## [1.0.0] - 2025-03-15

### Added
- Initial release of AI Voice Call System
- Integration with Plivo for telephony services
- Integration with Ultravox for AI voice services
- Agent management system
- Call initiation and monitoring
- Call history tracking
- Recipient management and history
- Dark theme UI with Tailwind CSS
- React frontend with Flask backend