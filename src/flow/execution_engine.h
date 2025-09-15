#pragma once

#include "dag_processor.h"
#include <memory>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>

namespace trkenv {
namespace flow {

/**
 * ExecutionEngine - Main engine for executing flow graphs
 * Manages multiple DAG processors and provides scheduling
 */
class ExecutionEngine {
public:
    ExecutionEngine();
    ~ExecutionEngine();

    // Engine lifecycle
    bool initialize();
    void shutdown();
    
    // Graph management
    bool createGraph(const std::string& graphId);
    bool removeGraph(const std::string& graphId);
    DAGProcessor* getGraph(const std::string& graphId) const;
    
    // Execution
    bool executeGraph(const std::string& graphId, const FlowData& input, FlowData& output);
    bool executeGraphAsync(const std::string& graphId, const FlowData& input);
    
    // Engine state
    bool isRunning() const { return m_running; }
    void setThreadPoolSize(int size);
    int getThreadPoolSize() const { return m_threadPoolSize; }

private:
    bool m_running;
    int m_threadPoolSize;
    
    std::unordered_map<std::string, std::unique_ptr<DAGProcessor>> m_graphs;
    
    // Thread pool for async execution
    std::vector<std::thread> m_threadPool;
    std::queue<std::function<void()>> m_taskQueue;
    std::mutex m_queueMutex;
    std::condition_variable m_condition;
    bool m_stopThreads;
    
    // Worker thread function
    void workerThread();
    
    // Task management
    void enqueueTask(std::function<void()> task);
};

} // namespace flow
} // namespace trkenv