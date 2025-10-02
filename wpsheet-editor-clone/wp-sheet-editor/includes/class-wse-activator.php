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