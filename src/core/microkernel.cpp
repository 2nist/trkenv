#include "microkernel.h"
#include "plugin_host.h"
#include "../flow/execution_engine.h"

namespace trkenv {
namespace core {

Microkernel::Microkernel() 
    : m_running(false) {
}

Microkernel::~Microkernel() {
    if (m_running) {
        shutdown();
    }
}

bool Microkernel::initialize() {
    if (m_running) {
        return true;
    }

    // Initialize plugin host
    m_pluginHost = std::make_unique<PluginHost>();
    if (!m_pluginHost->initialize()) {
        return false;
    }

    // Initialize execution engine
    m_executionEngine = std::make_unique<flow::ExecutionEngine>();
    if (!m_executionEngine->initialize()) {
        return false;
    }

    m_running = true;
    return true;
}

void Microkernel::shutdown() {
    if (!m_running) {
        return;
    }

    // Shutdown execution engine
    if (m_executionEngine) {
        m_executionEngine->shutdown();
        m_executionEngine.reset();
    }

    // Shutdown plugin host
    if (m_pluginHost) {
        m_pluginHost->shutdown();
        m_pluginHost.reset();
    }

    // Clear services
    m_services.clear();

    m_running = false;
}

PluginHost* Microkernel::getPluginHost() const {
    return m_pluginHost.get();
}

flow::ExecutionEngine* Microkernel::getExecutionEngine() const {
    return m_executionEngine.get();
}

} // namespace core
} // namespace trkenv