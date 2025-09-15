#pragma once

#include "flow_node.h"
#include <memory>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>

namespace trkenv {
namespace flow {

/**
 * DAGProcessor - Processes directed acyclic graphs of flow nodes
 * Implements topological sorting and parallel execution where possible
 */
class DAGProcessor {
public:
    DAGProcessor();
    ~DAGProcessor();

    // Graph management
    bool addNode(std::shared_ptr<FlowNode> node);
    bool removeNode(const std::string& nodeId);
    bool connectNodes(const std::string& sourceId, const std::string& sourcePort,
                     const std::string& targetId, const std::string& targetPort);
    
    // Graph validation
    bool validateGraph();
    bool hasCycles();
    
    // Execution
    bool executeGraph(const FlowData& initialData, FlowData& finalData);
    std::vector<std::string> getExecutionOrder();
    
    // Graph queries
    std::shared_ptr<FlowNode> getNode(const std::string& nodeId) const;
    std::vector<std::shared_ptr<FlowNode>> getAllNodes() const;
    std::vector<std::string> getNodeDependencies(const std::string& nodeId) const;
    
    // Performance
    void setParallelExecution(bool enabled) { m_parallelExecution = enabled; }
    bool isParallelExecutionEnabled() const { return m_parallelExecution; }

private:
    std::unordered_map<std::string, std::shared_ptr<FlowNode>> m_nodes;
    std::unordered_map<std::string, std::vector<std::string>> m_dependencies; // nodeId -> list of dependency nodeIds
    std::unordered_map<std::string, std::vector<std::string>> m_dependents;   // nodeId -> list of dependent nodeIds
    
    bool m_parallelExecution;
    
    // Internal methods
    bool topologicalSort(std::vector<std::string>& sortedNodes);
    bool detectCycles();
    bool detectCyclesHelper(const std::string& nodeId,
                           std::unordered_set<std::string>& visited,
                           std::unordered_set<std::string>& recursionStack);
    void buildDependencyGraph();
    bool executeNodeBatch(const std::vector<std::shared_ptr<FlowNode>>& nodes, 
                         const FlowData& input, FlowData& output);
};

} // namespace flow
} // namespace trkenv