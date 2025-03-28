# Changelog


All notable changes to the AI Voice Call System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.9.2] - 2025-03-28
### Added

- Back buttons on Recent Calls and Call Details pages
- Settings page placeholder to prevent 404 errors
- Custom gentle-pulse animation for softer ringing indication
- Default agent selection in New Call form (oldest agent)
- Outside click handling for modal dialogs

### Changed

- Enhanced status timeline to show meaningful call state progression
- Improved status color indicators: green for completed, blue for in-progress
- Updated Dashboard to properly display recent calls and statistics
- Modified database schema to support longer recording URLs
- Fixed agent selection to properly use agent_id

### Fixed

- SQL database error with recording_url column length
- Agent selection in AgentSelector modal
- Call status updating and display issues
- Proper handling of Plivo API responses
- Modal closing behavior for better UX

## [1.9.1] - 2025-03-28

### Added
- Complete database architecture overhaul with comprehensive models
- New controllers for agent, campaign, and phone number management
- Robust API client utilities for frontend-backend integration
- Caching mechanisms for API responses to improve performance
- Proper datetime handling for SQLite compatibility
- Enhanced debugging with detailed error logging and tracebacks

### Changed
- Migrated from localStorage to database-driven architecture
- Enhanced RecentCalls component to use API data with pagination
- Updated App.jsx to interact with the backend instead of localStorage
- Improved error handling throughout the application
- Enhanced data normalization for consistency
- Optimized database queries for better performance
- Updated Python dependencies to support new features

### Fixed
- Critical datetime handling issue with SQLite database
- RecentCalls component now properly displays call history from database
- Fixed call status API to properly handle timestamp data
- Resolved issues with call analytics data storage
- Improved error handling to prevent application crashes
- Enhanced logging for better debugging


## [1.8.0] - 2025-03-23

### Added
- Added new AI Analysis tab in the Analysis component for enhanced insights
- Implemented audio proxy endpoint to resolve CORS issues with recordings
- Added robust error handling throughout the application
- Enhanced audio recording playback with fallback mechanisms
- Included direct download links for call recordings
- Added debug logging for improved troubleshooting

### Fixed
- Critical issue with Analysis button in Recent Calls table
- Fixed timestamp display in transcription that was previously invisible
- Resolved "Recording not ready" errors showing up in wrong tabs
- Fixed CORS issues with audio file playback
- Improved error isolation so failures in one component don't affect others
- Enhanced robustness of API response handling
- Fixed issues with WaveformPlayer visualization
- Properly disabled Analysis buttons for calls that aren't completed

### Changed
- Moved call summary to the top of Analytics tab for better visibility
- Simplified metrics in Analytics tab by removing redundant information
- Enhanced recording player UI with better error states and fallbacks
- Improved timestamp formatting with more readable display
- Updated error messages to be more user-friendly and informative
- Enhanced API integration between Plivo and Ultravox services
- Optimized data fetching to reduce loading times
- Improved response handling for different API status codes


### Technical
- Refactored Analysis component for better maintainability
- Improved state management for call data
- Enhanced conditional rendering based on data availability
- Implemented better error boundaries for critical components
- Added fallback UI for scenarios where API data is unavailable

### Known Issues

- Need to work on timestamps to call transcriptions with IST time format



## [1.7.0] - 2025-03-24

### Added
- Enhanced Analysis component with improved data refreshing capability
- Better loading indicators throughout the application
- Informative user messages when data isn't immediately available
- Detailed console logging for debugging and monitoring
- Additional pagination controls at the top of the Recent Calls table for better usability

### Fixed
- Critical issue with VT call ID mapping in Analysis feature
- Fixed "Cannot access data before initialization" error in Analysis component
- Corrected handling of 425 errors when recordings aren't immediately available
- Fixed issue with Call Status analysis view showing only single message transcript
- Ensured Analysis view retrieves complete transcript by using the correct VT call ID
- Improved error handling throughout the application
- Enhanced user messaging for situations when data isn't immediately available
- Consolidated terminology by renaming "Ultravox Call ID" to "VT Call ID" throughout the UI

### Changed
- CallStatus component now directly fetches call mapping to ensure accuracy
- Analysis button in Call Details moved to the header for better visibility
- Improved component data flow to ensure consistent state across views
- Enhanced API error handling with specific messages for different error types
- Reduced UI noise by removing unnecessary auto-refresh checkbox
- Set call history to display 20 calls per page for better readability
- Updated project structure documentation
- Added comprehensive logging throughout components for easier troubleshooting


## [1.6.0] - 2025-03-22

### Added
- More precise call status tracking with states "initiating", "ringing", "in-progress", etc.
- Improved phone number management with normalization and duplicate prevention
- Custom log filtering system to reduce terminal noise
- Time-based message suppression for repetitive status checks

### Fixed
- Premature "completed" notifications during call ringing
- Phone number list management issues in localStorage
- Excessive logging in terminal for status endpoint calls and call status checks
- Improved error handling in localStorage operations

### Changed
- Enhanced call status tracking with state transition notifications
- Reduced log verbosity while maintaining functionality
- Improved number list storage with validation and normalization
- Limit saved phone numbers to reasonable list sizes (max 20)

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