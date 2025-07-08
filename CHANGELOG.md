# Change Log

All notable changes to the "vscode-portfolio-insight" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- **Account Management Feature**: Organize assets into accounts (bank, stock, fund, crypto, etc.)
  - Account CRUD operations in Asset Definition Editor
  - Hierarchical tree view with accounts as parent nodes
  - Optional account assignment for assets
  - Account type selection and validation
  - Unified PortfolioData structure with accounts array
- **Enhanced Asset Definition Editor**
  - Dedicated Accounts section with full CRUD functionality
  - Account selection dropdown for asset assignment
  - Real-time validation and error handling
  - Improved summary display with asset and account counts
- **Updated Tree View Structure**
  - PortfolioNode as root with account and asset children
  - Assets displayed under their assigned accounts
  - Unassigned assets remain directly under Assets root
- **Comprehensive Documentation**
  - Account Feature Implementation guide
  - Account User Guide with step-by-step instructions
  - Updated README with account management examples
  - Sample portfolio data with account structure

### Changed
- Asset submission now always uses PortfolioData structure
- Removed legacy handling for pure asset arrays
- Enhanced data access layer with account caching and CRUD operations
- Updated all test files to support new account functionality

### Fixed
- Bug where unassigned assets were incorrectly auto-assigned to new accounts
- Type safety improvements in asset editor message handling
- Test syntax corrections for proper VS Code test runner compatibility

## [0.1.0] - Initial Release

- Portfolio management with asset definitions
- Multi-currency support with exchange rates
- Asset tagging system
- Portfolio update tracking
- Transfer and transaction management