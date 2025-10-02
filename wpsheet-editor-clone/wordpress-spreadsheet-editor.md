# PRP: WordPress Spreadsheet Editor Plugin

## Executive Summary

**Goal:** Build a WordPress plugin that provides a spreadsheet-like interface for bulk editing WordPress posts and pages, replicating 80% of WP Sheet Editor's core functionality.

**Timeline:** 3-6 weeks for MVP  
**Confidence Score:** 7.5/10  
**Stack:** WordPress PHP + React 18 + Vite + AG-Grid Community

---

## Research Summary

### Market Analysis
- **WP Sheet Editor** charges $79-$399 for spreadsheet editing capabilities
- Handles 100,000+ rows with performance optimization
- Real-time database sync without import/export
- Our MVP targets 80% of functionality at $0 cost

### Technology Decisions

**Selected: AG-Grid Community Edition**
- ✅ Free & open-source (MIT license)
- ✅ Best performance (10,000+ rows)
- ✅ Rich features (sorting, filtering, inline editing)
- ✅ Virtual scrolling built-in
- ✅ Excellent React integration

**Rejected Alternatives:**
- Handsontable: Commercial license ($1,000+), better Excel feel
- react-data-grid: Lightweight but fewer features
- jspreadsheet: Performance concerns with large datasets

### Key Resources
- WordPress REST API: https://developer.wordpress.org/rest-api/
- AG-Grid React Docs: https://www.ag-grid.com/react-data-grid/
- Plugin Boilerplate: https://github.com/DevinVinson/WordPress-Plugin-Boilerplate
- Batch API Example: https://wordpress.org/support/topic/bulk-insert-posts-via-rest-api/

---

## Architecture

### Technology Stack
```
Frontend:  React 18 + Vite + AG-Grid Community
Backend:   WordPress PHP Plugin
API:       WordPress REST API (cookie + nonce auth)
Build:     Vite → outputs to plugin admin/js/dist/
```

### Plugin Structure
```
wp-sheet-editor/
├── wp-sheet-editor.php              # Main plugin file
├── includes/
│   ├── class-wse-activator.php      # Activation hooks
│   ├── class-wse-admin.php          # Admin menu & scripts
│   └── class-wse-api.php            # Custom endpoints (optional)
├── admin/
│   ├── css/
│   │   └── wse-admin.css
│   ├── js/
│   │   └── dist/                    # Vite build output
│   │       ├── assets/
│   │       ├── .vite/manifest.json
│   │       └── index-[hash].js
│   └── views/
│       └── admin-display.php         # Container for React app
├── react-app/                        # React source code
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx                 # Entry point
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PostsGrid.jsx       # Main grid component
│   │   │   ├── Toolbar.jsx         # Search/filter controls
│   │   │   └── BulkActions.jsx     # Bulk operations
│   │   └── services/
│   │       └── wpApi.js             # REST API wrapper
│   └── index.html
└── README.md
```

---

## Implementation Plan

### Phase 1: Plugin Setup (Days 1-2)

**Objective:** Create WordPress plugin that loads React app in admin

**Files to Create:**

**1. wp-sheet-editor.php**
```php
<?php
/**
 * Plugin Name: WP Sheet Editor
 * Description: Spreadsheet interface for editing WordPress posts
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: wp-sheet-editor
 */

if (!defined('ABSPATH')) exit;

define('WSE_VERSION', '1.0.0');
define('WSE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WSE_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once WSE_PLUGIN_DIR . 'includes/class-wse-activator.php';
require_once WSE_PLUGIN_DIR . 'includes/class-wse-admin.php';

register_activation_hook(__FILE__, array('WSE_Activator', 'activate'));

if (is_admin()) {
    new WSE_Admin();
}
```

