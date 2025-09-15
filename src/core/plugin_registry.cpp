#include "plugin_registry.h"
#include <algorithm>

namespace trkenv {
namespace core {

PluginRegistry::PluginRegistry() 
    : m_initialized(false) {
}

PluginRegistry::~PluginRegistry() {
    if (m_initialized) {
        shutdown();
    }
}

bool PluginRegistry::initialize() {
    if (m_initialized) {
        return true;
    }

    m_initialized = true;
    return true;
}

void PluginRegistry::shutdown() {
    if (!m_initialized) {
        return;
    }

    m_plugins.clear();
    m_initialized = false;
}

bool PluginRegistry::registerPlugin(const PluginInfo& info) {
    if (!m_initialized || info.name.empty()) {
        return false;
    }

    m_plugins[info.name] = info;
    return true;
}

bool PluginRegistry::unregisterPlugin(const std::string& name) {
    if (!m_initialized) {
        return false;
    }

    auto it = m_plugins.find(name);
    if (it != m_plugins.end()) {
        m_plugins.erase(it);
        return true;
    }
    return false;
}

std::vector<PluginRegistry::PluginInfo> PluginRegistry::getAvailablePlugins() const {
    std::vector<PluginInfo> plugins;
    for (const auto& [name, info] : m_plugins) {
        plugins.push_back(info);
    }
    return plugins;
}

PluginRegistry::PluginInfo PluginRegistry::getPluginInfo(const std::string& name) const {
    auto it = m_plugins.find(name);
    if (it != m_plugins.end()) {
        return it->second;
    }
    return PluginInfo{}; // Return empty info if not found
}

std::vector<std::string> PluginRegistry::getPluginsByCapability(const std::string& capability) const {
    std::vector<std::string> result;
    
    for (const auto& [name, info] : m_plugins) {
        auto& caps = info.capabilities;
        if (std::find(caps.begin(), caps.end(), capability) != caps.end()) {
            result.push_back(name);
        }
    }
    
    return result;
}

bool PluginRegistry::hasPlugin(const std::string& name) const {
    return m_plugins.find(name) != m_plugins.end();
}

} // namespace core
} // namespace trkenv