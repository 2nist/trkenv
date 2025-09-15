#include "core/microkernel.h"
#include "core/plugin_host.h"
#include "flow/execution_engine.h"
#include "adapters/audio_adapter.h"
#include "adapters/data_adapter.h"
#include "database/database_stubs.h"
#include <iostream>
#include <memory>

using namespace trkenv;

/**
 * TrkEnv Main Application
 * Demonstrates the microkernel + plugin host + ports/adapters + flow/DAG + JUCE + SQLite architecture
 */
int main(int argc, char* argv[]) {
    std::cout << "Starting TrkEnv - Microkernel Plugin Host" << std::endl;
    std::cout << "=========================================" << std::endl;

    // Initialize the microkernel
    auto microkernel = std::make_unique<core::Microkernel>();
    if (!microkernel->initialize()) {
        std::cerr << "Failed to initialize microkernel" << std::endl;
        return 1;
    }

    std::cout << "Microkernel initialized successfully" << std::endl;

    // Initialize audio adapter (JUCE-based)
    auto audioAdapter = std::make_shared<adapters::JUCEAudioAdapter>();
    adapters::AudioAdapter::AudioConfig audioConfig;
    audioConfig.sampleRate = 44100.0;
    audioConfig.bufferSize = 512;
    audioConfig.numInputChannels = 2;
    audioConfig.numOutputChannels = 2;

    if (!audioAdapter->initialize(audioConfig)) {
        std::cerr << "Failed to initialize audio adapter" << std::endl;
        return 1;
    }

    std::cout << "Audio adapter initialized: " << audioAdapter->getAdapterName() << std::endl;

    // Initialize data adapter (SQLite-based)
    auto dataAdapter = std::make_shared<adapters::SQLiteDataAdapter>("trkenv.db");
    if (!dataAdapter->initialize()) {
        std::cerr << "Failed to initialize data adapter" << std::endl;
        return 1;
    }

    std::cout << "Data adapter initialized: " << dataAdapter->getAdapterName() << std::endl;

    // Initialize database stubs
    if (!database::DatabaseStubs::initializeSQLite("trkenv.db")) {
        std::cerr << "Failed to initialize database stubs" << std::endl;
        return 1;
    }

    std::cout << "Database stubs initialized" << std::endl;

    // Register services with the microkernel
    microkernel->registerService<adapters::AudioAdapter>("audio_adapter", audioAdapter);
    microkernel->registerService<adapters::DataAdapter>("data_adapter", dataAdapter);

    std::cout << "Services registered with microkernel" << std::endl;

    // Create a simple flow graph
    auto executionEngine = microkernel->getExecutionEngine();
    if (executionEngine) {
        if (executionEngine->createGraph("test_graph")) {
            std::cout << "Created test flow graph" << std::endl;
            
            auto graph = executionEngine->getGraph("test_graph");
            if (graph) {
                std::cout << "Retrieved test graph successfully" << std::endl;
                
                // TODO: Add nodes to the graph and execute
                // This would involve creating flow nodes and connecting them
            }
        }
    }

    // Populate test data
    database::DatabaseStubs::populateTestData();

    // Demonstrate plugin host capabilities
    auto pluginHost = microkernel->getPluginHost();
    if (pluginHost) {
        std::cout << "Plugin host available" << std::endl;
        pluginHost->scanForPlugins("./plugins");
        
        auto loadedPlugins = pluginHost->getLoadedPlugins();
        std::cout << "Loaded plugins: " << loadedPlugins.size() << std::endl;
    }

    // Run main loop (simplified for demonstration)
    std::cout << "\nTrkEnv is running. Press Enter to exit..." << std::endl;
    std::cin.get();

    // Cleanup
    std::cout << "\nShutting down TrkEnv..." << std::endl;

    // Shutdown adapters
    audioAdapter->shutdown();
    dataAdapter->shutdown();

    // Close database
    database::DatabaseStubs::closeSQLite();

    // Shutdown microkernel
    microkernel->shutdown();

    std::cout << "TrkEnv shutdown complete" << std::endl;
    return 0;
}