**2. includes/class-wse-activator.php**
```php
<?php
class WSE_Activator {
    public static function activate() {
        // Check WordPress version
        if (version_compare(get_bloginfo('version'), '6.0', '<')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die('This plugin requires WordPress 6.0 or higher.');
        }
        
        // Check if user has required capabilities
        if (!current_user_can('activate_plugins')) {
            return;
        }
        
        flush_rewrite_rules();
    }
}
```

**3. includes/class-wse-admin.php**
```php
<?php
class WSE_Admin {
    
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'Sheet Editor',
            'Sheet Editor',
            'edit_posts',
            'wp-sheet-editor',
            array($this, 'render_admin_page'),
            'dashicons-grid-view',
            30
        );
    }
    
    public function enqueue_scripts($hook) {
        if ('toplevel_page_wp-sheet-editor' !== $hook) {
            return;
        }
        
        $manifest_path = WSE_PLUGIN_DIR . 'admin/js/dist/.vite/manifest.json';
        
        if (!file_exists($manifest_path)) {
            add_action('admin_notices', function() {
                echo '<div class="error"><p>WP Sheet Editor: Build files not found. Run <code>npm run build</code> in react-app directory.</p></div>';
            });
            return;
        }
        
        $manifest = json_decode(file_get_contents($manifest_path), true);
        $main_js = $manifest['src/main.jsx']['file'];
        $main_css = isset($manifest['src/main.jsx']['css'][0]) ? $manifest['src/main.jsx']['css'][0] : null;
        
        wp_enqueue_script(
            'wse-react-app',
            WSE_PLUGIN_URL . 'admin/js/dist/' . $main_js,
            array(),
            WSE_VERSION,
            true
        );
        
        if ($main_css) {
            wp_enqueue_style(
                'wse-react-app',
                WSE_PLUGIN_URL . 'admin/js/dist/' . $main_css,
                array(),
                WSE_VERSION
            );
        }
        
        // Pass config to React app
        wp_localize_script('wse-react-app', 'wseConfig', array(
            'apiUrl' => rest_url('wp/v2/'),
            'nonce' => wp_create_nonce('wp_rest'),
            'currentUser' => wp_get_current_user()->ID,
            'pluginUrl' => WSE_PLUGIN_URL,
            'isAdmin' => current_user_can('manage_options')
        ));
    }
    
    public function render_admin_page() {
        require_once WSE_PLUGIN_DIR . 'admin/views/admin-display.php';
    }
}
```

**4. admin/views/admin-display.php**
```php
<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    <div id="wse-root"></div>
</div>
```

**Validation:**
```bash
# 1. Create plugin directory structure
mkdir -p wp-content/plugins/wp-sheet-editor/{includes,admin/{css,js,views}}

# 2. Copy PHP files to correct locations

# 3. Activate plugin in WordPress admin
# Navigate to Plugins → Installed Plugins → Activate "WP Sheet Editor"

# 4. Check for errors in debug.log
tail -f wp-content/debug.log
```

---

### Phase 2: React App Setup (Days 2-3)

**Objective:** Create React app with Vite that builds to plugin directory

**1. Initialize React App**
```bash
cd wp-sheet-editor
mkdir react-app && cd react-app
npm init -y
```

**2. react-app/package.json**
```json
{
  "name": "wp-sheet-editor-react",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "ag-grid-react": "^32.3.3",
    "ag-grid-community": "^32.3.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.1"
  }
}
```

**3. react-app/vite.config.js**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../admin/js/dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.jsx')
      }
    }
  }
});
```

**4. react-app/src/main.jsx**
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  const rootElement = document.getElementById('wse-root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
```

**5. react-app/src/App.jsx**
```jsx
import React from 'react';
import PostsGrid from './components/PostsGrid';

function App() {
  return (
    <div className="wse-app">
      <h2>WordPress Posts Editor</h2>
      <PostsGrid />
    </div>
  );
}

export default App;
```

