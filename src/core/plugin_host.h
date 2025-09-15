#pragma once

#include "../plugins/plugin_interface.h"
#include <memory>
#include <vector>
#include <unordered_map>
#include <string>
#include <functional>

namespace trkenv {
namespace core {

class PluginRegistry;

/**
 * Plugin Host - Manages plugin lifecycle and provides plugin services
 * Implements the host side of the plugin architecture
 */
class PluginHost {
public:
    PluginHost();
    ~PluginHost();

    // Initialize the plugin host
    bool initialize();
    
    // Shutdown the plugin host
    void shutdown();
    
    // Plugin management
    bool loadPlugin(const std::string& pluginPath);
    bool unloadPlugin(const std::string& pluginName);
    
    // Plugin access
    std::shared_ptr<plugins::PluginInterface> getPlugin(const std::string& name) const;
    std::vector<std::string> getLoadedPlugins() const;
    
    // Plugin registry
    PluginRegistry* getRegistry() const;
    
    // Plugin discovery
    void scanForPlugins(const std::string& directory);
    
private:
    bool m_initialized;
    std::unique_ptr<PluginRegistry> m_registry;
    std::unordered_map<std::string, std::shared_ptr<plugins::PluginInterface>> m_loadedPlugins;
    
    // Plugin loading helpers
    bool validatePlugin(std::shared_ptr<plugins::PluginInterface> plugin);
};

} // namespace core
} // namespace trkenv