# trkenv

Microkernel plugin host with a ports &amp; adapters layer and a flow-based DAG executor.

## Architecture

TrkEnv implements a sophisticated audio processing framework with the following key components:

### 🧩 **Microkernel + Plugin Host**
- Minimal core system with maximum extensibility
- Dynamic plugin loading and lifecycle management
- Service registry for dependency injection
- Hot-swappable plugin architecture

### 🔌 **Ports/Adapters Pattern**
- Clean separation between business logic and external systems
- Audio adapters (JUCE-based and mock implementations)
- Data adapters (SQLite, memory, and file system)
- Testable and maintainable architecture

### 🌊 **Flow/DAG Processing**
- Directed Acyclic Graph (DAG) execution engine
- Flow-based programming model
- Parallel and sequential execution support
- Cycle detection and validation

### 🎵 **JUCE Integration**
- Professional audio processing framework
- Cross-platform audio I/O
- MIDI support and audio plugin hosting
- Real-time audio processing capabilities

### ☁️ **Codespaces Ready**
- Pre-configured development environment
- One-click setup with Visual Studio Code
- All dependencies and tools included

### 🗃️ **SQLite Database**
- Persistent storage for plugin metadata
- Flow graph serialization
- Configuration management
- Stubbed implementation for rapid development

## Build Instructions

### Prerequisites
- CMake 3.15 or higher
- C++17 compatible compiler
- pkg-config
- Basic audio libraries (for JUCE support)

### Building on Ubuntu/Debian
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake pkg-config \
    libasound2-dev libfreetype6-dev libx11-dev libxcomposite-dev \
    libxcursor-dev libxinerama-dev libxrandr-dev libxrender-dev \
    libgl1-mesa-dev sqlite3 libsqlite3-dev

# Build the project
mkdir build && cd build
cmake ..
make -j$(nproc)
```

### Running
```bash
# Run the main application
./trkenv

# Run tests
ctest --output-on-failure

# Run individual test suites
./test_microkernel
./test_plugin_host
./test_dag_processor
./test_flow_engine
```

## Development with Codespaces

1. Open this repository in GitHub Codespaces
2. The development environment will be automatically configured
3. Build and run using the commands above

## Components Overview

### Core System (`src/core/`)
- **Microkernel**: Minimal kernel managing plugins and services
- **PluginHost**: Plugin lifecycle and loading management
- **PluginRegistry**: Plugin metadata and capability discovery

### Plugin System (`src/plugins/`)
- **PluginInterface**: Base interfaces for all plugin types
- **AudioPluginInterface**: Audio processing specific interface
- **DataPluginInterface**: Data processing specific interface

### Adapters (`src/adapters/`)
- **AudioAdapter**: Audio I/O abstraction layer
- **DataAdapter**: Data storage abstraction layer
- Multiple implementations (JUCE, SQLite, Memory, File)

### Flow Engine (`src/flow/`)
- **ExecutionEngine**: Main flow execution coordinator
- **DAGProcessor**: Directed acyclic graph processor
- **FlowNode**: Base class for processing nodes
- **FlowData**: Type-safe data container for node communication

### Database Layer (`src/database/`)
- **SQLiteRepository**: Generic repository pattern implementation
- **DatabaseStubs**: Mock database for development and testing

## Example Usage

```cpp
#include "core/microkernel.h"
#include "adapters/audio_adapter.h"

// Initialize the microkernel
auto kernel = std::make_unique<trkenv::core::Microkernel>();
kernel->initialize();

// Set up audio processing
auto audioAdapter = std::make_shared<trkenv::adapters::JUCEAudioAdapter>();
trkenv::adapters::AudioAdapter::AudioConfig config;
config.sampleRate = 44100.0;
config.bufferSize = 512;
audioAdapter->initialize(config);

// Register audio service
kernel->registerService<trkenv::adapters::AudioAdapter>("audio", audioAdapter);

// Create and execute a flow graph
auto engine = kernel->getExecutionEngine();
engine->createGraph("my_graph");
// ... add nodes and connections ...

// Process audio
trkenv::flow::FlowData input, output;
engine->executeGraph("my_graph", input, output);
```

## Testing

The project includes comprehensive unit tests for all major components:

- **Microkernel Tests**: Service registration, plugin host integration
- **Plugin Host Tests**: Plugin loading, registry management
- **DAG Processor Tests**: Graph validation, cycle detection, execution order
- **Flow Engine Tests**: Graph management, async execution, thread safety

## License

This project is open source. See LICENSE file for details.
