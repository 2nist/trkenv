#include "dag_processor.h"
#include <iostream>
#include <algorithm>
#include <stack>

namespace trkenv {
namespace flow {

DAGProcessor::DAGProcessor() 
    : m_parallelExecution(false) {
}

DAGProcessor::~DAGProcessor() {
}

bool DAGProcessor::addNode(std::shared_ptr<FlowNode> node) {
    if (!node || node->getId().empty()) {
        return false;
    }

    if (m_nodes.find(node->getId()) != m_nodes.end()) {
        return false; // Node already exists
    }

    m_nodes[node->getId()] = node;
    return true;
}

bool DAGProcessor::removeNode(const std::string& nodeId) {
    auto it = m_nodes.find(nodeId);
    if (it == m_nodes.end()) {
        return false;
    }

    // Remove from dependency graph
    m_dependencies.erase(nodeId);
    m_dependents.erase(nodeId);
    
    // Remove this node from other nodes' dependencies/dependents
    for (auto& [id, deps] : m_dependencies) {
        deps.erase(std::remove(deps.begin(), deps.end(), nodeId), deps.end());
    }
    for (auto& [id, deps] : m_dependents) {
        deps.erase(std::remove(deps.begin(), deps.end(), nodeId), deps.end());
    }

    m_nodes.erase(it);
    return true;
}

bool DAGProcessor::connectNodes(const std::string& sourceId, const std::string& sourcePort,
                               const std::string& targetId, const std::string& targetPort) {
    auto sourceNode = getNode(sourceId);
    auto targetNode = getNode(targetId);
    
    if (!sourceNode || !targetNode) {
        return false;
    }

    // Add connection
    targetNode->addInputConnection(targetPort, sourceNode, sourcePort);
    sourceNode->addOutputConnection(sourcePort, targetNode, targetPort);
    
    // Update dependency graph
    m_dependencies[targetId].push_back(sourceId);
    m_dependents[sourceId].push_back(targetId);
    
    return true;
}

bool DAGProcessor::validateGraph() {
    buildDependencyGraph();
    return !hasCycles();
}

bool DAGProcessor::hasCycles() {
    return detectCycles();
}

bool DAGProcessor::executeGraph(const FlowData& initialData, FlowData& finalData) {
    if (!validateGraph()) {
        std::cerr << "Graph validation failed - cannot execute" << std::endl;
        return false;
    }

    std::vector<std::string> executionOrder;
    if (!topologicalSort(executionOrder)) {
        std::cerr << "Failed to determine execution order" << std::endl;
        return false;
    }

    FlowData currentData = initialData;
    
    for (const std::string& nodeId : executionOrder) {
        auto node = getNode(nodeId);
        if (!node) {
            continue;
        }

        FlowData nodeOutput;
        if (!node->process(currentData, nodeOutput)) {
            std::cerr << "Node " << nodeId << " failed to process" << std::endl;
            return false;
        }
        
        // Merge output back into current data
        // In a real implementation, this would be more sophisticated
        currentData = nodeOutput;
    }

    finalData = currentData;
    return true;
}

std::vector<std::string> DAGProcessor::getExecutionOrder() {
    std::vector<std::string> order;
    topologicalSort(order);
    return order;
}

std::shared_ptr<FlowNode> DAGProcessor::getNode(const std::string& nodeId) const {
    auto it = m_nodes.find(nodeId);
    return (it != m_nodes.end()) ? it->second : nullptr;
}

std::vector<std::shared_ptr<FlowNode>> DAGProcessor::getAllNodes() const {
    std::vector<std::shared_ptr<FlowNode>> nodes;
    for (const auto& [id, node] : m_nodes) {
        nodes.push_back(node);
    }
    return nodes;
}

std::vector<std::string> DAGProcessor::getNodeDependencies(const std::string& nodeId) const {
    auto it = m_dependencies.find(nodeId);
    return (it != m_dependencies.end()) ? it->second : std::vector<std::string>{};
}

bool DAGProcessor::topologicalSort(std::vector<std::string>& sortedNodes) {
    std::unordered_map<std::string, int> inDegree;
    
    // Initialize in-degree count
    for (const auto& [nodeId, node] : m_nodes) {
        inDegree[nodeId] = 0;
    }
    
    // Calculate in-degrees
    for (const auto& [nodeId, deps] : m_dependencies) {
        inDegree[nodeId] = deps.size();
    }
    
    // Queue nodes with no dependencies
    std::queue<std::string> queue;
    for (const auto& [nodeId, degree] : inDegree) {
        if (degree == 0) {
            queue.push(nodeId);
        }
    }
    
    sortedNodes.clear();
    
    while (!queue.empty()) {
        std::string current = queue.front();
        queue.pop();
        sortedNodes.push_back(current);
        
        // Process dependents
        auto depIt = m_dependents.find(current);
        if (depIt != m_dependents.end()) {
            for (const std::string& dependent : depIt->second) {
                inDegree[dependent]--;
                if (inDegree[dependent] == 0) {
                    queue.push(dependent);
                }
            }
        }
    }
    
    return sortedNodes.size() == m_nodes.size();
}

bool DAGProcessor::detectCycles() {
    std::unordered_set<std::string> visited;
    std::unordered_set<std::string> recursionStack;
    
    for (const auto& [nodeId, node] : m_nodes) {
        if (visited.find(nodeId) == visited.end()) {
            if (detectCyclesHelper(nodeId, visited, recursionStack)) {
                return true;
            }
        }
    }
    
    return false;
}

bool DAGProcessor::detectCyclesHelper(const std::string& nodeId,
                                     std::unordered_set<std::string>& visited,
                                     std::unordered_set<std::string>& recursionStack) {
    visited.insert(nodeId);
    recursionStack.insert(nodeId);
    
    auto depIt = m_dependents.find(nodeId);
    if (depIt != m_dependents.end()) {
        for (const std::string& dependent : depIt->second) {
            if (recursionStack.find(dependent) != recursionStack.end()) {
                return true; // Back edge found - cycle detected
            }
            
            if (visited.find(dependent) == visited.end() &&
                detectCyclesHelper(dependent, visited, recursionStack)) {
                return true;
            }
        }
    }
    
    recursionStack.erase(nodeId);
    return false;
}

void DAGProcessor::buildDependencyGraph() {
    // Dependencies are built incrementally as connections are made
    // This method could rebuild from node connections if needed
}

bool DAGProcessor::executeNodeBatch(const std::vector<std::shared_ptr<FlowNode>>& nodes,
                                   const FlowData& input, FlowData& output) {
    // Simple sequential execution for now
    // In a real implementation, this would support parallel execution
    FlowData currentData = input;
    
    for (auto node : nodes) {
        FlowData nodeOutput;
        if (!node->process(currentData, nodeOutput)) {
            return false;
        }
        currentData = nodeOutput;
    }
    
    output = currentData;
    return true;
}

} // namespace flow
} // namespace trkenv