#include "plugin_host.h"
#include "plugin_registry.h"
#include <iostream>

namespace trkenv {
namespace core {

PluginHost::PluginHost() 
    : m_initialized(false) {
}

PluginHost::~PluginHost() {
    if (m_initialized) {
        shutdown();
    }
}

bool PluginHost::initialize() {
    if (m_initialized) {
        return true;
    }

    // Initialize plugin registry
    m_registry = std::make_unique<PluginRegistry>();
    if (!m_registry->initialize()) {
        std::cerr << "Failed to initialize plugin registry" << std::endl;
        return false;
    }

    m_initialized = true;
    return true;
}

void PluginHost::shutdown() {
    if (!m_initialized) {
        return;
    }

    // Unload all plugins
    for (auto& [name, plugin] : m_loadedPlugins) {
        plugin->shutdown();
    }
    m_loadedPlugins.clear();

    // Shutdown registry
    if (m_registry) {
        m_registry->shutdown();
        m_registry.reset();
    }

    m_initialized = false;
}

bool PluginHost::loadPlugin(const std::string& pluginPath) {
    // For now, this is a stub implementation
    // In a real implementation, this would load a dynamic library
    std::cout << "Loading plugin from: " << pluginPath << std::endl;
    
    // TODO: Implement dynamic plugin loading
    return false;
}

bool PluginHost::unloadPlugin(const std::string& pluginName) {
    auto it = m_loadedPlugins.find(pluginName);
    if (it != m_loadedPlugins.end()) {
        it->second->shutdown();
        m_loadedPlugins.erase(it);
        return true;
    }
    return false;
}

std::shared_ptr<plugins::PluginInterface> PluginHost::getPlugin(const std::string& name) const {
    auto it = m_loadedPlugins.find(name);
    if (it != m_loadedPlugins.end()) {
        return it->second;
    }
    return nullptr;
}

std::vector<std::string> PluginHost::getLoadedPlugins() const {
    std::vector<std::string> names;
    for (const auto& [name, plugin] : m_loadedPlugins) {
        names.push_back(name);
    }
    return names;
}

PluginRegistry* PluginHost::getRegistry() const {
    return m_registry.get();
}

void PluginHost::scanForPlugins(const std::string& directory) {
    // TODO: Implement plugin scanning in directory
    std::cout << "Scanning for plugins in: " << directory << std::endl;
}

bool PluginHost::validatePlugin(std::shared_ptr<plugins::PluginInterface> plugin) {
    if (!plugin) {
        return false;
    }
    
    // Basic validation
    return !plugin->getName().empty() && 
           !plugin->getVersion().empty() && 
           plugin->isLoaded();
}

} // namespace core
} // namespace trkenv