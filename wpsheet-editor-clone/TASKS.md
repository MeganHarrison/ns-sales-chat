# WP Sheet Editor - Implementation Tasks

**Project Status:** Not Started  
**Timeline:** 3-6 weeks for MVP  
**Last Updated:** October 01, 2025

---

## Phase 1: Plugin Setup (Days 1-2)

### 1.1 Initial Setup
- [ ] Set up local WordPress development environment
- [ ] Create plugin base directory structure
  - [ ] Create `wp-content/plugins/wp-sheet-editor/`
  - [ ] Create `includes/` directory
  - [ ] Create `admin/` directory
  - [ ] Create `admin/css/` directory
  - [ ] Create `admin/js/` directory
  - [ ] Create `admin/views/` directory

### 1.2 Core PHP Files
- [ ] Create `wp-sheet-editor.php` (main plugin file)
  - [ ] Add plugin header comment block
  - [ ] Define constants (WSE_VERSION, WSE_PLUGIN_DIR, WSE_PLUGIN_URL)
  - [ ] Add security check (!defined('ABSPATH'))
  - [ ] Require activator class
  - [ ] Require admin class
  - [ ] Register activation hook
  - [ ] Initialize admin class conditionally

- [ ] Create `includes/class-wse-activator.php`
  - [ ] Add WordPress version check (6.0+)
  - [ ] Add user capability check
  - [ ] Add flush_rewrite_rules()

- [ ] Create `includes/class-wse-admin.php`
  - [ ] Implement __construct() method
  - [ ] Add admin_menu action hook
  - [ ] Add admin_enqueue_scripts action hook
  - [ ] Implement add_admin_menu() method
  - [ ] Implement enqueue_scripts() method
  - [ ] Add manifest.json loading logic
  - [ ] Add error notice for missing build files
  - [ ] Implement wp_localize_script for config
  - [ ] Implement render_admin_page() method

- [ ] Create `admin/views/admin-display.php`
  - [ ] Add wrap div
  - [ ] Add page title
  - [ ] Add wse-root container div

### 1.3 Validation
- [ ] Activate plugin in WordPress admin
- [ ] Check for PHP errors in debug.log
- [ ] Verify admin menu appears
- [ ] Verify clicking menu shows page (without React yet)
- [ ] Verify no console errors
- [ ] Take screenshot of working admin page

---

## Phase 2: React App Setup (Days 2-3)

### 2.1 React Project Initialization
- [ ] Create `react-app/` directory in plugin root
- [ ] Navigate to react-app directory
- [ ] Run `npm init -y`

### 2.2 Package Configuration
- [ ] Create/edit `react-app/package.json`
  - [ ] Set name to "wp-sheet-editor-react"
  - [ ] Set private: true
  - [ ] Set version: "1.0.0"
  - [ ] Set type: "module"
  - [ ] Add dev script: "vite"
  - [ ] Add build script: "vite build"
  - [ ] Add preview script: "vite preview"
  - [ ] Add react dependency (^18.3.1)
  - [ ] Add react-dom dependency (^18.3.1)
  - [ ] Add ag-grid-react dependency (^32.3.3)
  - [ ] Add ag-grid-community dependency (^32.3.3)
  - [ ] Add @vitejs/plugin-react devDependency (^4.3.4)
  - [ ] Add vite devDependency (^6.0.1)

### 2.3 Vite Configuration
- [ ] Create `react-app/vite.config.js`
  - [ ] Import defineConfig from vite
  - [ ] Import react plugin
  - [ ] Import path module
  - [ ] Configure react plugin
  - [ ] Set outDir to '../admin/js/dist'
  - [ ] Set emptyOutDir: true
  - [ ] Set manifest: true
  - [ ] Configure rollupOptions with main.jsx input

### 2.4 React Source Files
- [ ] Create `react-app/src/` directory
- [ ] Create `react-app/src/main.jsx`
  - [ ] Import React
  - [ ] Import ReactDOM
  - [ ] Import App component
  - [ ] Import AG-Grid CSS files
  - [ ] Add document ready check
  - [ ] Implement initApp() function
  - [ ] Add root element check
  - [ ] Add React.StrictMode wrapper

- [ ] Create `react-app/src/App.jsx`
  - [ ] Import React
  - [ ] Import PostsGrid component (placeholder)
  - [ ] Create App component structure
  - [ ] Add wse-app wrapper div
  - [ ] Add page heading
  - [ ] Add PostsGrid component
  - [ ] Export App component

