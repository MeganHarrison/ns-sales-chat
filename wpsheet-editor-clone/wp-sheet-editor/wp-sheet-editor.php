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