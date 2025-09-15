#pragma once

#include <memory>
#include <vector>
#include <string>
#include <unordered_map>
#include <functional>

namespace trkenv {
namespace core {

class PluginInterface;
class PluginHost;

} // namespace core

namespace flow {
class ExecutionEngine;
} // namespace flow

namespace core {

/**
 * Microkernel - Core system that manages plugins and provides minimal functionality
 * Follows microkernel architecture pattern where core is minimal and features are plugins
 */
class Microkernel {
public:
    Microkernel();
    ~Microkernel();

    // Initialize the microkernel
    bool initialize();
    
    // Shutdown the microkernel
    void shutdown();
    
    // Get plugin host
    PluginHost* getPluginHost() const;
    
    // Get execution engine
    flow::ExecutionEngine* getExecutionEngine() const;
    
    // Register a service
    template<typename T>
    void registerService(const std::string& name, std::shared_ptr<T> service);
    
    // Get a service
    template<typename T>
    std::shared_ptr<T> getService(const std::string& name) const;
    
    // Check if running
    bool isRunning() const { return m_running; }

private:
    bool m_running;
    std::unique_ptr<PluginHost> m_pluginHost;
    std::unique_ptr<flow::ExecutionEngine> m_executionEngine;
    std::unordered_map<std::string, std::shared_ptr<void>> m_services;
};

template<typename T>
void Microkernel::registerService(const std::string& name, std::shared_ptr<T> service) {
    m_services[name] = std::static_pointer_cast<void>(service);
}

template<typename T>
std::shared_ptr<T> Microkernel::getService(const std::string& name) const {
    auto it = m_services.find(name);
    if (it != m_services.end()) {
        return std::static_pointer_cast<T>(it->second);
    }
    return nullptr;
}

} // namespace core
} // namespace trkenv