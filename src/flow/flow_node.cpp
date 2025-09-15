#include "flow_node.h"
#include <algorithm>

namespace trkenv {
namespace flow {

// FlowData implementation
bool FlowData::hasData(const std::string& key) const {
    return m_data.find(key) != m_data.end();
}

void FlowData::clearData() {
    m_data.clear();
    m_types.clear();
}

// FlowNode implementation
FlowNode::FlowNode(const std::string& id, const std::string& type)
    : m_id(id), m_type(type), m_ready(false) {
}

void FlowNode::addInputConnection(const std::string& inputPort, std::shared_ptr<FlowNode> sourceNode, const std::string& outputPort) {
    Connection conn;
    conn.node = sourceNode;
    conn.port = outputPort;
    m_inputConnections[inputPort].push_back(conn);
    
    // Add to input ports if not already present
    if (std::find(m_inputPorts.begin(), m_inputPorts.end(), inputPort) == m_inputPorts.end()) {
        m_inputPorts.push_back(inputPort);
    }
}

void FlowNode::addOutputConnection(const std::string& outputPort, std::shared_ptr<FlowNode> targetNode, const std::string& inputPort) {
    Connection conn;
    conn.node = targetNode;
    conn.port = inputPort;
    m_outputConnections[outputPort].push_back(conn);
    
    // Add to output ports if not already present
    if (std::find(m_outputPorts.begin(), m_outputPorts.end(), outputPort) == m_outputPorts.end()) {
        m_outputPorts.push_back(outputPort);
    }
}

std::vector<std::string> FlowNode::getInputPorts() const {
    return m_inputPorts;
}

std::vector<std::string> FlowNode::getOutputPorts() const {
    return m_outputPorts;
}

// AudioFlowNode implementation
AudioFlowNode::AudioFlowNode(const std::string& id)
    : FlowNode(id, "audio"), m_sampleRate(44100.0), m_bufferSize(512) {
}

// DataFlowNode implementation
DataFlowNode::DataFlowNode(const std::string& id)
    : FlowNode(id, "data") {
}

} // namespace flow
} // namespace trkenv