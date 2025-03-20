# Changelog

All notable changes to the AI Voice Call System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2025-03-24

### Added
- Pagination in Call History with "Previous/Next" buttons
- Default selection of previously used phone numbers in dropdowns
- Delete buttons for saved phone numbers in dropdown lists
- Extended call duration options (1, 2, 3, 5, 8, 10, 15 minutes)
- Mobile layout improvements with proper spacing and z-index

### Fixed
- Mobile layout issues with sidebar menu overlap
- "View all calls" button functionality in Dashboard
- Call status updating every 500ms for real-time status

### Changed
- Improved phone number selection UX with better dropdown behavior
- Enhanced number management with prioritization of recent numbers

## [1.4.0] - 2025-03-21

### Added
- Material design ripple effect animations for sidebar navigation
- Enhanced notification system with contextual styling and icons
- Custom scrollbar styling for better UI consistency
- Improved form components with glass-morphism effects
- Subtle hover states and transitions throughout UI
- TabButton component for consistent tab navigation
- Animation delays for staggered loading effects
- Group hover effects for interactive elements
- Backdrop blur effects for modal and notification components
- Better organized settings panel
- New Input and Select components with improved accessibility

### Changed
- Improved AgentForm with modern styling and animations
- Enhanced Modal component with body scroll locking
- Refined input field styling with consistent hover effects
- Updated notification system with gradient backgrounds
- Improved form organization and visual hierarchy
- Standardized icon usage across components
- Made form animations more subtle and professional
- Better organized inactivity message interface
- Enhanced agent management UX with hover controls
- Improved App.jsx structure with better component organization

### Fixed
- Notification closure logic to prevent clearing wrong notifications
- Modal component z-indexing issues
- Improved form validation styling
- Fixed sidebar animation conflicts
- Corrected scrolling behavior in modals
- Added missing icon imports

## [1.3.1] - 2025-03-19

### Added
- Modern UI redesign with enhanced visual aesthetics
- New color scheme with customizable primary, accent, and dark colors
- Card and Button UI component system for consistent styling
- Glass-morphism effects and gradient backgrounds
- New UI components: Input, Select, Modal, PageLayout components
- Improved typography with professional font pairings
- Enhanced Dashboard with better statistical visualization
- Redesigned Analysis component with tabbed interface
- Modernized NewCallForm with improved recipient selection
- Standard PageLayout component for consistent UI structure
- Subtle animations and transitions throughout the interface
- More intuitive layouts for call data visualization
- Improved Badge component with variants and options
- Standardized notification system

### Changed
- Replaced flat design with depth through shadows and gradients
- Updated iconography for better visual hierarchy
- Improved error and empty state displays
- Enhanced audio player interface in recording section
- Better organization of analytics data
- Refined color-coding system for call statuses
- More responsive sidebar with mobile optimization
- Refactored App.jsx for cleaner component rendering
- Updated CallDetails with improved information grouping
- Redesigned CallStatus with better visual feedback
- Enhanced RecentCalls with modern table styling

### Fixed
- "Waveform" icon compatibility issue with lucide-react
- Card component styling inconsistencies
- Button hover state transitions
- Mobile layout display issues
- Loading state indicators
- Dropdown positioning in NewCallForm
- Table overflow issues in RecentCalls component
- Improved error handling in CallDetails component

### Known Issues
- Some icons may not appear correctly on older browsers
- Font loading may cause slight layout shifts on initial page load
- Audio player controls styling is inconsistent across browsers
- Glass-morphism effects may impact performance on low-end devices
- State management could be improved to reduce redundant API calls
- Dark mode toggle not yet implemented

## [1.3.0] - 2025-03-19

### Added
- Enhanced Analysis component to handle conversations of all sizes
- Multi-source duration calculation with fallback mechanisms
- Voice-only input detection and statistics
- Duration details section in Analytics tab
- Improved handling of missing text fields in messages
- Comprehensive error handling for API responses
- Detailed logging throughout the application

### Fixed
- Resolved "Cannot read properties of undefined" error for large conversations
- Fixed call duration calculation to properly display time formats
- Corrected message display to show full content without truncation
- Fixed Ultravox call ID mapping (changed "id" to "callId" in API handling)
- Improved error state display for missing data
- Enhanced API error response handling

### Changed
- Updated Analysis.jsx to display full message content by default
- Improved duration formatting to support hours:minutes:seconds format
- Enhanced duration display to show values from multiple sources
- Redesigned Analytics tab with improved data organization
- Updated message rendering to handle voice-only inputs
- Improved handling of role-based styling in message display

## [1.2.0] - 2025-03-19

### Added
- Call Analysis component for real-time analysis of call transcriptions
- Call recording playback and download capability
- Comprehensive call analytics with message statistics
- Call transcription display with role-based styling
- Database integration for persistent call mapping storage
- API endpoints for retrieving call analytics and transcriptions
- Ultravox-Plivo call ID mapping mechanism
- Helper endpoints for debugging call mappings

### Fixed
- Fixed issue with Ultravox call ID retrieval (changed "id" to "callId" in API handling)
- Resolved "Cannot read properties of undefined" error in Analysis component
- Fixed duration calculation to properly handle different data sources
- Improved message display to handle missing text fields in transcripts
- Enhanced error handling in API controllers with proper logging
- Added proper frontend error states for missing call mappings

### Changed
- Updated Analysis component to display full messages by default without truncation
- Enhanced duration calculation with multiple fallback approaches
- Improved formatting for call duration display with hours, minutes, and seconds
- Added additional duration information sources in Analytics tab
- Updated API controllers to better handle mapping between Plivo and Ultravox
- Enhanced ViewCallAnalysis function to handle multiple data sources
- Reorganized call transcript display with better formatting and information

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