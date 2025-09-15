#pragma once

#include "../plugins/plugin_interface.h"
#include <memory>
#include <vector>
#include <unordered_map>
#include <string>

namespace trkenv {
namespace core {

/**
 * Plugin Registry - Manages plugin metadata and registration
 */
class PluginRegistry {
public:
    struct PluginInfo {
        std::string name;
        std::string version;
        std::string description;
        std::string path;
        std::vector<std::string> capabilities;
        bool loaded;
    };

    PluginRegistry();
    ~PluginRegistry();

    // Initialize the registry
    bool initialize();
    
    // Shutdown the registry
    void shutdown();
    
    // Plugin registration
    bool registerPlugin(const PluginInfo& info);
    bool unregisterPlugin(const std::string& name);
    
    // Plugin discovery
    std::vector<PluginInfo> getAvailablePlugins() const;
    PluginInfo getPluginInfo(const std::string& name) const;
    
    // Plugin queries
    std::vector<std::string> getPluginsByCapability(const std::string& capability) const;
    bool hasPlugin(const std::string& name) const;

private:
    bool m_initialized;
    std::unordered_map<std::string, PluginInfo> m_plugins;
};

} // namespace core
} // namespace trkenv