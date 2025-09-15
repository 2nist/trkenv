#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <functional>

namespace trkenv {
namespace flow {

class FlowNode;

/**
 * FlowData - Represents data flowing between nodes
 */
class FlowData {
public:
    FlowData() = default;
    virtual ~FlowData() = default;
    
    // Data access
    template<typename T>
    void setData(const std::string& key, const T& value);
    
    template<typename T>
    T getData(const std::string& key) const;
    
    bool hasData(const std::string& key) const;
    void clearData();

private:
    std::unordered_map<std::string, std::shared_ptr<void>> m_data;
    std::unordered_map<std::string, std::type_info const*> m_types;
};

/**
 * FlowNode - Base class for all nodes in the flow graph
 */
class FlowNode {
public:
    FlowNode(const std::string& id, const std::string& type);
    virtual ~FlowNode() = default;

    // Node identification
    const std::string& getId() const { return m_id; }
    const std::string& getType() const { return m_type; }
    
    // Node processing
    virtual bool process(const FlowData& input, FlowData& output) = 0;
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;
    
    // Node connections
    void addInputConnection(const std::string& inputPort, std::shared_ptr<FlowNode> sourceNode, const std::string& outputPort);
    void addOutputConnection(const std::string& outputPort, std::shared_ptr<FlowNode> targetNode, const std::string& inputPort);
    
    // Port management
    std::vector<std::string> getInputPorts() const;
    std::vector<std::string> getOutputPorts() const;
    
    // Execution state
    bool isReady() const { return m_ready; }
    void setReady(bool ready) { m_ready = ready; }

protected:
    std::string m_id;
    std::string m_type;
    bool m_ready;
    
    std::vector<std::string> m_inputPorts;
    std::vector<std::string> m_outputPorts;
    
    struct Connection {
        std::weak_ptr<FlowNode> node;
        std::string port;
    };
    
    std::unordered_map<std::string, std::vector<Connection>> m_inputConnections;
    std::unordered_map<std::string, std::vector<Connection>> m_outputConnections;
};

/**
 * AudioFlowNode - Specialized node for audio processing
 */
class AudioFlowNode : public FlowNode {
public:
    AudioFlowNode(const std::string& id);
    
    // Audio-specific processing
    virtual bool processAudio(float* input, float* output, int numSamples) = 0;
    virtual void setSampleRate(double sampleRate) = 0;
    virtual void setBufferSize(int bufferSize) = 0;

protected:
    double m_sampleRate;
    int m_bufferSize;
};

/**
 * DataFlowNode - Specialized node for data processing
 */
class DataFlowNode : public FlowNode {
public:
    DataFlowNode(const std::string& id);
    
    // Data-specific processing
    virtual bool processData(const void* input, void* output, size_t size) = 0;
    virtual std::string getInputFormat() const = 0;
    virtual std::string getOutputFormat() const = 0;
};

// Template implementations
template<typename T>
void FlowData::setData(const std::string& key, const T& value) {
    m_data[key] = std::make_shared<T>(value);
    m_types[key] = &typeid(T);
}

template<typename T>
T FlowData::getData(const std::string& key) const {
    auto it = m_data.find(key);
    if (it != m_data.end()) {
        auto typeIt = m_types.find(key);
        if (typeIt != m_types.end() && *typeIt->second == typeid(T)) {
            return *std::static_pointer_cast<T>(it->second);
        }
    }
    return T{};
}

} // namespace flow
} // namespace trkenv