- [ ] Create `react-app/src/App.css`
  - [ ] Add .wse-app styles (padding: 20px)
  - [ ] Add .wse-toolbar styles (flexbox layout)
  - [ ] Add .wse-toolbar input styles
  - [ ] Add .wse-toolbar button styles
  - [ ] Add .wse-toolbar button:hover styles
  - [ ] Add .wse-toolbar button:disabled styles

- [ ] Create `react-app/src/components/` directory
- [ ] Create `react-app/src/components/PostsGrid.jsx` (placeholder)
  - [ ] Add simple placeholder component
  - [ ] Return div with "PostsGrid placeholder" text

### 2.5 Build and Test
- [ ] Run `npm install` in react-app directory
- [ ] Run `npm run build`
- [ ] Verify `admin/js/dist/` directory created
- [ ] Verify `.vite/` subdirectory exists
- [ ] Verify `manifest.json` exists
- [ ] Verify hashed JS file exists
- [ ] Verify assets directory exists
- [ ] Visit WordPress admin Sheet Editor page
- [ ] Verify "WordPress Posts Editor" header appears
- [ ] Verify no console errors
- [ ] Take screenshot of working React app

---

## Phase 3: WordPress API Service (Days 3-5)

### 3.1 API Service Structure
- [ ] Create `react-app/src/services/` directory
- [ ] Create `react-app/src/services/wpApi.js`

### 3.2 WPApiService Class - Core
- [ ] Create WPApiService class
- [ ] Implement constructor
  - [ ] Get wseConfig from window
  - [ ] Set apiUrl with fallback
  - [ ] Set nonce from config

### 3.3 WPApiService - Request Method
- [ ] Implement request() method
  - [ ] Build full URL
  - [ ] Create default headers object
  - [ ] Add Content-Type header
  - [ ] Add X-WP-Nonce header
  - [ ] Add credentials: 'same-origin'
  - [ ] Merge default and custom options
  - [ ] Merge headers
  - [ ] Add try-catch block
  - [ ] Make fetch request
  - [ ] Check response.ok
  - [ ] Parse error JSON if not ok
  - [ ] Throw descriptive error
  - [ ] Get X-WP-Total header
  - [ ] Get X-WP-TotalPages header
  - [ ] Parse response JSON
  - [ ] Return data and pagination object
  - [ ] Log errors in catch block
  - [ ] Re-throw errors

### 3.4 WPApiService - Posts Methods
- [ ] Implement getPosts() method
  - [ ] Accept options object with defaults
  - [ ] Create URLSearchParams
  - [ ] Add page parameter
  - [ ] Add per_page parameter
  - [ ] Add orderby parameter
  - [ ] Add order parameter
  - [ ] Add search parameter conditionally
  - [ ] Call request() with posts endpoint
  - [ ] Return result

- [ ] Implement updatePost() method
  - [ ] Accept id and data parameters
  - [ ] Call request() with POST method
  - [ ] Pass JSON stringified data
  - [ ] Return result

### 3.5 WPApiService - Batch Updates
- [ ] Implement batchUpdatePosts() method
  - [ ] Create empty chunks array
  - [ ] Loop through updates in chunks of 25
  - [ ] Push chunks to array
  - [ ] Create empty results array
  - [ ] Loop through chunks
  - [ ] Map chunk to batch request format
  - [ ] Create batch fetch request to /wp-json/batch/v1/
  - [ ] Add Content-Type header
  - [ ] Add X-WP-Nonce header
  - [ ] Add credentials
  - [ ] Stringify requests array
  - [ ] Check response.ok
  - [ ] Throw error if not ok
  - [ ] Parse response JSON
  - [ ] Push responses to results array
  - [ ] Return results array

### 3.6 WPApiService - Pages Methods
- [ ] Implement getPages() method
  - [ ] Accept options object with defaults
  - [ ] Create URLSearchParams
  - [ ] Add all required parameters
  - [ ] Call request() with pages endpoint
  - [ ] Return result

- [ ] Implement updatePage() method
  - [ ] Accept id and data parameters
  - [ ] Call request() with POST method
  - [ ] Return result

### 3.7 API Service Export
- [ ] Create singleton instance
- [ ] Export default instance

### 3.8 API Testing
- [ ] Rebuild React app (`npm run build`)
- [ ] Open WordPress admin Sheet Editor
- [ ] Open browser console
- [ ] Test wpApi.getPosts() manually
- [ ] Verify posts return
- [ ] Test wpApi.updatePost() manually
- [ ] Verify update works
- [ ] Check Network tab for correct headers
- [ ] Verify nonce is sent
- [ ] Take screenshot of successful API calls

---

## Phase 4: AG-Grid Integration (Days 5-8)

### 4.1 PostsGrid Component Structure
- [ ] Update `react-app/src/components/PostsGrid.jsx`
- [ ] Add all required imports
  - [ ] Import React hooks (useState, useEffect, useCallback, useRef)
  - [ ] Import AgGridReact
  - [ ] Import wpApi service

### 4.2 Component State Setup
- [ ] Create rowData state (empty array)
- [ ] Create loading state (true)
- [ ] Create pagination state (total: 0, totalPages: 0)
- [ ] Create currentPage state (1)
- [ ] Create searchTerm state (empty string)
- [ ] Create gridRef using useRef()

### 4.3 Column Definitions - ID Column
- [ ] Define columnDefs array
- [ ] Add ID column definition
  - [ ] Set field: 'id'
  - [ ] Set headerName: 'ID'
  - [ ] Set width: 80
  - [ ] Set editable: false
  - [ ] Set filter: 'agNumberColumnFilter'
  - [ ] Set checkboxSelection: true
  - [ ] Set headerCheckboxSelection: true

### 4.4 Column Definitions - Title Column
- [ ] Add title column definition
  - [ ] Set field: 'title.rendered'
  - [ ] Set headerName: 'Title'
  - [ ] Set flex: 2
  - [ ] Set editable: true
  - [ ] Set cellEditor: 'agTextCellEditor'
  - [ ] Implement valueGetter for title.rendered
  - [ ] Implement valueSetter for title.rendered

### 4.5 Column Definitions - Status Column
- [ ] Add status column definition
  - [ ] Set field: 'status'
  - [ ] Set headerName: 'Status'
  - [ ] Set width: 120
  - [ ] Set editable: true
  - [ ] Set cellEditor: 'agSelectCellEditor'
  - [ ] Add cellEditorParams with status values array

### 4.6 Column Definitions - Date Column
- [ ] Add date column definition
  - [ ] Set field: 'date'
  - [ ] Set headerName: 'Date'
  - [ ] Set width: 180
  - [ ] Set editable: false
  - [ ] Implement valueFormatter to format date

### 4.7 Column Definitions - Author Column
- [ ] Add author column definition
  - [ ] Set field: 'author'
  - [ ] Set headerName: 'Author ID'
  - [ ] Set width: 100
  - [ ] Set editable: false

### 4.8 Column Definitions - Excerpt Column
- [ ] Add excerpt column definition
  - [ ] Set field: 'excerpt.rendered'
  - [ ] Set headerName: 'Excerpt'
  - [ ] Set flex: 1
  - [ ] Set editable: true
  - [ ] Set cellEditor: 'agLargeTextCellEditor'
  - [ ] Add cellEditorParams (maxLength, rows, cols)
  - [ ] Implement valueGetter (strip HTML, truncate)
  - [ ] Implement valueSetter

### 4.9 Default Column Configuration
- [ ] Define defaultColDef object
  - [ ] Set sortable: true
  - [ ] Set filter: true
  - [ ] Set resizable: true
  - [ ] Set editable: false

### 4.10 Data Fetching
- [ ] Implement fetchPosts() function
  - [ ] Set loading to true
  - [ ] Wrap in try-catch
  - [ ] Call wpApi.getPosts() with params
  - [ ] Update rowData state
  - [ ] Update pagination state
  - [ ] Log errors
  - [ ] Show alert on error
  - [ ] Set loading to false in finally

- [ ] Add useEffect for fetchPosts
  - [ ] Depend on currentPage
  - [ ] Depend on searchTerm

### 4.11 Cell Editing Handler
- [ ] Implement onCellValueChanged callback
  - [ ] Use useCallback hook
  - [ ] Destructure event (data, colDef, oldValue, newValue)
  - [ ] Return early if no change
  - [ ] Wrap in try-catch
  - [ ] Create updateData object
  - [ ] Handle title field update
  - [ ] Handle excerpt field update
  - [ ] Handle status field update
  - [ ] Call wpApi.updatePost()
  - [ ] Log success
  - [ ] Update cell value on success
  - [ ] Log error on failure
  - [ ] Revert cell value on failure
  - [ ] Show alert on failure

### 4.12 Search Handler
- [ ] Implement handleSearch() function
  - [ ] Accept event parameter
  - [ ] Call preventDefault()
  - [ ] Reset currentPage to 1

### 4.13 Export Handler
- [ ] Implement onExportCSV() function
  - [ ] Access grid API via ref
  - [ ] Call exportDataAsCsv()
  - [ ] Set dynamic filename with timestamp

### 4.14 Bulk Actions Handler
- [ ] Implement handleBulkStatusChange() function
  - [ ] Accept newStatus parameter
  - [ ] Get selected rows from grid API
  - [ ] Check if rows selected
  - [ ] Show alert if none selected
  - [ ] Show confirmation dialog
  - [ ] Return if not confirmed
  - [ ] Wrap in try-catch
  - [ ] Map selected rows to updates array
  - [ ] Call wpApi.batchUpdatePosts()
  - [ ] Call fetchPosts() to refresh
  - [ ] Show success alert
  - [ ] Log error on failure
  - [ ] Show error alert on failure

### 4.15 Toolbar UI
- [ ] Create toolbar div with wse-toolbar class
- [ ] Add search form
  - [ ] Add text input for search
  - [ ] Bind searchTerm state
  - [ ] Add onChange handler
  - [ ] Add submit button
  - [ ] Bind handleSearch to onSubmit

- [ ] Add Refresh button
  - [ ] Bind fetchPosts onClick
  - [ ] Disable when loading

- [ ] Add Export CSV button
  - [ ] Bind onExportCSV onClick

- [ ] Add Bulk Actions dropdown
  - [ ] Add disabled placeholder option
  - [ ] Add "Set to Publish" option
  - [ ] Add "Set to Draft" option
  - [ ] Add "Set to Pending" option
  - [ ] Add "Set to Private" option
  - [ ] Bind handleBulkStatusChange to onChange

- [ ] Add total posts display
  - [ ] Use marginLeft: auto
  - [ ] Show pagination.total

### 4.16 Grid UI
- [ ] Create grid container div
  - [ ] Add ag-theme-quartz class
  - [ ] Set height: 600px
  - [ ] Set width: 100%

- [ ] Add AgGridReact component
  - [ ] Bind gridRef
  - [ ] Pass rowData prop
  - [ ] Pass columnDefs prop
  - [ ] Pass defaultColDef prop
  - [ ] Pass onCellValueChanged prop
  - [ ] Pass loading prop
  - [ ] Set animateRows: true
  - [ ] Set rowSelection: "multiple"
  - [ ] Set suppressRowClickSelection: true
  - [ ] Set enableCellTextSelection: true

### 4.17 Pagination UI
- [ ] Create pagination container div
  - [ ] Add marginTop: 15px
  - [ ] Use flexbox layout

- [ ] Add Previous button
  - [ ] Bind click to decrement page
  - [ ] Disable on page 1
  - [ ] Disable when loading

- [ ] Add page indicator
  - [ ] Show current page
  - [ ] Show total pages

- [ ] Add Next button
  - [ ] Bind click to increment page
  - [ ] Disable on last page
  - [ ] Disable when loading

### 4.18 Import App.css
- [ ] Add import statement for App.css in App.jsx

### 4.19 Build and Test
- [ ] Run `npm run build`
- [ ] Verify build succeeds
- [ ] Clear browser cache
- [ ] Visit WordPress admin Sheet Editor
- [ ] Verify grid loads with posts
- [ ] Test clicking title cell to edit
- [ ] Verify title change saves
- [ ] Check WordPress admin for updated title
- [ ] Test status dropdown editing
- [ ] Verify status change saves
- [ ] Test excerpt editing
- [ ] Verify excerpt change saves
- [ ] Test search functionality
- [ ] Verify search returns correct results
- [ ] Test pagination Previous button
- [ ] Test pagination Next button
- [ ] Test Export CSV button
- [ ] Verify CSV downloads
- [ ] Test selecting multiple rows
- [ ] Test bulk status change
- [ ] Verify bulk changes save
- [ ] Test column sorting
- [ ] Test column filtering
- [ ] Test column resizing
- [ ] Take screenshots of all working features

---

## Error Handling Implementation

### 5.1 API Error Handling
- [ ] Update onCellValueChanged with specific error checks
  - [ ] Check for 403 errors (permissions)
  - [ ] Check for 404 errors (not found)
  - [ ] Check for nonce errors
  - [ ] Add generic error fallback

### 5.2 Nonce Expiration Handling
- [ ] Update API request method
  - [ ] Check for nonce-related errors
  - [ ] Check for 401 errors
  - [ ] Show expiration message
  - [ ] Auto-reload page after timeout

### 5.3 Network Error Handling
- [ ] Update API request method
  - [ ] Check for NetworkError
  - [ ] Check navigator.onLine
  - [ ] Throw user-friendly network error

---

## Testing Phase

### 6.1 Functional Testing
- [ ] Test plugin activation
- [ ] Test plugin deactivation
- [ ] Verify admin menu appears
- [ ] Verify React app loads
- [ ] Test with 0 posts
- [ ] Test with 10 posts
- [ ] Test with 100 posts
- [ ] Test with 1000 posts
- [ ] Test title inline editing
- [ ] Test status inline editing
- [ ] Test excerpt inline editing
- [ ] Verify changes in WordPress admin
- [ ] Test search with various terms
- [ ] Test pagination forward
- [ ] Test pagination backward
- [ ] Test CSV export download
- [ ] Open exported CSV in Excel
- [ ] Test bulk status change to Publish
- [ ] Test bulk status change to Draft
- [ ] Test bulk status change to Pending
- [ ] Test bulk status change to Private
- [ ] Test row selection (single)
- [ ] Test row selection (multiple)
- [ ] Test row selection (all via header)
- [ ] Test column sorting ascending
- [ ] Test column sorting descending
- [ ] Test column filtering
- [ ] Test column resizing
- [ ] Document all test results

### 6.2 Error Handling Testing
- [ ] Test with expired nonce (wait 24+ hours)
- [ ] Test with network disconnected
- [ ] Test rapid clicking (duplicate saves)
- [ ] Test with Editor role (not admin)
- [ ] Test with Contributor role
- [ ] Test editing others' posts
- [ ] Test invalid post ID
- [ ] Document all error scenarios

### 6.3 Performance Testing
- [ ] Measure load time with 100 posts
- [ ] Measure load time with 1000 posts
- [ ] Test scrolling smoothness with 1000 rows
- [ ] Measure cell edit responsiveness
- [ ] Measure save operation speed
- [ ] Use browser DevTools Performance tab
- [ ] Document all performance metrics

### 6.4 Browser Compatibility Testing
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Document browser-specific issues

### 6.5 WordPress Compatibility Testing
- [ ] Test on WordPress 6.0
- [ ] Test on WordPress 6.1
- [ ] Test on WordPress 6.2
- [ ] Test on WordPress 6.3
- [ ] Test on WordPress 6.4 (latest)
- [ ] Test with PHP 7.4
- [ ] Test with PHP 8.0
- [ ] Test with PHP 8.1
- [ ] Test with PHP 8.2
- [ ] Document compatibility matrix

---

## Documentation Phase

### 7.1 User Documentation
- [ ] Create README.md in plugin root
  - [ ] Add plugin description
  - [ ] List features with checkmarks
  - [ ] Write installation instructions
  - [ ] Write usage instructions
  - [ ] List requirements
  - [ ] Add support contact info

### 7.2 Developer Documentation
- [ ] Create DEVELOPMENT.md
  - [ ] Document setup process
  - [ ] Document file structure
  - [ ] Document making changes workflow
  - [ ] Document API service architecture
  - [ ] Document adding new columns
  - [ ] Document debugging tips
  - [ ] Add code examples

### 7.3 Inline Code Documentation
- [ ] Add PHPDoc comments to all PHP classes
- [ ] Add PHPDoc comments to all PHP methods
- [ ] Add JSDoc comments to wpApi.js methods
- [ ] Add comments to complex logic sections
- [ ] Add TODO comments for future work

---

## Pre-Deployment Phase

### 8.1 Production Build
- [ ] Navigate to react-app directory
- [ ] Run `npm run build`
- [ ] Verify build output exists
- [ ] Check manifest.json is valid JSON
- [ ] Verify no build errors

### 8.2 Code Cleanup
- [ ] Remove all console.log statements
- [ ] Remove all debug code
- [ ] Remove commented-out code
- [ ] Check for hardcoded URLs
- [ ] Verify nonce security implementation
- [ ] Run code linter (if available)

### 8.3 Staging Deployment
- [ ] Create zip file of plugin
- [ ] Upload to staging site
- [ ] Activate plugin on staging
- [ ] Run full functional test suite
- [ ] Check PHP error log
- [ ] Check browser console
- [ ] Document any staging issues