**6. react-app/src/App.css**
```css
.wse-app {
  padding: 20px;
}

.wse-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.wse-toolbar input {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.wse-toolbar button {
  padding: 6px 12px;
  background: #2271b1;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.wse-toolbar button:hover {
  background: #135e96;
}

.wse-toolbar button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

**Validation:**
```bash
cd react-app
npm install
npm run build

# Check output
ls -la ../admin/js/dist/
# Should see: .vite/, assets/, index-[hash].js

# Visit WordPress admin: /wp-admin/admin.php?page=wp-sheet-editor
# Should see "WordPress Posts Editor" header
```

---

### Phase 3: WordPress API Service (Days 3-5)

**Objective:** Create robust API wrapper for WordPress REST API

**react-app/src/services/wpApi.js**
```js
class WPApiService {
  constructor() {
    this.config = window.wseConfig || {};
    this.apiUrl = this.config.apiUrl || '/wp-json/wp/v2/';
    this.nonce = this.config.nonce;
  }

  async request(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': this.nonce,
      },
      credentials: 'same-origin',
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const totalPosts = response.headers.get('X-WP-Total');
      const totalPages = response.headers.get('X-WP-TotalPages');
      const data = await response.json();
      
      return {
        data,
        pagination: {
          total: parseInt(totalPosts, 10) || 0,
          totalPages: parseInt(totalPages, 10) || 0,
        }
      };
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getPosts({ page = 1, perPage = 100, search = '', orderby = 'date', order = 'desc' } = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      orderby,
      order,
      ...(search && { search }),
    });

    return this.request(`posts?${params.toString()}`);
  }

  async updatePost(id, data) {
    return this.request(`posts/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async batchUpdatePosts(updates) {
    const chunks = [];
    for (let i = 0; i < updates.length; i += 25) {
      chunks.push(updates.slice(i, i + 25));
    }

    const results = [];
    for (const chunk of chunks) {
      const requests = chunk.map(({ id, data }) => ({
        method: 'POST',
        path: `/wp/v2/posts/${id}`,
        body: data,
      }));

      const batchResult = await fetch('/wp-json/batch/v1/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': this.nonce,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ requests }),
      });

      if (!batchResult.ok) {
        throw new Error(`Batch update failed: ${batchResult.statusText}`);
      }

      const data = await batchResult.json();
      results.push(...data.responses);
    }

    return results;
  }

  async getPages(options = {}) {
    const params = new URLSearchParams({
      page: (options.page || 1).toString(),
      per_page: (options.perPage || 100).toString(),
      orderby: options.orderby || 'date',
      order: options.order || 'desc',
      ...(options.search && { search: options.search }),
    });

    return this.request(`pages?${params.toString()}`);
  }

  async updatePage(id, data) {
    return this.request(`pages/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default new WPApiService();
```

**Validation:**
```js
// Test in browser console after app loads
wpApi.getPosts({ page: 1, perPage: 10 })
  .then(result => console.log('Posts:', result))
  .catch(error => console.error('Error:', error));

wpApi.updatePost(1, { title: 'Test Update' })
  .then(result => console.log('Updated:', result))
  .catch(error => console.error('Error:', error));
```

---

### Phase 4: AG-Grid Integration (Days 5-8)

**Objective:** Create spreadsheet interface with inline editing

**react-app/src/components/PostsGrid.jsx**
```jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import wpApi from '../services/wpApi';

function PostsGrid() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const gridRef = useRef();

  const columnDefs = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      editable: false,
      filter: 'agNumberColumnFilter',
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    {
      field: 'title.rendered',
      headerName: 'Title',
      flex: 2,
      editable: true,
      cellEditor: 'agTextCellEditor',
      valueGetter: params => params.data.title?.rendered || '',
      valueSetter: params => {
        if (!params.data.title) params.data.title = {};
        params.data.title.rendered = params.newValue;
        return true;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['publish', 'draft', 'pending', 'private'],
      },
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 180,
      editable: false,
      valueFormatter: params => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString();
      },
    },
    {
      field: 'author',
      headerName: 'Author ID',
      width: 100,
      editable: false,
    },
    {
      field: 'excerpt.rendered',
      headerName: 'Excerpt',
      flex: 1,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorParams: {
        maxLength: 500,
        rows: 5,
        cols: 50,
      },
      valueGetter: params => {
        const html = params.data.excerpt?.rendered || '';
        return html.replace(/<[^>]*>/g, '').substring(0, 100);
      },
      valueSetter: params => {
        if (!params.data.excerpt) params.data.excerpt = {};
        params.data.excerpt.rendered = params.newValue;
        return true;
      },
    },
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    editable: false,
  };

  useEffect(() => {
    fetchPosts();
  }, [currentPage, searchTerm]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const result = await wpApi.getPosts({
        page: currentPage,
        perPage: 100,
        search: searchTerm,
      });
      
      setRowData(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      alert(`Failed to load posts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onCellValueChanged = useCallback(async (event) => {
    const { data, colDef, oldValue, newValue } = event;
    
    if (oldValue === newValue) return;
    
    try {
      const updateData = {};
      
      if (colDef.field === 'title.rendered') {
        updateData.title = newValue;
      } else if (colDef.field === 'excerpt.rendered') {
        updateData.excerpt = newValue;
      } else if (colDef.field === 'status') {
        updateData.status = newValue;
      }

      await wpApi.updatePost(data.id, updateData);
      console.log(`Post ${data.id} updated successfully`);
      
      // Visual feedback
      event.node.setDataValue(colDef.field, newValue);
      
    } catch (error) {
      console.error('Failed to update post:', error);
      event.node.setDataValue(colDef.field, oldValue);
      alert(`Failed to save: ${error.message}`);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const onExportCSV = () => {
    gridRef.current.api.exportDataAsCsv({
      fileName: `wordpress-posts-${Date.now()}.csv`,
    });
  };

  const handleBulkStatusChange = async (newStatus) => {
    const selectedRows = gridRef.current.api.getSelectedRows();
    if (selectedRows.length === 0) {
      alert('Please select rows first');
      return;
    }

    if (!confirm(`Change status to "${newStatus}" for ${selectedRows.length} posts?`)) {
      return;
    }

    try {
      const updates = selectedRows.map(row => ({
        id: row.id,
        data: { status: newStatus },
      }));

      await wpApi.batchUpdatePosts(updates);
      fetchPosts();
      alert(`Successfully updated ${selectedRows.length} posts`);
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert(`Bulk update failed: ${error.message}`);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Toolbar */}
      <div className="wse-toolbar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        
        <button onClick={fetchPosts} disabled={loading}>
          Refresh
        </button>
        
        <button onClick={onExportCSV}>
          Export CSV
        </button>
        
        <select onChange={(e) => handleBulkStatusChange(e.target.value)} defaultValue="">
          <option value="" disabled>Bulk Actions</option>
          <option value="publish">Set to Publish</option>
          <option value="draft">Set to Draft</option>
          <option value="pending">Set to Pending</option>
          <option value="private">Set to Private</option>
        </select>
        
        <span style={{ marginLeft: 'auto' }}>
          Total: {pagination.total} posts
        </span>
      </div>

      {/* Grid */}
      <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          loading={loading}
          animateRows={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          enableCellTextSelection={true}
        />
      </div>

      {/* Pagination */}
      <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1 || loading}
        >
          ← Previous
        </button>
        <span>
          Page {currentPage} of {pagination.totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
          disabled={currentPage === pagination.totalPages || loading}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default PostsGrid;
```

**Validation:**
```bash
# Build and test
cd react-app
npm run build

# Open WordPress admin → Sheet Editor
# Test:
# 1. Grid loads with posts
# 2. Edit title cell → auto-saves
# 3. Change status → auto-saves
# 4. Search for posts
# 5. Export CSV
# 6. Select multiple rows → bulk status change
# 7. Pagination works
```

---

## Error Handling

### API Error Handling
```js
try {
  await wpApi.updatePost(id, data);
} catch (error) {
  if (error.message.includes('403')) {
    alert('Permission denied. You may not have rights to edit this post.');
  } else if (error.message.includes('404')) {
    alert('Post not found. It may have been deleted.');
  } else if (error.message.includes('nonce')) {
    alert('Session expired. Please refresh the page.');
    window.location.reload();
  } else {
    alert(`Error: ${error.message}`);
  }
}
```

### Nonce Expiration
WordPress nonces expire after 24 hours. Handle gracefully:
```js
if (error.message.includes('nonce') || error.message.includes('401')) {
  alert('Your session has expired. Reloading page...');
  setTimeout(() => window.location.reload(), 1000);
}
```

### Network Errors
```js
async request(endpoint, options) {
  try {
    const response = await fetch(url, options);
    // ... handle response
  } catch (error) {
    if (error.name === 'NetworkError' || !navigator.onLine) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
```

---

## Testing Checklist

### Functional Testing
- [ ] Plugin activates without errors
- [ ] Admin menu appears
- [ ] React app loads
- [ ] Posts display in grid (test with 0, 10, 100, 1000 posts)
- [ ] Inline editing works (title, status, excerpt)
- [ ] Changes save to database (verify in WP admin)
- [ ] Search finds correct posts
- [ ] Pagination works correctly
- [ ] CSV export downloads
- [ ] Bulk status change works
- [ ] Row selection works
- [ ] Column sorting works
- [ ] Column filtering works
- [ ] Column resizing works

### Error Handling Testing
- [ ] Invalid nonce (test with expired session)
- [ ] Network offline (disable network, try to save)
- [ ] Permission errors (test with Editor role)
- [ ] Invalid post ID
- [ ] Duplicate saves (rapid clicking)

### Performance Testing
- [ ] Load time with 100 posts: < 2s
- [ ] Load time with 1000 posts: < 5s
- [ ] Smooth scrolling with 1000 rows
- [ ] Cell edit responsiveness < 100ms
- [ ] Save operation < 500ms

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### WordPress Compatibility
- [ ] WordPress 6.0+
- [ ] PHP 7.4+
- [ ] PHP 8.0+
- [ ] PHP 8.1+
- [ ] Multisite (if applicable)

---

## Deployment Checklist

### Pre-Deployment
1. **Build production assets:**
   ```bash
   cd react-app
   npm run build
   ```

2. **Verify build output:**
   ```bash
   ls -la ../admin/js/dist/
   # Should see manifest.json and hashed assets
   ```

3. **Test on staging site:**
   - Upload plugin to staging
   - Activate and test all features
   - Check PHP error log
   - Check browser console

4. **Code review:**
   - Remove console.log statements
   - Remove debug code
   - Check for hardcoded URLs
   - Verify nonce security

### Deployment
1. **Zip plugin:**
   ```bash
   cd wp-content/plugins
   zip -r wp-sheet-editor.zip wp-sheet-editor/ -x "*.git*" "*/node_modules/*" "*/react-app/src/*"
   ```

2. **Upload to production:**
   - Via WordPress admin: Plugins → Add New → Upload Plugin
   - Or via FTP/SFTP to wp-content/plugins/

3. **Activate and test:**
   - Activate plugin
   - Test basic functionality
   - Monitor error logs

### Post-Deployment
- [ ] Monitor PHP error logs for 24 hours
- [ ] Check browser console for JS errors
- [ ] Gather user feedback
- [ ] Document any issues

---

## Common Issues & Solutions

### Issue 1: React app doesn't load
**Symptoms:** Blank page, no content in #wse-root
**Solutions:**
1. Check if build files exist: `ls admin/js/dist/`
2. Run `npm run build` in react-app directory
3. Check browser console for errors
4. Verify manifest.json exists and is valid JSON

### Issue 2: API returns 401/403 errors
**Symptoms:** "Permission denied" errors, can't save changes
**Solutions:**
1. Verify nonce is being passed: Check Network tab → Headers → X-WP-Nonce
2. Check if user has `edit_posts` capability
3. Verify cookie authentication is working
4. Try refreshing the page to get new nonce

### Issue 3: Nonce expired
**Symptoms:** Saves fail after 24 hours
**Solutions:**
1. Implement auto-refresh logic
2. Show user-friendly message and reload page
3. Consider using Application Passwords for long sessions

### Issue 4: Slow performance with many posts
**Symptoms:** Grid takes > 5s to load, UI feels sluggish
**Solutions:**
1. Reduce `perPage` from 100 to 50
2. Implement server-side filtering
3. Add loading skeleton
4. Enable AG-Grid virtual scrolling (already enabled)

### Issue 5: Batch updates fail
**Symptoms:** Bulk operations error with HTTP 400
**Solutions:**
1. Verify batch size ≤ 25 (WordPress limit)
2. Check request payload format
3. Split into smaller chunks

### Issue 6: CSS conflicts with WordPress admin
**Symptoms:** Broken layout, style issues
**Solutions:**
1. Prefix all custom CSS classes with `wse-`
2. Use scoped styles
3. Test with different WordPress themes

---

## Future Enhancements

### Phase 2 (Weeks 7-12)
- Custom post type support
- Custom field editing (ACF integration)
- Undo/redo functionality
- Keyboard shortcuts (Ctrl+S to save, etc.)
- Column visibility toggle
- Save custom views
- Dark mode support

### Phase 3 (Months 4-6)
- WooCommerce product editing
- Multi-user real-time collaboration
- Import from CSV
- Formula support (calculate columns)
- Scheduled auto-save
- Mobile responsive design
- REST API rate limiting
- Advanced search (date ranges, custom fields)

---

## Documentation

### User Documentation

**README.md:**
```markdown
# WP Sheet Editor

Edit WordPress posts and pages in a spreadsheet interface.

## Features
- ✅ Inline editing with auto-save
- ✅ Search and filter posts
- ✅ Bulk status changes
- ✅ CSV export
- ✅ Fast performance (handles 1000+ posts)

## Installation
1. Upload plugin folder to `/wp-content/plugins/`
2. Activate in WordPress admin
3. Navigate to **Sheet Editor** menu

## Usage
1. **Edit cells:** Click any cell to edit, changes save automatically
2. **Search:** Type in search box and press Enter
3. **Bulk actions:** Select rows → Choose bulk action from dropdown
4. **Export:** Click "Export CSV" to download data
5. **Pagination:** Use Previous/Next buttons for large datasets

## Requirements
- WordPress 6.0+
- PHP 7.4+
- Modern browser (Chrome, Firefox, Safari, Edge)

## Support
For issues, please contact support@example.com
```

### Developer Documentation

**DEVELOPMENT.md:**
```markdown
# Development Guide

## Setup
```bash
# Clone/download plugin
cd wp-content/plugins/wp-sheet-editor/react-app

# Install dependencies
npm install

# Development (with hot reload)
npm run dev

# Production build
npm run build
```

## File Structure
- `wp-sheet-editor.php` - Main plugin file
- `includes/` - PHP classes
- `react-app/src/` - React source code
- `admin/js/dist/` - Built React app (git ignored)

## Making Changes
1. Edit files in `react-app/src/`
2. Run `npm run dev` for live reload
3. Run `npm run build` before committing
4. Test in WordPress admin

## API Service
All WordPress API calls go through `wpApi.js`. Add new methods here.

## Adding Columns
Edit `columnDefs` array in `PostsGrid.jsx`. Follow AG-Grid column definition format.

## Debugging
- PHP errors: Check `wp-content/debug.log`
- JS errors: Check browser console
- API requests: Check Network tab in DevTools
```

---

## Resources

### Essential Reading
1. **WordPress REST API Handbook**
   https://developer.wordpress.org/rest-api/

2. **AG-Grid React Documentation**
   https://www.ag-grid.com/react-data-grid/getting-started/

3. **WordPress Plugin Best Practices**
   https://developer.wordpress.org/plugins/plugin-basics/best-practices/

4. **Vite Documentation**
   https://vitejs.dev/guide/

### Code Examples
1. **React + WordPress REST API Tutorial**
   https://snipcart.com/blog/reactjs-wordpress-rest-api-example

2. **WordPress Batch API Example**
   https://wordpress.org/support/topic/bulk-insert-posts-via-rest-api/

3. **AG-Grid React Examples**
   https://www.ag-grid.com/react-data-grid/getting-started/

### Similar Projects
1. **WP Sheet Editor** (commercial)
   https://wpsheeteditor.com

2. **WordPress Plugin Boilerplate**
   https://github.com/DevinVinson/WordPress-Plugin-Boilerplate

---

## Success Criteria

### MVP Success (Score 8+/10)
- ✅ Plugin installs and activates cleanly
- ✅ Grid displays posts with all columns
- ✅ Inline editing works and saves to database
- ✅ Search finds posts correctly
- ✅ Pagination handles 100+ posts
- ✅ CSV export works
- ✅ Bulk operations work
- ✅ No PHP errors in logs
- ✅ No JS errors in console
- ✅ Performance acceptable (< 5s load for 1000 posts)

### Production Ready (Score 9+/10)
All MVP criteria PLUS:
- ✅ Error handling for all edge cases
- ✅ User-friendly error messages
- ✅ Tested on multiple WordPress versions
- ✅ Tested on multiple browsers
- ✅ Documentation complete
- ✅ Code follows WordPress coding standards
- ✅ Security audit passed

---

## PRP Confidence Score: 7.5/10

### Strengths ✅
- Well-researched tech stack (AG-Grid Community)
- Clear architecture with proven patterns
- Comprehensive code examples
- Detailed implementation steps
- Strong focus on WordPress best practices
- Realistic scope for MVP

### Challenges ⚠️
- First-time WordPress + React integration
- Vite build configuration complexity
- WordPress nonce authentication edge cases
- Performance optimization may need iteration
- AG-Grid learning curve

### Risk Mitigation 🛡️
- Follow WordPress Plugin Boilerplate strictly
- Test each phase thoroughly before proceeding
- Start simple, add complexity incrementally
- Have local WordPress test environment ready
- Budget extra time for debugging (add 20% buffer)

### Estimated Timeline
- **Best Case:** 3 weeks (everything works first try)
- **Realistic:** 4-5 weeks (normal debugging)
- **Worst Case:** 6-8 weeks (major issues, need rewrites)

### Success Probability
- **One-pass implementation:** 75%
- **With 1-2 iterations:** 90%
- **Production-ready:** 95%

---

## Next Actions

### Immediate (Day 1)
1. Set up local WordPress development environment
2. Create plugin folder structure
3. Write main plugin file
4. Test plugin activation

### Short-term (Week 1)
1. Complete Phase 1: Plugin scaffolding
2. Complete Phase 2: React app setup
3. Test React app loads in WordPress admin
4. Begin Phase 3: API integration

### Medium-term (Weeks 2-3)
1. Complete Phase 3: API service
2. Complete Phase 4: AG-Grid integration
3. Test all core features
4. Begin documentation

### Long-term (Weeks 4-6)
1. Polish UI/UX
2. Optimize performance
3. Complete testing checklist
4. Write user documentation
5. Deploy to production

---

**END OF PRP**

**Prepared by:** AI Assistant  
**Date:** October 1, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation

