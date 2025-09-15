#include "execution_engine.h"
#include <iostream>

namespace trkenv {
namespace flow {

ExecutionEngine::ExecutionEngine() 
    : m_running(false), m_threadPoolSize(4), m_stopThreads(false) {
}

ExecutionEngine::~ExecutionEngine() {
    if (m_running) {
        shutdown();
    }
}

bool ExecutionEngine::initialize() {
    if (m_running) {
        return true;
    }

    // Start thread pool
    m_stopThreads = false;
    for (int i = 0; i < m_threadPoolSize; ++i) {
        m_threadPool.emplace_back(&ExecutionEngine::workerThread, this);
    }

    m_running = true;
    return true;
}

void ExecutionEngine::shutdown() {
    if (!m_running) {
        return;
    }

    // Stop thread pool
    {
        std::unique_lock<std::mutex> lock(m_queueMutex);
        m_stopThreads = true;
    }
    m_condition.notify_all();
    
    for (auto& thread : m_threadPool) {
        if (thread.joinable()) {
            thread.join();
        }
    }
    m_threadPool.clear();

    // Clear graphs
    m_graphs.clear();

    m_running = false;
}

bool ExecutionEngine::createGraph(const std::string& graphId) {
    if (m_graphs.find(graphId) != m_graphs.end()) {
        return false; // Graph already exists
    }

    m_graphs[graphId] = std::make_unique<DAGProcessor>();
    return true;
}

bool ExecutionEngine::removeGraph(const std::string& graphId) {
    auto it = m_graphs.find(graphId);
    if (it != m_graphs.end()) {
        m_graphs.erase(it);
        return true;
    }
    return false;
}

DAGProcessor* ExecutionEngine::getGraph(const std::string& graphId) const {
    auto it = m_graphs.find(graphId);
    return (it != m_graphs.end()) ? it->second.get() : nullptr;
}

bool ExecutionEngine::executeGraph(const std::string& graphId, const FlowData& input, FlowData& output) {
    auto graph = getGraph(graphId);
    if (!graph) {
        std::cerr << "Graph not found: " << graphId << std::endl;
        return false;
    }

    return graph->executeGraph(input, output);
}

bool ExecutionEngine::executeGraphAsync(const std::string& graphId, const FlowData& input) {
    auto graph = getGraph(graphId);
    if (!graph) {
        return false;
    }

    // Create a copy of input data for async execution
    FlowData inputCopy = input;
    
    enqueueTask([this, graphId, inputCopy]() {
        FlowData output;
        executeGraph(graphId, inputCopy, output);
        // In a real implementation, we would have callbacks or event handling here
    });

    return true;
}

void ExecutionEngine::setThreadPoolSize(int size) {
    if (size > 0 && size != m_threadPoolSize) {
        m_threadPoolSize = size;
        // In a real implementation, we would resize the thread pool here
    }
}

void ExecutionEngine::workerThread() {
    while (true) {
        std::function<void()> task;
        
        {
            std::unique_lock<std::mutex> lock(m_queueMutex);
            m_condition.wait(lock, [this] { return m_stopThreads || !m_taskQueue.empty(); });
            
            if (m_stopThreads && m_taskQueue.empty()) {
                break;
            }
            
            if (!m_taskQueue.empty()) {
                task = std::move(m_taskQueue.front());
                m_taskQueue.pop();
            }
        }
        
        if (task) {
            try {
                task();
            } catch (const std::exception& e) {
                std::cerr << "Task execution error: " << e.what() << std::endl;
            }
        }
    }
}

void ExecutionEngine::enqueueTask(std::function<void()> task) {
    {
        std::unique_lock<std::mutex> lock(m_queueMutex);
        m_taskQueue.push(std::move(task));
    }
    m_condition.notify_one();
}

} // namespace flow
} // namespace trkenv