### 8.4 Security Audit
- [ ] Verify all user inputs are sanitized
- [ ] Verify all outputs are escaped
- [ ] Verify nonce checks on all AJAX requests
- [ ] Verify capability checks on all operations
- [ ] Verify SQL injection protection
- [ ] Verify XSS protection
- [ ] Document security checklist results

---

## Deployment Phase

### 9.1 Create Plugin Package
- [ ] Navigate to wp-content/plugins/
- [ ] Run zip command excluding unnecessary files
- [ ] Verify zip file size is reasonable
- [ ] Extract zip to verify contents
- [ ] Test zip installation on clean WordPress

### 9.2 Production Upload
- [ ] Backup production database
- [ ] Backup production files
- [ ] Upload via WordPress admin OR FTP
- [ ] Activate plugin
- [ ] Verify no PHP errors
- [ ] Test basic functionality immediately

### 9.3 Post-Deployment Monitoring
- [ ] Monitor PHP error logs (first hour)
- [ ] Monitor PHP error logs (first 24 hours)
- [ ] Check browser console for JS errors
- [ ] Monitor user feedback/reports
- [ ] Document any production issues
- [ ] Create incident response plan

---

## Future Enhancements (Phase 2)

### 10.1 Custom Post Types
- [ ] Research custom post type support
- [ ] Add post type selector to UI
- [ ] Update API service for CPT
- [ ] Test with common CPTs

### 10.2 Custom Fields
- [ ] Research ACF integration
- [ ] Add custom field column support
- [ ] Test with various field types

### 10.3 UI Improvements
- [ ] Add undo/redo functionality
- [ ] Add keyboard shortcuts
- [ ] Add column visibility toggle
- [ ] Add save custom views feature
- [ ] Add dark mode support

### 10.4 Advanced Features
- [ ] WooCommerce product editing
- [ ] CSV import functionality
- [ ] Formula support
- [ ] Auto-save scheduler
- [ ] Mobile responsive design

---

## Ongoing Maintenance

### 11.1 Regular Updates
- [ ] Monitor WordPress core updates
- [ ] Monitor React updates
- [ ] Monitor AG-Grid updates
- [ ] Monitor Vite updates
- [ ] Update dependencies quarterly

### 11.2 Bug Tracking
- [ ] Set up issue tracking system
- [ ] Document all reported bugs
- [ ] Prioritize bugs by severity
- [ ] Create bug fix timeline
- [ ] Test all bug fixes thoroughly

### 11.3 Feature Requests
- [ ] Create feature request process
- [ ] Document all feature requests
- [ ] Prioritize by user demand
- [ ] Evaluate technical feasibility
- [ ] Create feature roadmap

---

## Success Metrics

### 12.1 MVP Success Criteria
- [ ] Plugin installs without errors
- [ ] Plugin activates without errors
- [ ] Grid displays posts correctly
- [ ] Inline editing saves to database
- [ ] Search returns correct results
- [ ] Pagination works with 100+ posts
- [ ] CSV export downloads successfully
- [ ] Bulk operations work correctly
- [ ] No PHP errors in logs
- [ ] No JS errors in console
- [ ] Load time < 5s for 1000 posts

### 12.2 Production Ready Criteria
- [ ] All MVP criteria met
- [ ] All error handling implemented
- [ ] User-friendly error messages
- [ ] Tested on multiple WP versions
- [ ] Tested on multiple browsers
- [ ] Complete documentation
- [ ] Follows WP coding standards
- [ ] Security audit passed

---

## Quick Reference

### Commands
```bash
# Install dependencies
cd react-app && npm install

# Development mode
npm run dev

# Production build
npm run build

# Create plugin zip
cd wp-content/plugins
zip -r wp-sheet-editor.zip wp-sheet-editor/ -x "*.git*" "*/node_modules/*" "*/react-app/src/*"
```

### Key Files
- Main plugin: `wp-sheet-editor.php`
- Admin class: `includes/class-wse-admin.php`
- React entry: `react-app/src/main.jsx`
- Main component: `react-app/src/components/PostsGrid.jsx`
- API service: `react-app/src/services/wpApi.js`

### Testing URLs
- Admin page: `/wp-admin/admin.php?page=wp-sheet-editor`
- REST API: `/wp-json/wp/v2/posts`
- Batch API: `/wp-json/batch/v1/`

---

**Total Tasks:** 350+  
**Estimated Effort:** 3-6 weeks  
**Current Phase:** Not Started  
**Next Action:** Phase 1.1 - Initial Setup
