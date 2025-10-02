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