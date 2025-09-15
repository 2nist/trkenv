#pragma once

#include <memory>
#include <vector>
#include <string>

namespace trkenv {
namespace adapters {

/**
 * AudioAdapter - Adapter for audio processing systems
 * Implements the ports/adapters pattern for audio I/O
 */
class AudioAdapter {
public:
    struct AudioConfig {
        double sampleRate;
        int bufferSize;
        int numInputChannels;
        int numOutputChannels;
    };

    AudioAdapter();
    virtual ~AudioAdapter() = default;

    // Adapter lifecycle
    virtual bool initialize(const AudioConfig& config) = 0;
    virtual void shutdown() = 0;

    // Audio processing
    virtual bool processAudio(const float* input, float* output, int numSamples) = 0;
    
    // Configuration
    virtual AudioConfig getConfig() const = 0;
    virtual bool setConfig(const AudioConfig& config) = 0;
    
    // Status
    virtual bool isInitialized() const = 0;
    virtual std::string getAdapterName() const = 0;

protected:
    AudioConfig m_config;
    bool m_initialized;
};

/**
 * JUCEAudioAdapter - JUCE-based audio adapter implementation
 */
class JUCEAudioAdapter : public AudioAdapter {
public:
    JUCEAudioAdapter();
    ~JUCEAudioAdapter() override;

    // AudioAdapter interface
    bool initialize(const AudioConfig& config) override;
    void shutdown() override;
    bool processAudio(const float* input, float* output, int numSamples) override;
    AudioConfig getConfig() const override;
    bool setConfig(const AudioConfig& config) override;
    bool isInitialized() const override;
    std::string getAdapterName() const override;

private:
    // JUCE-specific implementation details would go here
    // For now, we'll use stubs
};

/**
 * MockAudioAdapter - Mock implementation for testing
 */
class MockAudioAdapter : public AudioAdapter {
public:
    MockAudioAdapter();
    ~MockAudioAdapter() override = default;

    // AudioAdapter interface
    bool initialize(const AudioConfig& config) override;
    void shutdown() override;
    bool processAudio(const float* input, float* output, int numSamples) override;
    AudioConfig getConfig() const override;
    bool setConfig(const AudioConfig& config) override;
    bool isInitialized() const override;
    std::string getAdapterName() const override;
};

} // namespace adapters
} // namespace trkenv